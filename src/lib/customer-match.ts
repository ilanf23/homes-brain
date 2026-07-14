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
