import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  Gift,
  Globe,
  LogOut,
  ShieldCheck,
  Star,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Btn,
  Card,
  Field,
  Input,
  PhoneInput,
  Pill,
  SettingRow,
  Skeleton,
  Toast,
  Toggle,
} from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, TRADES, proTrades } from "@/lib/hb";
import { TradeIcon } from "@/components/svg";
import { GoogleConnect } from "@/components/google-connect";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { DeleteAccountRow, downloadJson } from "@/components/settings";
import { LanguageToggle } from "@/lib/i18n";
import { refreshStripeStatus, startStripeOnboarding } from "@/lib/stripe-connect";

/* Instagram-style settings: a hub of plain-words rows, one screen per setting.
   The open screen lives in the ?s= search param so back buttons and swipes
   behave like real pages. */
const SECTION_IDS = [
  "profile",
  "google",
  "payments",
  "plan",
  "language",
  "notifications",
  "reviews",
  "referral",
  "account",
  "data",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

export const Route = createFileRoute("/pro/settings")({
  head: () => ({ meta: [{ title: "Settings - HomesBrain" }] }),
  validateSearch: (search: Record<string, unknown>): { s?: SectionId } =>
    SECTION_IDS.includes(search.s as SectionId) ? { s: search.s as SectionId } : {},
  component: ProSettings,
});

/* Settings columns beyond what useProGuard fetches. */
type ProPrefs = {
  email: string | null;
  phone: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  review_requests_on: boolean;
  promo_sms_consent: boolean;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
};


/* One tappable hub row: icon tile, plain-words label, current value, chevron. */
function HubRow({
  icon: Icon,
  label,
  value,
  section,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  section: SectionId;
}) {
  return (
    <Link
      to="/pro/settings"
      search={{ s: section }}
      className="pressable flex items-center gap-3 rounded-xl px-3 py-3.5 hover:bg-soft"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft text-muted">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {value && <span className="block truncate text-xs text-muted mt-0.5">{value}</span>}
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}

function HubGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="eyebrow text-indigo px-1 mb-2">{title}</div>
      <Card className="!p-2">{children}</Card>
    </div>
  );
}

/* Detail screens share one header: back to the hub, then the title says
   exactly what this screen changes. */
function SectionScreen({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="anim-fade-up max-w-xl mx-auto">
      <Link
        to="/pro/settings"
        search={{}}
        className="pressable inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 -ml-2 text-sm font-semibold text-muted hover:text-ink hover:bg-soft"
      >
        <ChevronLeft size={16} /> Settings
      </Link>
      <h1 className="mt-2 text-2xl tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ProSettings() {
  const navigate = useNavigate();
  const { s: section } = Route.useSearch();
  const { proId, pro, setPro } = useProGuard();
  const [prefs, setPrefs] = useState<ProPrefs | null>(null);

  const [business, setBusiness] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [trades, setTrades] = useState<string[]>([]);
  const [area, setArea] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [prefErr, setPrefErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("pros")
        .select(
          "email,phone,notify_email,notify_sms,review_requests_on,promo_sms_consent,stripe_account_id,stripe_charges_enabled,stripe_payouts_enabled,stripe_details_submitted",
        )
        .eq("id", proId)
        .maybeSingle();
      if (data) {
        setPrefs(data as ProPrefs);
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
      }
    })();
  }, [proId]);

  useEffect(() => {
    if (!pro) return;
    setBusiness(pro.business);
    setOwnerFirstName(pro.owner_first_name ?? "");
    setTrades(proTrades(pro));
    setArea(pro.service_area ?? "");
  }, [pro]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!pro || !proId) {
    return (
      <ProShell pro={pro} active="settings">
        <ProPageSkeleton />
      </ProShell>
    );
  }

  const currentTrades = proTrades(pro);
  const tradesDirty =
    trades.length !== currentTrades.length || trades.some((t, i) => t !== currentTrades[i]);

  const dirty =
    business !== pro.business ||
    ownerFirstName !== (pro.owner_first_name ?? "") ||
    tradesDirty ||
    area !== (pro.service_area ?? "") ||
    email !== (prefs?.email ?? "") ||
    phone !== (prefs?.phone ?? "");

  async function saveProfile() {
    setSaving(true);
    setProfileErr(null);
    const primary = trades[0] ?? "";
    const patch = {
      business,
      owner_first_name: ownerFirstName.trim() || null,
      trade: primary,
      trades,
      service_area: area,
      email: email.trim() || null,
      phone: phone.trim() || null,
    };
    const { data, error } = await supabase.from("pros").update(patch).eq("id", proId!).select("id");
    if (error || !data?.length) {
      setProfileErr(error?.message ?? "Couldn't save. Try again.");
    } else {
      setPro({
        ...pro!,
        business,
        owner_first_name: patch.owner_first_name,
        trade: primary,
        trades,
        service_area: area,
      });
      if (prefs) setPrefs({ ...prefs, email: patch.email, phone: patch.phone });
      setToast("Saved");
    }
    setSaving(false);
  }

  /* Optimistic toggle: flip first, revert on failure. Silent on success -
     the switch itself is the feedback. */
  async function setPref(
    key: "notify_email" | "notify_sms" | "review_requests_on" | "promo_sms_consent",
    value: boolean,
  ) {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setPrefErr(null);
    const patch: Record<string, unknown> = { [key]: value };
    if (key === "promo_sms_consent") {
      patch.promo_sms_consent_at = value ? new Date().toISOString() : null;
    }
    const { data, error } = await supabase
      .from("pros")
      .update(patch as never)
      .eq("id", proId!)
      .select("id");

    if (error || !data?.length) {
      setPrefs(prev);
      setPrefErr("Couldn't save that change. Try again.");
    }
  }


  const referralLink =
    typeof window === "undefined"
      ? `/pro/signup?ref=${proId}`
      : `${window.location.origin}/pro/signup?ref=${proId}`;

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setToast("Link copied");
      setTimeout(() => setCopied(false), 2000);
      await logEvent(`pro:${proId}`, "referral_link_copied", { from: "settings" });
    } catch {
      setToast("Couldn't copy. Select the link and copy it manually");
    }
  }

  async function exportData() {
    setExporting(true);
    let payload: unknown = null;
    // The scoped RPC needs a real auth session; under v0 mock auth it comes
    // back empty, so fall back to a same-shape client query by session id.
    const { data, error } = await supabase.rpc("export_my_pro_data");
    if (!error && data && (data as { pro?: unknown }).pro) {
      payload = data;
    } else {
      const [{ data: p }, { data: c }, { data: j }] = await Promise.all([
        supabase.from("pros").select("*").eq("id", proId!).maybeSingle(),
        supabase.from("customers").select("*").eq("pro_id", proId!),
        supabase.from("jobs").select("*").eq("pro_id", proId!),
      ]);
      payload = { pro: p, customers: c ?? [], jobs: j ?? [] };
    }
    downloadJson(`homesbrain-pro-data-${new Date().toISOString().slice(0, 10)}.json`, payload);
    await logEvent(`pro:${proId}`, "data_exported", { kind: "pro" });
    setExporting(false);
    setToast("Your data downloaded");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const prefErrBox = prefErr && (
    <div role="alert" className="anim-fade-in mt-3 text-sm text-red bg-redbg rounded-xl px-3 py-2">
      {prefErr}
    </div>
  );

  /* ------- detail screens ------- */

  const screens: Record<SectionId, ReactNode> = {
    profile: (
      <SectionScreen title="Business profile" sub="What homeowners see on every record you send.">
        <Card className="space-y-4">
          <Field label="Business name">
            <Input value={business} onChange={(e) => setBusiness(e.target.value)} />
          </Field>
          <Field label="Your first name" hint="How we greet you on the dashboard.">
            <Input
              value={ownerFirstName}
              onChange={(e) => setOwnerFirstName(e.target.value)}
              placeholder="Alex"
              autoComplete="given-name"
              maxLength={40}
            />
          </Field>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-sm font-semibold text-ink">Trades</div>
              <div className="text-xs text-muted">First one is your primary.</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TRADES.map((t) => {
                const selected = trades.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setTrades(selected ? trades.filter((x) => x !== t.id) : [...trades, t.id])
                    }
                    aria-pressed={selected}
                    className={`pressable text-left rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                      selected
                        ? "border-indigo bg-indigobg text-indigo shadow-sm"
                        : "border-line bg-paper text-ink hover:bg-soft hover:border-ink/20"
                    }`}
                  >
                    <TradeIcon
                      trade={t.id}
                      size={18}
                      className={selected ? "text-indigo" : "text-muted"}
                    />
                    <span className="min-w-0 truncate">{t.label}</span>
                    {selected && <Check size={14} className="ml-auto text-indigo shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Service area" hint="City or ZIP.">
            <Input value={area} onChange={(e) => setArea(e.target.value)} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Contact email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
              />
            </Field>
            <Field label="Contact phone">
              <PhoneInput value={phone} onChange={(v) => setPhone(v)} />
            </Field>
          </div>
          {profileErr && (
            <div
              role="alert"
              className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2"
            >
              {profileErr}
            </div>
          )}
          <Btn
            variant="indigo"
            size="lg"
            className="w-full"
            loading={saving}
            disabled={!dirty || !business}
            onClick={saveProfile}
          >
            Save changes
          </Btn>
        </Card>
      </SectionScreen>
    ),

    google: (
      <SectionScreen title="Google Business" sub="Connect your listing so reviews land on Google.">
        <Card>
          <GoogleConnect
            proId={proId}
            pro={pro}
            onUpdated={(patch) => setPro({ ...pro, ...patch })}
            onToast={setToast}
          />
        </Card>
      </SectionScreen>
    ),

    payments: (
      <SectionScreen title="Payments" sub="Get paid through HomesBrain.">
        <Card>
          <StripePayoutsPanel
            proId={proId}
            prefs={prefs}
            onUpdated={(patch) => setPrefs((p) => (p ? { ...p, ...patch } : p))}
            onToast={setToast}
          />
        </Card>
      </SectionScreen>
    ),

    plan: (
      <SectionScreen title="Your plan" sub="Everything is included, free.">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-ink">Everything included: free</div>
              <div className="text-xs text-muted">
                Every HomesBrain feature is free for all pros right now. No card, no billing.
              </div>
            </div>
            <Pill accent="indigo">All included</Pill>
          </div>
          <div className="mt-4 rounded-xl border border-line bg-soft p-4">
            <div className="text-sm text-ink">
              <span className="font-semibold">
                Reviews, records, CRM, invoicing, rebooking, analytics:
              </span>{" "}
              all yours, no upgrade needed.
            </div>
          </div>
        </Card>
      </SectionScreen>
    ),

    language: (
      <SectionScreen title="Language" sub="The language HomesBrain shows you.">
        <Card>
          <SettingRow label="Display language">
            <LanguageToggle />
          </SettingRow>
        </Card>
      </SectionScreen>
    ),

    notifications: (
      <SectionScreen
        title="Notifications"
        sub="Service-due, review, and rebook alerts about your customers."
      >
        <Card>
          {prefs ? (
            <>
              <SettingRow label="Email" sub="Alerts to your contact email">
                <Toggle
                  checked={prefs.notify_email}
                  onChange={(v) => setPref("notify_email", v)}
                  label="Email notifications"
                />
              </SettingRow>
              <SettingRow label="Text messages" sub="Alerts by SMS">
                <Toggle
                  checked={prefs.notify_sms}
                  onChange={(v) => setPref("notify_sms", v)}
                  label="SMS notifications"
                />
              </SettingRow>
            </>
          ) : (
            <div className="space-y-3 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {prefErrBox}
          <p className="mt-3 text-xs text-muted">
            Delivery is mocked until SMS compliance clears. Your preferences persist now.
          </p>
        </Card>
      </SectionScreen>
    ),

    reviews: (
      <SectionScreen
        title="Review requests"
        sub="Every homeowner gets the same ask after a job. No gating."
      >
        <Card>
          {prefs ? (
            <SettingRow
              label="Ask for Google reviews"
              sub="Sent with the record, right after the job."
            >
              <Toggle
                checked={prefs.review_requests_on}
                onChange={(v) => setPref("review_requests_on", v)}
                label="Review requests"
              />
            </SettingRow>
          ) : (
            <Skeleton className="h-10 w-full" />
          )}
          {prefErrBox}
        </Card>
      </SectionScreen>
    ),

    referral: (
      <SectionScreen
        title="Referral"
        sub="Refer a pro in another trade. You both get paid when they log their first verified job."
      >
        <Card>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              aria-label="Your referral link"
              className="font-mono text-[13px]"
            />
            <Btn variant="indigo" onClick={copyReferral} className="shrink-0">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy"}
            </Btn>
          </div>
          <Link
            to="/pro/referral"
            className="mt-3 inline-block text-xs font-semibold text-indigo hover:underline"
          >
            See your referrals →
          </Link>
        </Card>
      </SectionScreen>
    ),

    account: (
      <SectionScreen title="Account" sub="Your sign-in and this device.">
        <Card>
          <SettingRow label="Email" sub={prefs?.email || "Not set"} />
          <SettingRow label="Session" sub="Signed in on this device">
            <Btn variant="secondary" size="sm" onClick={signOut}>
              <LogOut size={14} /> Sign out
            </Btn>
          </SettingRow>
        </Card>
      </SectionScreen>
    ),

    data: (
      <SectionScreen title="Your data" sub="It's yours. Take it or delete it.">
        <Card>
          <SettingRow label="Export my data" sub="Your profile, customers, and jobs as JSON">
            <Btn variant="secondary" size="sm" loading={exporting} onClick={exportData}>
              Download
            </Btn>
          </SettingRow>
          <DeleteAccountRow actor={`pro:${proId}`} onDeleted={signOut} />
        </Card>
      </SectionScreen>
    ),
  };

  /* ------- hub ------- */

  const stripeValue = !prefs?.stripe_account_id
    ? "Set up payments"
    : prefs.stripe_charges_enabled
      ? "Payments on"
      : "Finish setup on Stripe";

  return (
    <ProShell pro={pro} active="settings">
      {section ? (
        screens[section as SectionId]
      ) : (
        <div className="anim-fade-up max-w-xl mx-auto space-y-5">
          <h1 className="text-2xl tracking-tight">Settings</h1>

          <HubGroup title="Your business">
            <HubRow
              icon={Store}
              label="Business profile"
              value="Name, trades, and contact info"
              section="profile"
            />
            <HubRow
              icon={BadgeCheck}
              label="Google Business"
              value={pro.google_place_id ? "Connected" : "Not connected"}
              section="google"
            />
            <HubRow icon={CreditCard} label="Payments" value={stripeValue} section="payments" />
            <HubRow
              icon={Gift}
              label="Your plan"
              value="Everything included, free"
              section="plan"
            />
          </HubGroup>

          <HubGroup title="How HomesBrain talks to you">
            <HubRow icon={Globe} label="Language" section="language" />
            <HubRow
              icon={Bell}
              label="Notifications"
              value="Email and text alerts"
              section="notifications"
            />
            <HubRow
              icon={Star}
              label="Review requests"
              value={prefs ? (prefs.review_requests_on ? "On" : "Off") : undefined}
              section="reviews"
            />
          </HubGroup>

          <HubGroup title="More">
            <HubRow
              icon={Copy}
              label="Referral link"
              value="Refer a pro, get paid"
              section="referral"
            />
          </HubGroup>

          <HubGroup title="Account">
            <HubRow
              icon={ShieldCheck}
              label="Account"
              value={prefs?.email || undefined}
              section="account"
            />
            <HubRow icon={Download} label="Your data" value="Export or delete" section="data" />
          </HubGroup>

          <button
            type="button"
            onClick={signOut}
            className="pressable flex w-full items-center justify-center gap-2.5 rounded-2xl border border-line bg-paper px-4 py-3.5 text-[15px] font-semibold text-ink hover:bg-soft"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      )}

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </ProShell>
  );
}

function StripePayoutsPanel({
  proId,
  prefs,
  onUpdated,
  onToast,
}: {
  proId: string;
  prefs: ProPrefs | null;
  onUpdated: (patch: Partial<ProPrefs>) => void;
  onToast: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<null | "onboard" | "refresh">(null);
  const [err, setErr] = useState<string | null>(null);

  const connected = !!prefs?.stripe_account_id;
  const ready = !!prefs?.stripe_charges_enabled;

  // If Stripe redirected back with ?stripe=return or =refresh, pull the
  // latest status once so the UI flips from "Continue setup" to "Payments on".
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("stripe");
    if (!q || !prefs?.stripe_account_id) return;
    (async () => {
      try {
        const r = await refreshStripeStatus(proId);
        onUpdated({
          stripe_charges_enabled: r.stripe_charges_enabled,
          stripe_payouts_enabled: r.stripe_payouts_enabled,
          stripe_details_submitted: r.stripe_details_submitted,
        });
        if (r.stripe_charges_enabled) onToast("Payments on");
      } catch {
        /* ignore */
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete("stripe");
        window.history.replaceState({}, "", url.toString());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs?.stripe_account_id]);

  async function onConnect() {
    setBusy("onboard");
    setErr(null);
    try {
      const { url } = await startStripeOnboarding(proId);
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start onboarding.");
      setBusy(null);
    }
  }

  async function onRefresh() {
    setBusy("refresh");
    setErr(null);
    try {
      const r = await refreshStripeStatus(proId);
      onUpdated({
        stripe_charges_enabled: r.stripe_charges_enabled,
        stripe_payouts_enabled: r.stripe_payouts_enabled,
        stripe_details_submitted: r.stripe_details_submitted,
      });
      onToast(r.stripe_charges_enabled ? "Payments on" : "Still pending on Stripe");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't check status.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <SettingRow
        label="Payouts (Stripe)"
        sub={
          !connected
            ? "Get paid through HomesBrain. Test mode."
            : ready
              ? "Payments on. Test mode."
              : "Onboarding in progress on Stripe."
        }
      >
        {ready ? (
          <Pill accent="indigo">Payments on</Pill>
        ) : connected ? (
          <div className="flex items-center gap-2">
            <Pill accent="amber">Pending</Pill>
            <Btn variant="secondary" size="sm" loading={busy === "refresh"} onClick={onRefresh}>
              Check status
            </Btn>
            <Btn variant="indigo" size="sm" loading={busy === "onboard"} onClick={onConnect}>
              Continue
            </Btn>
          </div>
        ) : (
          <Btn variant="indigo" size="sm" loading={busy === "onboard"} onClick={onConnect}>
            Set up payments
          </Btn>
        )}
      </SettingRow>
      {err && (
        <div role="alert" className="mt-2 text-xs text-red bg-redbg rounded-lg px-3 py-2">
          {err}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        Powered by Stripe. HomesBrain never holds funds; payouts go straight to your bank.
      </p>
    </div>
  );
}
