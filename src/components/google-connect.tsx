import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Btn, Field, Input, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleUrl, logEvent, normalizeGoogleUrl } from "@/lib/hb";
import { ShieldCheck } from "@/components/svg";
import type { ProRow } from "@/components/pro-shell";

/* Paste-your-Google-link connect flow, shared by /pro/reviews and /pro/settings.
   Stores the normalized URL in pros.google_place_id and the manually entered
   rating in pros.google_rating (see the 2026-07-06 design spec). */
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
  const [link, setLink] = useState("");
  const [rating, setRating] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openForm() {
    setLink(isGoogleUrl(pro.google_place_id) ? pro.google_place_id : "");
    setRating(pro.google_rating != null ? String(pro.google_rating) : "");
    setErr(null);
    setEditing(true);
  }

  async function save() {
    setErr(null);
    const url = normalizeGoogleUrl(link);
    if (!url) {
      setErr(
        "That doesn't look like a Google link. Paste your business's link from Google Maps (open your listing, tap Share, copy the link).",
      );
      return;
    }
    let ratingValue: number | null = null;
    if (rating.trim()) {
      const n = Number(rating.trim());
      if (!Number.isFinite(n) || n < 0 || n > 5) {
        setErr("Rating should be a number between 0 and 5, like 4.8.");
        return;
      }
      ratingValue = Math.round(n * 10) / 10;
    }
    setBusy(true);
    const patch = { google_place_id: url, google_rating: ratingValue };
    /* .select("id") so an RLS-filtered update (0 rows) fails loudly instead of
       reporting success - same guard as the settings page saves. */
    const { data, error } = await supabase.from("pros").update(patch).eq("id", proId).select("id");
    if (error || !data?.length) {
      setErr(error?.message ?? "Couldn't save. Try again.");
    } else {
      onUpdated(patch);
      setEditing(false);
      onToast?.(connected ? "Google connection updated" : "Google connected");
      logEvent(`pro:${proId}`, "google_connected", { url, rating: ratingValue });
    }
    setBusy(false);
  }

  async function disconnect() {
    setBusy(true);
    setErr(null);
    const patch = { google_place_id: null, google_rating: null };
    const { data, error } = await supabase.from("pros").update(patch).eq("id", proId).select("id");
    if (error || !data?.length) {
      setErr(error?.message ?? "Couldn't save. Try again.");
    } else {
      onUpdated(patch);
      setEditing(false);
      onToast?.("Google disconnected");
      logEvent(`pro:${proId}`, "google_disconnected");
    }
    setBusy(false);
  }

  if (connected && !editing) {
    return (
      <div className="mt-3">
        <div className="rounded-xl border border-indigo/30 bg-indigobg/50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck size={22} className="text-indigo shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-ink">Connected</div>
              <div className="text-xs text-muted tnum">
                {pro.google_rating != null ? `Rating ${pro.google_rating} ★` : "No rating entered"}
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
            onClick={openForm}
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
        label="Your Google link"
        hint="In Google Maps, open your business, tap Share, and copy the link."
      >
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          inputMode="url"
          autoComplete="off"
        />
      </Field>
      <Field
        label="Current Google rating (optional)"
        hint="We show it on your records until ratings sync automatically."
      >
        <Input
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          placeholder="4.8"
          inputMode="decimal"
        />
      </Field>
      {err && (
        <div role="alert" className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2">
          {err}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Btn variant="indigo" className="flex-1" loading={busy} onClick={save}>
          {connected ? "Save changes" : "Connect Google"}
        </Btn>
        {editing && (
          <Btn variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </Btn>
        )}
      </div>
    </div>
  );
}
