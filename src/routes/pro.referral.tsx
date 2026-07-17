import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Btn, Card, Eyebrow, Input, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/referral")({
  head: () => ({ meta: [{ title: "Referral - HomesBrain" }] }),
  component: Referral,
});

const STEPS = [
  {
    title: "Share your link",
    body: "Send it to a pro you'd trust in someone's home (another trade, not your competition).",
  },
  {
    title: "They start free",
    body: "No card, 60 seconds. Your link tags them as yours.",
  },
  {
    title: "They log a verified first job",
    body: "A real job, sent to a real homeowner. That's what triggers the reward. Signups alone don't count.",
  },
  {
    title: "You both get paid",
    body: "Reward on both sides once the first job verifies. They get a little more than you. It helps them say yes.",
  },
];

type Referred = { proId: string; business: string; signedUpAt: string; hasFirstJob: boolean };

function Referral() {
  const { proId, pro } = useProGuard();
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [referred, setReferred] = useState<Referred[]>([]);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      // Pros attributed to this one via referred_by, with first-job status.
      // referrals_for_me() is SECURITY DEFINER so it can read the referred
      // rows that RLS would otherwise hide. (Not yet in the generated types.)
      const { data, error } = await supabase.rpc("referrals_for_me" as never);
      if (cancelled) return;
      if (error) {
        console.error("referrals_for_me failed", error);
        return;
      }
      const rows = (data ?? []) as unknown as {
        pro_id: string;
        business: string | null;
        signed_up_at: string;
        has_first_job: boolean;
      }[];
      setReferred(
        rows.map((r) => ({
          proId: r.pro_id,
          business: r.business ?? "New pro",
          signedUpAt: r.signed_up_at,
          hasFirstJob: r.has_first_job,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!pro || !proId) {
    return (
      <ProShell pro={pro} active="referral">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  const link =
    typeof window === "undefined"
      ? `/pro/signup?ref=${proId}`
      : `${window.location.origin}/pro/signup?ref=${proId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setToast("Link copied");
      setTimeout(() => setCopied(false), 2000);
      await logEvent(`pro:${proId}`, "referral_link_copied", {});
    } catch {
      setToast("Couldn't copy. Select the link and copy it manually");
    }
  }

  return (
    <ProShell pro={pro} active="referral">
      <ProPageHead
        eyebrow="Referral"
        title="Refer a pro, both get paid"
        sub="The reward pays out when they log their first verified job, not on signup."
      />

      <div className="grid md:grid-cols-[1.2fr_1fr] gap-5 items-start">
        <div className="space-y-5">
          <Card className="anim-fade-up d-1">
            <Eyebrow accent="indigo">Your link</Eyebrow>
            <div className="mt-3 flex gap-2">
              <Input
                value={link}
                readOnly
                aria-label="Your referral link"
                className="font-mono text-[13px]"
              />
              <Btn variant="indigo" onClick={copy} className="shrink-0">
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </Btn>
            </div>
            <p className="mt-3 text-xs text-muted">
              Works best founder-to-founder: the plumber refers the electrician, the electrician
              refers the HVAC tech. Every trade on a home makes the record more valuable for
              everyone.
            </p>
          </Card>

          <Card className="anim-fade-up d-2">
            <Eyebrow accent="indigo">Your referrals</Eyebrow>
            {referred.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No referrals yet. Share your link. You'll see each signup and their first-job status
                here.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-line">
                {referred.map((r) => (
                  <div key={r.proId} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-ink">{r.business}</div>
                      <div className="text-xs text-muted tnum">
                        Signed up {formatDate(r.signedUpAt)}
                      </div>
                    </div>
                    {r.hasFirstJob ? (
                      <Pill accent="indigo">First job logged</Pill>
                    ) : (
                      <Pill accent="ink">No job yet</Pill>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="anim-fade-up d-2">
          <Eyebrow accent="indigo">How it works</Eyebrow>
          <div className="mt-3 space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigobg text-indigo font-bold text-sm flex items-center justify-center shrink-0 tnum">
                  {i + 1}
                </div>
                <div>
                  <div className="font-semibold text-ink text-sm">{s.title}</div>
                  <div className="text-xs text-muted mt-0.5">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
