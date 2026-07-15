import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Btn, Card, Eyebrow, KV, PageLoader, Pill } from "@/lib/ui";
import { formatDate, recordTitle, tradeLabel } from "@/lib/hb";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { Celebration, consumeCelebration } from "@/components/celebration";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
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

function RecordDetail() {
  const { recordId } = Route.useParams();

  const { locale } = useI18n();
  const copy = homeRecordCopy(locale);
  const { homeownerId, homeowner, home, records, jobs, equipment, pros, loading } =
    useHomeownerGuard();

  const record = useMemo(() => records.find((r) => r.id === recordId) ?? null, [records, recordId]);
  const job = useMemo(
    () => (record ? (jobs.find((j) => j.id === record.job_id) ?? null) : null),
    [record, jobs],
  );
  const item = useMemo(
    () => (job?.equipment_id ? (equipment.find((e) => e.id === job.equipment_id) ?? null) : null),
    [job, equipment],
  );
  const pro = useMemo(
    () => (job ? (pros.find((p) => p.id === job.pro_id) ?? null) : null),
    [job, pros],
  );

  const [invoices, setInvoices] = useState<HomeInvoice[]>([]);
  const [payErr, setPayErr] = useState<string | null>(null);

  const [media, setMedia] = useState<JobMediaRow[]>([]);
  useEffect(() => {
    if (!job) return;
    (async () => setMedia(await signJobMedia(await listJobMedia([job.id]))))();
  }, [job]);

  // Play the claim celebration exactly once, on the page the new homeowner
  // lands on. Set in effect (not render) so SSR markup stays clean.
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (consumeCelebration("home_claimed")) setCelebrate(true);
  }, []);

  useEffect(() => {
    if (!home) return;
    (async () => setInvoices(await listInvoicesForHome(home.id)))();
  }, [home]);

  const invoice = useMemo(
    () => invoices.find((i) => i.job_id === record?.job_id) ?? null,
    [invoices, record],
  );

  if (loading) return <PageLoader label={copy.loadingRecord} />;

  // Never auto-redirect away from a record link. If the bundle is missing
  // the home or the record, say so; a silent bounce to the dashboard reads
  // as a broken claim.
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
  const localizedEquipmentType = localized?.equipment_type || item?.type || null;
  const eqLine = item
    ? [localizedEquipmentType, item.make, item.model].filter(Boolean).join(" · ")
    : null;
  const localizedTitle =
    locale === "en"
      ? recordTitle(localizedWhatDone, localizedEquipmentType)
      : localizedWhatDone.length > 80
        ? `${localizedWhatDone.slice(0, 77).trimEnd()}…`
        : localizedWhatDone;

  return (
    <HomeShell active="overview" homeowner={homeowner} home={home}>
      {celebrate && <Celebration variant="grand" />}
      <Link
        to="/home"
        className="anim-fade-up inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={15} /> {copy.myHome}
      </Link>

      <HomePageHead
        eyebrow={copy.serviceRecord}
        title={localizedTitle}
        sub={pro ? `${pro.business} · ${tradeLabel(pro.trade)}` : undefined}
        action={
          <span className="inline-flex items-center gap-1.5 text-indigo font-semibold text-sm">
            <ShieldCheck size={17} animate={false} /> {copy.verified}
          </span>
        }
      />

      <div className="space-y-6">
        {(() => {
          const hidden = new Set(record.hidden_fields ?? []);
          const visible = media.filter((m) =>
            m.kind === "video" ? !hidden.has("video") : !hidden.has("photos"),
          );
          if (visible.length === 0) return null;
          const hasVideo = visible.some((m) => m.kind === "video");
          return (
            <Card className="anim-fade-up d-1">
              <Eyebrow accent="coral">{hasVideo ? copy.videoFromPro : copy.photosFromPro}</Eyebrow>
              <div className="mt-3">
                <RecordMedia
                  media={visible}
                  videoLabel={copy.videoFromPro}
                  downloadLabel={copy.downloadVideo}
                  photoAlt={copy.jobPhoto}
                  onVideoPlay={() => {
                    void track("homeowner", homeownerId, "video_watched", {
                      record_id: record.id,
                    });
                  }}
                />
              </div>
            </Card>
          );
        })()}

        <Card className="anim-fade-up d-1">
          <Eyebrow accent="indigo">{copy.details}</Eyebrow>
          <div className="mt-2">
            <KV k={copy.address} v={home.address} mono={false} />
            <KV k={copy.workDone} v={localizedWhatDone} mono={false} />
            <KV k={copy.date} v={formatDate(job.created_at, locale)} />
            {job.next_service_date && (
              <KV k={copy.nextService} v={formatDate(job.next_service_date, locale)} />
            )}
            {pro && (
              <KV
                k={copy.servicedBy}
                v={
                  <span className="inline-flex items-center gap-1.5">
                    <TradeIcon trade={pro.trade} size={12} className="text-indigo" />
                    {pro.business}
                  </span>
                }
                mono={false}
              />
            )}
          </div>
        </Card>

        {invoice && (
          <Card className="anim-fade-up d-2 border-indigo/30">
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
              {invoice.due_date && invoice.status === "open" && (
                <div className="text-xs text-muted mt-1">
                  {copy.due(formatDate(invoice.due_date, locale))}
                  {isOverdue(invoice) ? ` · ${copy.overdue.toLocaleLowerCase(locale)}` : ""}
                </div>
              )}
              {invoice.note && (
                <div className="text-xs text-muted mt-2 whitespace-pre-wrap">{invoice.note}</div>
              )}
            </div>
            {invoice.status === "open" && (
              <div className="mt-4">
                {invoice.pros?.stripe_charges_enabled ? (
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
                ) : (
                  <p className="text-xs text-muted">
                    {copy.paymentsOff(invoice.pros?.business ?? copy.yourPro)}
                  </p>
                )}
                {payErr && (
                  <div role="alert" className="mt-2 text-sm text-red bg-redbg rounded-xl px-3 py-2">
                    {payErr}
                  </div>
                )}
              </div>
            )}
            {invoice.status === "paid" && invoice.paid_at && (
              <div className="mt-3 text-xs text-muted">
                {copy.paidOn(formatDate(invoice.paid_at, locale))}
              </div>
            )}
          </Card>
        )}

        {item && (
          <Card className="anim-fade-up d-2">
            <Eyebrow accent="indigo">{copy.equipment}</Eyebrow>
            <div className="mt-2">
              <KV k={copy.item} v={eqLine || localizedEquipmentType || "-"} mono={false} />
              {item.serial && <KV k={copy.serial} v={item.serial} />}
              {item.warranty_until && (
                <KV k={copy.warranty} v={copy.until(formatDate(item.warranty_until, locale))} />
              )}
              <KV
                k={copy.recall}
                v={
                  <Pill accent={item.recall_status === "none" ? "indigo" : "red"}>
                    {item.recall_status === "none" ? copy.noKnownRecalls : item.recall_status}
                  </Pill>
                }
                mono={false}
              />
            </div>
            <div className="mt-4">
              <Link to="/home/items/$itemId" params={{ itemId: item.id }}>
                <Btn variant="secondary">{copy.openItemHistory}</Btn>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </HomeShell>
  );
}
