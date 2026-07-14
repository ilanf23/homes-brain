/* Deciding whether a spoken job belongs to a customer already on file.

   Pure and free of React/Supabase on purpose: this is the rule that decides
   whether a pro ends up with one Bob or three, so it should be readable and
   checkable on its own. The log-a-job voice flow is its only caller. */
import { normalizeAddress } from "@/lib/hb";

/* The fields the match rules read. Structural, so the caller's richer customer
   row satisfies it without a cast. */
export type MatchableCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  homes: { address: string } | null;
};

export type VoiceCustomerExtract = {
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
};

export type VoiceMatch<T> =
  | { kind: "linked"; customer: T }
  | { kind: "ambiguous"; candidates: T[] }
  | { kind: "new" };

/* Compare on the last 10 digits: pros say numbers with and without country and
   area codes, and the same person is on file either way. */
export function normalizedPhone(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? digits.slice(-10) : "";
}

/* Names are spoken, so they arrive with inconsistent case and spacing: "BOB",
   "Bob" and "bob " are all the same person to the pro who just said it. */
export function normalizedName(value?: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

/* Plain Levenshtein. The strings here are names, so n is tiny. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/* How a name token sounds, roughly: hard c/q become k, ph becomes f, silent
   h and interior vowels drop. Built for transcription confusions ("Kristen"
   heard as "Christian", "Jon" as "John"), not linguistic accuracy. */
function phoneticKey(token: string): string {
  let s = token.toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return "";
  s = s
    .replace(/^kn/, "n")
    .replace(/^wr/, "r")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/sh/g, "x")
    .replace(/ch/g, "k")
    .replace(/c/g, "k")
    .replace(/q/g, "k")
    .replace(/z/g, "s")
    .replace(/y/g, "i");
  const rest = s.slice(1).replace(/[aeiouh]/g, "");
  return (s[0] + rest).replace(/(.)\1+/g, "$1");
}

/* 0..1. Phonetic equality only counts when the spellings are also in the same
   neighborhood, so "Jane" does not read as "John" just because both flatten
   to jn. */
function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const literal = 1 - editDistance(a, b) / Math.max(a.length, b.length);
  if (phoneticKey(a) === phoneticKey(b) && literal >= 0.45) {
    return Math.max(0.92, literal);
  }
  return literal;
}

/* How likely two names are the same spoken person, 0..1. Exact is 1; a name
   that is a subset of the other ("Bob" vs "Bob Smith") or sounds like it
   scores 0.88; otherwise the best of whole-string and first+last-token
   similarity. */
export function nameCloseness(spoken: string, onFile: string): number {
  const a = normalizedName(spoken);
  const b = normalizedName(onFile);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const at = a.split(" ");
  const bt = b.split(" ");
  const [shorter, longer] = at.length <= bt.length ? [at, bt] : [bt, at];
  if (shorter.every((tok) => longer.some((l) => tokenSimilarity(tok, l) >= 0.92))) return 0.88;
  /* Whole-string stays literal: with vowels dropped, "Jane Smith" and
     "John Smith" would flatten to the same key, and those are two people. */
  const aFlat = a.replace(/ /g, "");
  const bFlat = b.replace(/ /g, "");
  const whole = 1 - editDistance(aFlat, bFlat) / Math.max(aFlat.length, bFlat.length);
  const first = tokenSimilarity(at[0], bt[0]);
  const last =
    at.length > 1 && bt.length > 1 ? tokenSimilarity(at[at.length - 1], bt[bt.length - 1]) : first;
  return Math.max(whole, (first + last) / 2);
}

/* Suggestions only: a close name is never linked without the pro's tap.
   Above this, a misheard transcription is more likely than a coincidence. */
export const CLOSE_NAME_THRESHOLD = 0.7;

/* Customers whose names are close enough to the spoken one to ask "did you
   mean...?", best first. Exact matches are included so the caller can offer a
   re-link even when the pro accidentally started a new customer. */
export function suggestCloseCustomers<T extends MatchableCustomer>(
  existing: T[],
  spokenName: string,
  limit = 3,
): { customer: T; score: number }[] {
  return existing
    .map((customer) => ({ customer, score: nameCloseness(spokenName, customer.name) }))
    .filter((s) => s.score >= CLOSE_NAME_THRESHOLD)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

/* `linked` when the note points at exactly one customer, `ambiguous` when
   several share the spoken name (the pro picks: guessing between two real
   people would file the job under the wrong person's home), `new` when nobody
   matches.

   Known limitation: matching is exact on the normalized name, so "Bob" and
   "Bob Smith" are still two people. */
export function matchVoiceCustomer<T extends MatchableCustomer>(
  existing: T[],
  extract: VoiceCustomerExtract,
): VoiceMatch<T> {
  const email = extract.customer_email?.trim().toLowerCase() ?? "";
  const phone = normalizedPhone(extract.customer_phone);
  const name = normalizedName(extract.customer_name);
  const address = extract.address ? normalizeAddress(extract.address) : "";

  // A phone or email identifies a person outright.
  const contactMatches = existing.filter((customer) => {
    const emailMatches = email && customer.email?.trim().toLowerCase() === email;
    const phoneMatches = phone && normalizedPhone(customer.phone) === phone;
    return emailMatches || phoneMatches;
  });
  if (contactMatches.length === 1) return { kind: "linked", customer: contactMatches[0] };

  if (!name) return { kind: "new" };

  const sameName = existing.filter((customer) => normalizedName(customer.name) === name);
  if (sameName.length === 0) return { kind: "new" };
  // The name was said before and only one person answers to it: that is them.
  if (sameName.length === 1) return { kind: "linked", customer: sameName[0] };

  // Several share the name. An exact address hit settles it; otherwise ask.
  const atSameAddress = address
    ? sameName.filter(
        (customer) =>
          !!customer.homes?.address && normalizeAddress(customer.homes.address) === address,
      )
    : [];
  if (atSameAddress.length === 1) return { kind: "linked", customer: atSameAddress[0] };

  return { kind: "ambiguous", candidates: sameName };
}
