import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Btn, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleUrl, logEvent, normalizeGoogleUrl } from "@/lib/hb";
import { findBusiness, type BusinessCandidate } from "@/lib/geo";
import { ShieldCheck } from "@/components/svg";
import type { ProRow } from "@/components/pro-shell";

/* Search-first Google connect flow, shared by /pro/setup, /pro/reviews and
   /pro/settings. Auto-matches the pro's Google Business listing from their
   business name + service area (geo edge fn `findBusiness` op). Confirming a
   match stores the listing's Google Maps URL in pros.google_place_id and the
   live Google rating in pros.google_rating. Paste-a-link remains as the
   fallback and stores no rating (we only show ratings that came from Google). */
export function GoogleConnect({
  proId,
  pro,
  onUpdated,
  onToast,
}: {
  proId: string;
  pro: ProRow;
  onUpdated: (patch: Partial<ProRow>) => void;
  onToast?: (msg: string) => void;
}) {
  const connected = !!pro.google_place_id;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<BusinessCandidate[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showPaste, setShowPaste] = useState(false);
  const [link, setLink] = useState("");

  /* Which listing was confirmed, session-only: there is no DB column for the
     listing name/address, so this only shows right after confirming. */
  const [confirmedListing, setConfirmedListing] = useState<{
    name: string;
    address: string | null;
  } | null>(null);

  const showSearch = !connected || editing;

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setSearching(true);
    setErr(null);
    const results = await findBusiness(trimmed, pro.service_area);
    setCandidates(results);
    setSearched(true);
    setSearching(false);
  }

  /* Auto-search once per open of the search UI, seeded from the business name
     the pro already entered. */
  const autoRan = useRef(false);
  useEffect(() => {
    if (!showSearch || autoRan.current) return;
    autoRan.current = true;
    const initial = (pro.business ?? "").trim();
    setQuery(initial);
    if (initial.length >= 2) {
      void runSearch(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearch]);

  async function saveConnection(args: {
    url: string;
    rating: number | null;
    method: "matched" | "pasted";
    placeId?: string;
  }): Promise<boolean> {
    setBusy(true);
    setErr(null);
    const patch = { google_place_id: args.url, google_rating: args.rating };
    /* .select("id") so an RLS-filtered update (0 rows) fails loudly instead of
       reporting success - same guard as the settings page saves. */
    const { data, error } = await supabase.from("pros").update(patch).eq("id", proId).select("id");
    setBusy(false);
    setSavingId(null);
    if (error || !data?.length) {
      setErr(error?.message ?? "Couldn't save. Try again.");
      return false;
    }
    onUpdated(patch);
    setEditing(false);
    setShowPaste(false);
    onToast?.(connected ? "Google connection updated" : "Google connected");
    logEvent(`pro:${proId}`, "google_connected", {
      url: args.url,
      rating: args.rating,
      method: args.method,
      place_id: args.placeId ?? null,
    });
    return true;
  }

  async function confirmCandidate(c: BusinessCandidate) {
    setSavingId(c.placeId);
    const rating = c.rating != null ? Math.round(c.rating * 10) / 10 : null;
    const ok = await saveConnection({
      url: c.mapsUrl,
      rating,
      method: "matched",
      placeId: c.placeId,
    });
    if (ok) setConfirmedListing({ name: c.name, address: c.address });
  }

  async function savePasted() {
    const url = normalizeGoogleUrl(link);
    if (!url) {
      setErr(
        "That doesn't look like a Google link. Paste your business's link from Google Maps (open your listing, tap Share, copy the link).",
      );
      return;
    }
    const ok = await saveConnection({ url, rating: null, method: "pasted" });
    if (ok) setConfirmedListing(null);
  }

  async function disconnect() {
    setBusy(true);
    setErr(null);
    const patch = { google_place_id: null, google_rating: null };
    const { data, error } = await supabase.from("pros").update(patch).eq("id", proId).select("id");
    setBusy(false);
    if (error || !data?.length) {
      setErr(error?.message ?? "Couldn't save. Try again.");
      return;
    }
    onUpdated(patch);
    setEditing(false);
    setConfirmedListing(null);
    setShowPaste(false);
    setLink("");
    setCandidates([]);
    setSearched(false);
    autoRan.current = false;
    onToast?.("Google disconnected");
    logEvent(`pro:${proId}`, "google_disconnected");
  }

  if (connected && !editing) {
    return (
      <div className="mt-3">
        <div className="rounded-xl border border-indigo/30 bg-indigobg/50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck size={22} className="text-indigo shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-ink truncate">
                {confirmedListing ? confirmedListing.name : "Connected"}
              </div>
              {confirmedListing?.address && (
                <div className="text-xs text-muted truncate">{confirmedListing.address}</div>
              )}
              <div className="text-xs text-muted tnum">
                {pro.google_rating != null
                  ? `Rating ${pro.google_rating} ★ from Google`
                  : "No rating on file"}
              </div>
            </div>
          </div>
          <Pill accent="indigo">Live</Pill>
        </div>
        {isGoogleUrl(pro.google_place_id) && (
          <a
            href={pro.google_place_id}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo hover:underline"
          >
            View your Google page <ExternalLink size={12} />
          </a>
        )}
        {err && (
          <div
            role="alert"
            className="anim-fade-in mt-3 text-sm text-red bg-redbg rounded-xl px-3 py-2"
          >
            {err}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={() => {
              setErr(null);
              setEditing(true);
            }}
            disabled={busy}
            className="text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            Edit
          </button>
          <button
            onClick={disconnect}
            disabled={busy}
            className="text-xs font-semibold text-muted hover:text-red transition-colors"
          >
            {busy ? "Working…" : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {!connected && (
        <p className="text-sm text-muted">
          Route review asks to your Google profile and show your rating on every record.
        </p>
      )}

      <Field
        label="Find your business on Google"
        hint="We search Google with your business name and service area."
      >
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Aqua Works"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !searching && !busy) void runSearch(query);
            }}
          />
          <Btn
            variant="indigo"
            loading={searching}
            disabled={query.trim().length < 2 || busy}
            onClick={() => void runSearch(query)}
          >
            Search
          </Btn>
        </div>
      </Field>

      {searching && <div className="text-sm text-muted">Searching Google…</div>}

      {!searching && candidates.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Is this your business?
          </div>
          {candidates.map((c) => (
            <div
              key={c.placeId}
              className="rounded-xl border border-line bg-white p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{c.name}</div>
                {c.address && <div className="text-xs text-muted truncate">{c.address}</div>}
                <div className="mt-1 text-xs text-muted tnum">
                  {c.rating != null
                    ? `${c.rating.toFixed(1)} ★${
                        c.ratingCount != null
                          ? ` (${c.ratingCount} review${c.ratingCount === 1 ? "" : "s"})`
                          : ""
                      }`
                    : "No rating yet"}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <Btn
                  variant="indigo"
                  loading={savingId === c.placeId}
                  disabled={busy}
                  onClick={() => void confirmCandidate(c)}
                >
                  This is me
                </Btn>
                <a
                  href={c.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:underline"
                >
                  View on Google <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && searched && candidates.length === 0 && (
        <div className="text-sm text-muted">
          No matches found. Try a different spelling, or paste your Google link below.
        </div>
      )}

      {!showPaste ? (
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setShowPaste(true);
          }}
          className="text-xs font-semibold text-indigo hover:underline"
        >
          Can&apos;t find it? Paste your Google link
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-soft p-4">
          <Field
            label="Your Google link"
            hint="In Google Maps, open your business, tap Share, and copy the link. Your rating won't show until the listing is matched on Google."
          >
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://maps.app.goo.gl/…"
              inputMode="url"
              autoComplete="off"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Btn
              variant="indigo"
              className="flex-1"
              loading={busy && savingId === null}
              disabled={busy}
              onClick={savePasted}
            >
              Connect with this link
            </Btn>
            <Btn variant="ghost" onClick={() => setShowPaste(false)} disabled={busy}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {err && (
        <div role="alert" className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2">
          {err}
        </div>
      )}

      {editing && (
        <Btn variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Btn>
      )}
    </div>
  );
}
