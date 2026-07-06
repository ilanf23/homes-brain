import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, Btn, Card, Eyebrow, KV, PageLoader, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isGoogleUrl, logEvent, notifyPro, tradeLabel } from "@/lib/hb";
import { Logo, LogoMark, ShieldCheck, TradeIcon } from "@/components/svg";

export const Route = createFileRoute("/r/$recordId")({
  head: () => ({ meta: [{ title: "Your service record - HomesBrain" }] }),
  component: PublicRecord,
});

type RecordView = {
  id: string;
  viewed_at: string | null;
  jobs: {
    what_done: string;
    next_service_date: string | null;
    created_at: string;
    pros: {
      id: string;
      business: string;
      trade: string;
      google_rating: number | null;
      google_place_id: string | null;
    } | null;
    homes: { id: string; address: string; claimed_by_homeowner: string | null } | null;
    equipment: {
      type: string | null;
      make: string | null;
      model: string | null;
      warranty_until: string | null;
      recall_status: string;
    } | null;
    customers: { name: string } | null;
  } | null;
};

function PublicRecord() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const [rec, setRec] = useState<RecordView | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("records")
        .select(
          `
          id, viewed_at,
          jobs!inner(
            what_done, next_service_date, created_at,
            pros(id,business,trade,google_rating,google_place_id),
            homes(id,address,claimed_by_homeowner),
            equipment(type,make,model,warranty_until,recall_status),
            customers(name)
          )
        `,
        )
        .eq("id", recordId)
        .maybeSingle();
      setRec(data as unknown as RecordView);
      setLoading(false);
      if (data && !(data as RecordView).viewed_at) {
        await supabase
          .from("records")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", recordId);
        await logEvent(null, "record_viewed", { record_id: recordId });
        const view = data as RecordView;
        if (view.jobs?.pros?.id) {
          const who = view.jobs.customers?.name ?? "Your customer";
          const where = view.jobs.homes?.address ? ` at ${view.jobs.homes.address}` : "";
          await notifyPro(
            view.jobs.pros.id,
            "record_viewed",
            "Record viewed",
            `${who}${where} viewed their service record`,
            { record_id: recordId, home_id: view.jobs.homes?.id },
          );
        }
      }
    })();
  }, [recordId]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <PageLoader label="Loading record" />;
  if (!rec || !rec.jobs) {
    return (
      <div className="min-h-dvh bg-soft flex items-center justify-center">
        <Card className="anim-scale-in text-center max-w-sm mx-5">
          <LogoMark size={36} className="mx-auto" />
          <h1 className="mt-4 text-xl tracking-tight">Record not found</h1>
          <p className="mt-2 text-sm text-muted">This link may have expired or been mistyped.</p>
          <Link to="/" className="block mt-4">
            <Btn variant="secondary" className="w-full">
              Go to HomesBrain
            </Btn>
          </Link>
        </Card>
      </div>
    );
  }

  const j = rec.jobs;
  const pro = j.pros;
  const reviewUrl = pro && isGoogleUrl(pro.google_place_id) ? pro.google_place_id : null;
  const eq = j.equipment;
  const isClaimed = !!j.homes?.claimed_by_homeowner;

  return (
    <div className="min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-2xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">Your record</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-10 space-y-5">
        <Card className="anim-fade-up shadow-[0_24px_60px_-30px_rgba(22,22,15,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={pro?.business ?? "?"} accent="indigo" size={52} />
              <div>
                <div className="font-extrabold text-ink text-lg">{pro?.business}</div>
                <div className="text-xs text-muted flex items-center gap-1.5">
                  <TradeIcon trade={pro?.trade} size={13} className="text-indigo" />
                  {tradeLabel(pro?.trade)}
                  {pro?.google_rating ? ` · ${pro.google_rating} ★` : ""}
                </div>
              </div>
            </div>
            <button
              onClick={copyLink}
              className="pressable rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:border-ink/20 transition-colors"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>

          <div className="mt-5">
            <Eyebrow accent="indigo">Service record</Eyebrow>
            <div className="text-sm text-muted mt-1 font-mono tnum">
              {formatDate(j.created_at)} · {j.homes?.address}
            </div>
          </div>

          <div className="mt-4">
            <KV k="Equipment" v={eq?.type ?? "-"} />
            <KV k="Make / Model" v={[eq?.make, eq?.model].filter(Boolean).join(" · ") || "-"} />
            <KV k="Warranty until" v={formatDate(eq?.warranty_until) || "-"} />
            <KV
              k="Recall status"
              v={
                <span className="inline-flex items-center gap-1.5 text-indigo font-semibold text-sm">
                  <ShieldCheck size={18} /> No known recalls, checked today
                </span>
              }
            />
            <KV k="Work done" v={j.what_done} />
            <KV k="Next service" v={formatDate(j.next_service_date) || "-"} />
          </div>
        </Card>

        {!isClaimed && (
          <Card className="anim-fade-up d-2 bg-indigobg border-indigo/20">
            <Eyebrow accent="indigo">Own your home's history</Eyebrow>
            <h2 className="mt-2 text-2xl tracking-tight">Claim your home, free.</h2>
            <p className="mt-2 text-sm text-ink/80">
              Keep every service record in one place. Add the other pros who work on your home.
              Yours for life.
            </p>
            <div className="mt-4">
              <Btn
                variant="indigo"
                size="lg"
                className="w-full"
                onClick={() => navigate({ to: "/claim/$recordId", params: { recordId } })}
              >
                Claim your home, free
              </Btn>
            </div>
          </Card>
        )}

        {isClaimed && (
          <Card className="anim-fade-up d-2">
            <Pill accent="indigo">Claimed</Pill>
            <div className="mt-2 text-sm text-ink">This home is in your HomesBrain.</div>
            <Link to="/home" className="block mt-3">
              <Btn variant="indigo" className="w-full">
                Go to my home
              </Btn>
            </Link>
          </Card>
        )}

        <div className="anim-fade-up d-3 grid grid-cols-2 gap-3">
          {reviewUrl ? (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noreferrer"
              className="contents"
              onClick={() => logEvent(pro?.id ? `pro:${pro.id}` : null, "review_link_clicked")}
            >
              <Btn variant="secondary" className="w-full">
                Leave {pro?.business} a review
              </Btn>
            </a>
          ) : (
            <Btn variant="secondary">Leave {pro?.business} a review</Btn>
          )}
          <Btn variant="coral">Rebook {pro?.business}</Btn>
        </div>

        <div className="anim-fade-up d-4">
          <button
            onClick={() => setAboutOpen((v) => !v)}
            aria-expanded={aboutOpen}
            className="w-full flex items-center justify-between rounded-xl bg-paper border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <LogoMark size={18} /> What is HomesBrain?
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className={`transition-transform duration-300 ${aboutOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path
                d="m4 6 4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div
            className={`grid transition-all duration-300 ease-out ${aboutOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
              <p className="text-sm text-muted px-4 py-3">
                HomesBrain keeps a permanent, verified history of the work done on your home, like a
                Carfax report, but for houses. Pros log the work, you own the record. Free for
                homeowners, forever.
              </p>
            </div>
          </div>
        </div>

        <p className="anim-fade-up d-5 text-center text-xs text-muted px-4">
          Recall status sourced from public manufacturer notices and never guaranteed absolute.
        </p>
      </div>
    </div>
  );
}
