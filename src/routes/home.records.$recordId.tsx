import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Check, Star } from "lucide-react";
import { Btn, Card, Eyebrow, PageLoader, Pill, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, isGoogleUrl, tradeLabel } from "@/lib/hb";
import { ShieldCheck } from "@/components/svg";
import { Celebration, consumeCelebration } from "@/components/celebration";
import { HomeShell, useHomeownerGuard } from "@/components/home-shell";
import { formatMoney, isOverdue, listInvoicesForHome, type HomeInvoice } from "@/lib/invoices";
import { startInvoiceCheckout } from "@/lib/stripe-connect";
import { homeRecordCopy } from "@/lib/customer-locales";
import { useI18n } from "@/lib/i18n";
import { listJobMedia, signJobMedia, type JobMediaRow } from "@/lib/media";
import { RecordMedia } from "@/components/job-media";
import { track } from "@/lib/events";

export const Route = createFileRoute("/home/records/$recordId")({
  head: () => ({ meta: [{ title: "Service record - HomesBrain" }] }),
  component: RecordDetail,
});

function relativeDate(iso: string, locale: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.round(diffMs / (24 * 3600 * 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(days) < 45) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 18) return rtf.format(months, "month");
  return rtf.format(Math.round(days / 365), "year");
}

function RecordDetail() {
  const { recordId } = Route.useParams();
  const { locale } = useI18n();
  const copy = homeRecordCopy(locale);
  const { homeownerId, homeowner, home, records, jobs, pros, loading } = useHomeownerGuard();

  const record = useMemo(() => records.find((r) => r.id === recordId) ?? null, [records, recordId]);
  const job = useMemo(
    () => (record ? (jobs.find((j) => j.id === record.job_id) ?? null) : null),
    [record, jobs],
  );
  const pro = useMemo(
    () => (job ? (pros.find((p) => p.id === job.pro_id) ?? null) : null),
    [job, pros],
  );

  // pros bundle doesn't carry google_place_id; fetch it for the review CTA.
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pro?.id) return;
    (async () => {
      const { data } = await supabase
        .from("pros")
        .select("google_place_id")
        .eq("id", pro.id)
        .maybeSingle();
      const url = data?.google_place_id ?? null;
      setReviewUrl(isGoogleUrl(url) ? url : null);
    })();
  }, [pro?.id]);

  const [invoices, setInvoices] = useState<HomeInvoice[]>([]);
  const [payErr, setPayErr] = useState<string | null>(null);
  useEffect(() => {
    if (!home) return;
    (async () => setInvoices(await listInvoicesForHome(home.id)))();
  }, [home]);
  const invoice = useMemo(
    () => invoices.find((i) => i.job_id === record?.job_id) ?? null,
    [invoices, record],
  );

  const [media, setMedia] = useState<JobMediaRow[]>([]);
  useEffect(() => {
    if (!job) return;
    (async () => setMedia(await signJobMedia(await listJobMedia([job.id]))))();
  }, [job]);

  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (consumeCelebration("home_claimed")) setCelebrate(true);
  }, []);

  const [remindSubbed, setRemindSubbed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function subscribeReminder() {
    setRemindSubbed(true);
    await track("homeowner", homeownerId, "reminder_subscribed", {
      record_id: record?.id,
      job_id: job?.id,
      pro_id: pro?.id,
    });
    setToast(copy.reminderOn ?? "You'll get a heads-up before it's due.");
  }

  async function onReviewClick() {
    await track("homeowner", homeownerId, "review_click", {
      pro_id: pro?.id,
      record_id: record?.id,
    });
  }

  if (loading) return <PageLoader label={copy.loadingRecord} />;

  if (!home || !record || !job) {
    return (
      <HomeShell active="overview" homeowner={homeowner} home={home}>
        <Card className="anim-fade-up text-center py-14">
          <h1 className="text-2xl tracking-tight">{copy.notFound}</h1>
          <p className="mt-2 text-sm text-muted">{copy.notOnHome}</p>
          <div className="mt-6">
            <Link to="/home">
              <Btn variant="secondary">{copy.backHome}</Btn>
            </Link>
          </div>
        </Card>
      </HomeShell>
    );
  }

  const localized = job.localized_content?.[locale];
  const localizedWhatDone = localized?.what_done || job.what_done;

  const hidden = new Set(record.hidden_fields ?? []);
  const visibleMedia = media.filter((m) =>
    m.kind === "video" ? !hidden.has("video") : !hidden.has("photos"),
  );
  const heroPhoto = visibleMedia.find((m) => m.kind !== "video") ?? null;
  const heroVideo = visibleMedia.find((m) => m.kind === "video") ?? null;

  const businessName = pro?.business ?? copy.yourPro;
  const ratingLabel = pro?.google_rating != null ? Number(pro.google_rating).toFixed(1) : null;

  return (
    <HomeShell active="overview" homeowner={homeowner} home={home}>
      {celebrate && <Celebration variant="grand" />}
      {toast && <Toast>{toast}</Toast>}

      <Link
        to="/home"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> {copy.myHome}
      </Link>

      {/* Pro identity — pro is the star, HomesBrain is the vehicle. */}
      <div className="anim-fade-up flex items-center gap-3 mb-6">
        {pro?.logo ? (
          <img
            src={pro.logo}
            alt=""
            className="w-12 h-12 rounded-2xl object-cover border border-line bg-paper"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-indigobg text-indigo font-bold flex items-center justify-center">
            {businessName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold tracking-tight text-ink truncate">{businessName}</div>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-muted">
            via HomesBrain
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
            {ratingLabel && (
              <span className="inline-flex items-center gap-1 text-ink font-semibold">
                <Star size={12} className="fill-amber text-amber" />
                {ratingLabel} · Google
              </span>
            )}
            {pro && (
              <span className="text-muted">
                {ratingLabel ? "· " : ""}
                {tradeLabel(pro.trade)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1) VALUE HERO — give before you ask. */}
      <Card className="anim-fade-up d-1 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, rgba(71,63,176,0.10), transparent 60%), radial-gradient(120% 80% at 100% 100%, rgba(15,110,86,0.08), transparent 60%)",
          }}
        />
        <div className="relative">
          <Eyebrow accent="indigo">{copy.serviceRecord}</Eyebrow>
          <h1 className="mt-2 text-3xl md:text-4xl tracking-tight leading-tight">
            Your home just got a permanent record.
          </h1>
          <p className="mt-2 text-sm text-muted">
            Free. Yours for life. <span className="text-ink font-semibold">{home.address}</span>
          </p>

          {(heroPhoto || heroVideo) && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-indigo">
                  {heroVideo ? copy.videoFromPro : copy.photosFromPro}
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-indigo font-semibold">
                  <ShieldCheck size={13} animate={false} /> {copy.verified}
                </span>
              </div>
              <RecordMedia
                media={visibleMedia}
                videoLabel={copy.videoFromPro}
                downloadLabel={copy.downloadVideo}
                photoAlt={copy.jobPhoto}
                onVideoPlay={() => {
                  void track("homeowner", homeownerId, "video_watched", { record_id: record.id });
                }}
              />
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-paper border border-line p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-muted">
              {copy.workDone}
            </div>
            <div className="mt-1 text-ink font-semibold whitespace-pre-wrap">
              {localizedWhatDone}
            </div>
            <div className="mt-3 text-xs text-muted">
              {copy.date}: {formatDate(job.created_at, locale)}
              {job.next_service_date && (
                <>
                  {" · "}
                  {copy.nextService}: {relativeDate(job.next_service_date, locale)}
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 2) HERO ASK — Google review. The single loudest thing on the page. */}
      <div className="anim-fade-up d-2 mt-8">
        {reviewUrl ? (
          <a href={reviewUrl} target="_blank" rel="noopener noreferrer" onClick={onReviewClick}>
            <div className="group relative rounded-3xl p-6 md:p-7 bg-gradient-to-br from-indigo to-[#2a2470] text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-1 mb-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={22} className="fill-amber text-amber drop-shadow-sm" />
                ))}
              </div>
              <div className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                Rate {businessName} on Google
              </div>
              <div className="mt-1 text-sm text-white/80">
                30 seconds. It's the single best way to say thanks.
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white text-indigo font-bold px-5 py-2.5 text-sm group-hover:translate-y-[-1px] transition-transform">
                Leave a Google review →
              </div>
            </div>
          </a>
        ) : (
          <Card className="text-center">
            <div className="text-sm text-muted">
              {businessName} hasn't connected their Google listing yet. When they do, you'll be able
              to leave a review right here.
            </div>
          </Card>
        )}
      </div>

      {/* 3) REMINDER — secondary. */}
      {job.next_service_date && (
        <div className="anim-fade-up d-3 mt-5">
          <Card>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-full bg-indigobg text-indigo flex items-center justify-center shrink-0">
                <Bell size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-ink">
                  {copy.nextService}: {relativeDate(job.next_service_date, locale)}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  Helps you, and brings {businessName} back.
                </div>
              </div>
              {remindSubbed ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo">
                  <Check size={16} /> {copy.reminderOn ?? "Reminder on"}
                </span>
              ) : (
                <Btn variant="secondary" onClick={subscribeReminder}>
                  Remind me before it's due
                </Btn>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 4) PASSIVE CLAIM — quiet reassurance, not a gate. */}
      <p className="anim-fade-up d-4 mt-6 text-center text-xs text-muted">
        Saved to {home.address}. You're signed in — add a password anytime, never required.
      </p>

      {/* Invoice — kept for real functionality; payment CTA is not the hero. */}
      {invoice && (
        <div className="mt-8">
          <Card className="anim-fade-up">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Eyebrow accent="indigo">{copy.invoice}</Eyebrow>
              {invoice.status === "paid" ? (
                <Pill accent="indigo">{copy.paid}</Pill>
              ) : isOverdue(invoice) ? (
                <Pill accent="red">{copy.overdue}</Pill>
              ) : (
                <Pill accent="amber">{copy.open}</Pill>
              )}
            </div>
            <div className="mt-3 space-y-1">
              {invoice.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-ink">{it.description}</span>
                  <span className="text-ink font-semibold tnum">
                    {formatMoney(Number(it.amount), locale)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 mt-2 text-sm font-bold">
                <span>{copy.total}</span>
                <span className="tnum">{formatMoney(Number(invoice.total), locale)}</span>
              </div>
            </div>
            {invoice.status === "open" && invoice.pros?.stripe_charges_enabled && (
              <div className="mt-4">
                <Btn
                  variant="indigo"
                  onClick={async () => {
                    setPayErr(null);
                    try {
                      const { url } = await startInvoiceCheckout(invoice.id);
                      window.location.href = url;
                    } catch (e) {
                      setPayErr(e instanceof Error ? e.message : copy.paymentError);
                    }
                  }}
                >
                  {copy.pay(formatMoney(Number(invoice.total), locale))}
                </Btn>
                {payErr && (
                  <div role="alert" className="mt-2 text-sm text-red bg-redbg rounded-xl px-3 py-2">
                    {payErr}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </HomeShell>
  );
}
