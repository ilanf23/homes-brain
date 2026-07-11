import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Btn, Card, PageLoader } from "@/lib/ui";

// Keep in sync with supabase/functions/_shared/email-compliance.ts.
export const POSTAL_ADDRESS =
  "HomesBrain — Story Equity Inc., [STREET ADDRESS], [CITY, STATE ZIP]";

const CONTACT_EMAIL = "ilan@maverich.ai";

const search = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Manage email preferences — HomesBrain" },
      { name: "description", content: "Unsubscribe or resubscribe from HomesBrain marketing emails." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const FN_URL = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/email-unsubscribe` : "";

type Status = "loading" | "ready" | "invalid" | "unsubscribed" | "resubscribed" | "error";

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<Status>("loading");
  const [masked, setMasked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {},
        });
        const j = await res.json();
        if (j?.ok && typeof j.masked_email === "string") {
          setMasked(j.masked_email);
          setStatus("ready");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    })();
  }, [token]);

  async function act(action: "unsubscribe" | "resubscribe") {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {}),
        },
        body: JSON.stringify({ token, action, source: "unsubscribe_page" }),
      });
      const j = await res.json();
      if (j?.ok) setStatus(action === "unsubscribe" ? "unsubscribed" : "resubscribed");
      else setStatus("error");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <PageLoader />;

  return (
    <main className="min-h-[100dvh] bg-[var(--soft)] flex items-start justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-xl font-extrabold tracking-tight text-[var(--ink)]">HomesBrain</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Email preferences
          </div>
        </div>

        <Card>
          {status === "invalid" && (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                This link is no longer valid
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
                The unsubscribe link may have expired or been changed. If you keep
                receiving unwanted emails, email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=unsubscribe`}
                  className="font-semibold text-[var(--indigo)] underline underline-offset-2"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                and we'll remove you manually.
              </p>
            </>
          )}

          {status === "ready" && (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                Manage your email preferences
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink)]">
                You're managing preferences for <strong>{masked}</strong>.
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                Unsubscribing stops all marketing and notification emails from
                HomesBrain. Login and account emails will still be delivered so you
                can access your record.
              </p>
              <div className="mt-5">
                <Btn variant="indigo" onClick={() => act("unsubscribe")} disabled={busy}>
                  {busy ? "Working…" : "Unsubscribe"}
                </Btn>
              </div>
            </>
          )}

          {status === "unsubscribed" && (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                You've been unsubscribed
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
                You won't receive marketing emails from HomesBrain{masked ? ` at ${masked}` : ""}.
                Changed your mind?
              </p>
              <button
                type="button"
                onClick={() => act("resubscribe")}
                disabled={busy}
                className="mt-4 text-[14px] font-semibold text-[var(--indigo)] underline underline-offset-2"
              >
                {busy ? "Working…" : "Resubscribe"}
              </button>
            </>
          )}

          {status === "resubscribed" && (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                You're resubscribed
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
                We'll resume sending HomesBrain emails{masked ? ` to ${masked}` : ""}.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                Something went wrong
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
                Please try again in a moment.
              </p>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-[var(--muted)]">
          HomesBrain<br />
          {POSTAL_ADDRESS}
        </p>
      </div>
    </main>
  );
}
