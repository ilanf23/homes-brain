import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard, MapPin, Plus, Star } from "lucide-react";
import { Btn, Card, Pill, Skeleton, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent, mockSend } from "@/lib/hb";
import { reverseGeocode } from "@/lib/geo";
import { ProShell, useProGuard } from "@/components/pro-shell";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "Home - HomesBrain" }] }),
  component: ProHome,
});

const DAY = 24 * 3600 * 1000;
const DUE_WINDOW = 14 * DAY;
const MAX_DUE = 4;

type DueJob = {
  id: string;
  home_id: string;
  what_done: string;
  next_service_date: string;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  address: string | null;
};

type JobRow = {
  id: string;
  home_id: string;
  what_done: string;
  next_service_date: string | null;
  customers: { id: string; name: string; phone: string | null; email: string | null } | null;
  homes: { address: string } | null;
};

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* No personal name is stored on a pro (only the business), so greet with the
   first word of the business name, minus any possessive: "Vlad's Water" -> "Vlad". */
function firstName(business: string) {
  const first = business.trim().split(/\s+/)[0] ?? "";
  return first.replace(/['’]s$/i, "") || business.trim();
}

function ProHome() {
  const { proId, pro } = useProGuard();
  const [due, setDue] = useState<DueJob[]>([]);
  const [reviewsThisWeek, setReviewsThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const connected = !!pro?.google_place_id;

  // Load the two things this screen shows: who's due, and the reviews win.
  useEffect(() => {
    if (!proId) return;
    (async () => {
      const cutoff = new Date(Date.now() + DUE_WINDOW).toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
      const [{ data: j }, { count }] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,home_id,what_done,next_service_date,customers(id,name,phone,email),homes(address)",
          )
          .eq("pro_id", proId)
          .not("next_service_date", "is", null)
          .lte("next_service_date", cutoff)
          .order("next_service_date", { ascending: true }),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("actor", `pro:${proId}`)
          .eq("type", "review_requested")
          .gte("created_at", weekAgo),
      ]);

      // One row per home (the soonest-due job), most urgent first, capped short.
      const seen = new Set<string>();
      const list: DueJob[] = [];
      for (const row of (j ?? []) as unknown as JobRow[]) {
        if (!row.next_service_date || seen.has(row.home_id)) continue;
        seen.add(row.home_id);
        list.push({
          id: row.id,
          home_id: row.home_id,
          what_done: row.what_done,
          next_service_date: row.next_service_date,
          customer: row.customers,
          address: row.homes?.address ?? null,
        });
        if (list.length >= MAX_DUE) break;
      }
      setDue(list);
      setReviewsThisWeek(count ?? 0);
      setLoading(false);
    })();
  }, [proId]);

  // Location chip is best-effort and non-blocking: it fills in async, and a
  // denied or slow lookup simply leaves the chip off.
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (r?.address) setPlace(r.address);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function remind(job: DueJob) {
    const c = job.customer;
    if (!c || (!c.phone && !c.email) || !pro) return;
    setBusy(job.id);
    const body = `Hi ${c.name.split(" ")[0]}, it's ${pro.business}. Your ${job.what_done.toLowerCase()} is due for service around ${formatDate(job.next_service_date)}. Reply here or book a time and we'll take care of it.`;
    await mockSend({
      channel: c.phone ? "sms" : "email",
      to: c.phone ?? c.email ?? "",
      body,
      kind: "other",
    });
    await logEvent(`pro:${proId}`, "rebook_nudge_sent", { job_id: job.id, customer_id: c.id });
    setReminded((prev) => new Set(prev).add(job.id));
    setBusy(null);
    setToast(`Reminder sent to ${c.name}`);
  }

  if (loading || !pro) {
    return (
      <ProShell pro={pro} active="home">
        <div className="anim-fade-in max-w-xl mx-auto" aria-hidden="true">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-6 h-20 w-full rounded-[22px]" />
          <Skeleton className="mt-6 h-40 w-full rounded-[22px]" />
        </div>
        <span className="sr-only">Loading</span>
      </ProShell>
    );
  }

  return (
    <ProShell pro={pro} active="home">
      <div className="max-w-xl mx-auto">
        {/* Greeting */}
        <div className="anim-fade-up">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            {greetingWord()}, {firstName(pro.business)}.
          </h1>
          {place && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigobg px-3 py-1 text-[13px] font-semibold text-indigodark max-w-full">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">You're at {place}</span>
            </div>
          )}
        </div>

        {/* Hero action: the biggest, most prominent thing on the screen. */}
        <Link to="/pro/jobs/new" className="anim-fade-up d-1 mt-6 block">
          <Btn
            variant="indigo"
            size="lg"
            className="w-full min-h-[80px] py-5 shadow-[0_16px_36px_-12px_rgba(71,63,176,0.6)]"
            tabIndex={-1}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="flex items-center gap-2 text-xl font-bold">
                <Plus size={22} /> Log a job
              </span>
              <span className="mt-1 text-sm font-medium opacity-85">
                30 seconds. Just talk and tap.
              </span>
            </span>
          </Btn>
        </Link>

        {/* Who needs you: the money list, first after the hero. */}
        <div className="anim-fade-up d-2 mt-8">
          <h2 className="text-lg font-bold text-ink">Who needs you</h2>
          {due.length === 0 ? (
            <Card className="mt-3 text-sm text-muted">
              No one's due right now. You're all caught up.
            </Card>
          ) : (
            <div className="mt-3 space-y-3">
              {due.map((job) => {
                const c = job.customer;
                const overdue = new Date(job.next_service_date).getTime() < Date.now();
                const noContact = !c || (!c.phone && !c.email);
                const isReminded = reminded.has(job.id);
                return (
                  <Card key={job.id} className="!p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-ink truncate">{c?.name ?? "Customer"}</div>
                      <div className="text-sm text-muted truncate">{job.what_done}</div>
                      <div
                        className={`text-xs mt-0.5 ${overdue ? "text-red font-semibold" : "text-muted"}`}
                      >
                        {overdue
                          ? `Overdue since ${formatDate(job.next_service_date)}`
                          : `Due ${formatDate(job.next_service_date)}`}
                      </div>
                    </div>
                    {isReminded ? (
                      <span className="anim-scale-in shrink-0">
                        <Pill accent="indigo">Reminded</Pill>
                      </span>
                    ) : (
                      <Btn
                        variant="indigoSoft"
                        loading={busy === job.id}
                        disabled={noContact}
                        title={noContact ? "No phone or email on file" : undefined}
                        onClick={() => remind(job)}
                        className="shrink-0"
                      >
                        Remind
                      </Btn>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* One small win: rating-led, shown only when Google is connected. */}
        {connected && (
          <div className="anim-fade-up d-3 mt-8">
            <Card className="flex items-center gap-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-ink tnum">{pro.google_rating ?? "-"}</span>
                <Star size={20} className="text-coral fill-coralbg" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-ink">Your rating on Google</div>
                <div className="text-sm text-muted">
                  {reviewsThisWeek > 0
                    ? `Nice week: ${reviewsThisWeek} review ${reviewsThisWeek === 1 ? "ask" : "asks"} went out.`
                    : "Every record you send asks for one."}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Quiet office link: the full operator dashboard, out of the way. */}
        <Link
          to="/pro/office"
          className="anim-fade-up d-4 mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3.5 text-sm text-muted font-semibold hover:text-ink hover:bg-soft transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <LayoutDashboard size={17} />
            My numbers, map and customers
          </span>
          <ArrowRight size={16} className="shrink-0" />
        </Link>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}
