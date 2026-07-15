import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, LogOut } from "lucide-react";
import { Avatar, Btn, Field, Input, PhoneInput, Pill, SettingRow, Skeleton, Toast, Toggle } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, TRADES, proTrades } from "@/lib/hb";
import { TradeIcon } from "@/components/svg";
import { GoogleConnect } from "@/components/google-connect";
import { ProPageHead, ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import {
  DeleteAccountRow,
  downloadJson,
  SettingsNav,
  SettingsSection,
} from "@/components/settings";
import { refreshStripeStatus, startStripeOnboarding } from "@/lib/stripe-connect";
import { LanguageToggle } from "@/lib/i18n";

import { DemoNotice } from "@/components/plan-lock";

export const Route = createFileRoute("/pro/settings")({
  head: () => ({ meta: [{ title: "Settings - HomesBrain" }] }),
  component: ProSettings,
});

/* Settings columns beyond what useProGuard fetches. */
type ProPrefs = {
  email: string | null;
  phone: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  review_requests_on: boolean;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  quickbooks_connected: boolean;
  jobber_connected: boolean;
  square_connected: boolean;
};

const NAV = [
  { id: "profile", label: "Business profile" },
  { id: "language", label: "Language" },
  { id: "google", label: "Google Business" },
  { id: "plan", label: "Plan & billing" },
  { id: "notifications", label: "Notifications" },
  { id: "reviews", label: "Review requests" },
  { id: "integrations", label: "Integrations" },
  { id: "referral", label: "Referral" },
  { id: "account", label: "Account & security" },
  { id: "data", label: "Your data" },
];

const INTEGRATIONS = [
  { key: "quickbooks_connected", label: "QuickBooks", sub: "Sync jobs to invoices" },
  { key: "jobber_connected", label: "Jobber", sub: "Pull jobs in automatically" },
  { key: "square_connected", label: "Square", sub: "Payments and customers" },
] as const;

function ProSettings() {
  const navigate = useNavigate();
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
  const [planLock, setPlanLock] = useState<{
    founding_member: boolean;
    locked_price: number | null;
  } | null>(null);
  const [slots, setSlots] = useState<{ taken: number; cap: number; remaining: number } | null>(
    null,
  );

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data } = await supabase
        .from("pros")
        .select(
          "email,phone,notify_email,notify_sms,review_requests_on,stripe_account_id,stripe_charges_enabled,stripe_payouts_enabled,stripe_details_submitted,quickbooks_connected,jobber_connected,square_connected,founding_member,locked_price",
        )
        .eq("id", proId)
        .maybeSingle();
      if (data) {
        setPrefs(data as ProPrefs);
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
        setPlanLock({
          founding_member: !!(data as { founding_member?: boolean }).founding_member,
          locked_price: (data as { locked_price?: number | null }).locked_price ?? null,
        });
      }
      const { data: sl } = await supabase.rpc("founding_slots");
      if (sl) setSlots(sl as { taken: number; cap: number; remaining: number });
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
    trades.length !== currentTrades.length ||
    trades.some((t, i) => t !== currentTrades[i]);

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
    key: "notify_email" | "notify_sms" | "review_requests_on",
    value: boolean,
  ) {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setPrefErr(null);
    const { data, error } = await supabase
      .from("pros")
      .update({ [key]: value } as Partial<Record<typeof key, boolean>>)
      .eq("id", proId!)
      .select("id");
    if (error || !data?.length) {
      setPrefs(prev);
      setPrefErr("Couldn't save that change. Try again.");
    }
  }

  async function upgradeInterest() {
    await logEvent(`pro:${proId}`, "upgrade_interest", { plan: "pro" });
    setToast("Noted. We'll reach out when Pro billing opens");
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

  return (
    <ProShell pro={pro} active="settings">
      <ProPageHead
        eyebrow="Settings"
        title="Settings"
        sub="Your business, your preferences, your data."
      />

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8 items-start">
        <SettingsNav items={NAV} />

        <div className="space-y-5 max-w-2xl min-w-0">
          <SettingsSection id="profile" eyebrow="Business profile" delay={1}>
            <p className="mt-1 text-sm text-muted">What homeowners see on every record you send.</p>
            <div className="mt-4 space-y-4">
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
                  <div className="text-xs text-muted">
                    Pick every trade you offer. First one is your primary.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TRADES.map((t) => {
                    const selected = trades.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setTrades(
                            selected ? trades.filter((x) => x !== t.id) : [...trades, t.id],
                          )
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
                  <PhoneInput
                    value={phone}
                    onChange={(v) => setPhone(v)}
                  />
                </Field>
              </div>
              <Field label="Logo">
                <div className="flex items-center gap-3">
                  <Avatar name={business || "?"} accent="indigo" />
                  <div className="text-xs text-muted">
                    Using initials for now. Upload comes later.
                  </div>
                </div>
              </Field>
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
            </div>
          </SettingsSection>

          <SettingsSection id="language" eyebrow="Language" delay={2}>
            <div className="mt-3">
              <SettingRow label="Display language" sub="The language HomesBrain shows you.">
                <LanguageToggle />
              </SettingRow>
            </div>
          </SettingsSection>

          <SettingsSection id="google" eyebrow="Google Business" delay={2}>
            <GoogleConnect
              proId={proId}
              pro={pro}
              onUpdated={(patch) => setPro({ ...pro, ...patch })}
              onToast={setToast}
            />
          </SettingsSection>

          <SettingsSection id="plan" eyebrow="Plan & billing" delay={3}>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-ink">Everything included — free</div>
                <div className="text-xs text-muted">
                  Every HomesBrain feature is free for all pros right now. No card, no billing.
                </div>
              </div>
              <Pill accent="indigo">All included</Pill>
            </div>
            <div className="mt-4 rounded-xl border border-line bg-soft p-4">
              <div className="text-sm text-ink">
                <span className="font-semibold">Reviews, records, CRM, invoicing, rebooking, analytics</span>{" "}
                — all yours, no upgrade needed.
              </div>
              <div className="mt-2">
                <Link
                  to="/pro/plan"
                  className="text-sm font-semibold text-indigo hover:underline"
                >
                  View plan details →
                </Link>
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <StripePayoutsPanel
                proId={proId!}
                prefs={prefs}
                onUpdated={(patch) => setPrefs((p) => (p ? { ...p, ...patch } : p))}
                onToast={setToast}
              />
            </div>
          </SettingsSection>



          <SettingsSection id="notifications" eyebrow="Notifications" delay={4}>
            <p className="mt-1 text-sm text-muted">
              Service-due, review, and rebook alerts about your customers.
            </p>
            <div className="mt-3">
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
            </div>
            {prefErr && (
              <div
                role="alert"
                className="anim-fade-in mt-3 text-sm text-red bg-redbg rounded-xl px-3 py-2"
              >
                {prefErr}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Delivery is mocked until SMS compliance clears. Your preferences persist now.
            </p>
          </SettingsSection>

          <SettingsSection id="reviews" eyebrow="Review requests">
            <div className="mt-3">
              {prefs ? (
                <SettingRow
                  label="Ask for Google reviews"
                  sub="Every homeowner gets the same ask after a job. No gating."
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
            </div>
            <p className="mt-3 text-xs text-muted">
              Sent with the record, right after the job. Timing options come later.
            </p>
          </SettingsSection>

          <SettingsSection id="integrations" eyebrow="Integrations">
            <div className="mt-3">
              {INTEGRATIONS.map(({ key, label, sub }) => (
                <SettingRow key={key} label={label} sub={prefs?.[key] ? "Connected" : sub}>
                  <Pill accent="ink">Coming soon</Pill>
                </SettingRow>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection id="referral" eyebrow="Referral">
            <p className="mt-1 text-sm text-muted">
              Refer a pro in another trade. You both get paid when they log their first verified
              job.
            </p>
            <div className="mt-3 flex gap-2">
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
          </SettingsSection>

          <SettingsSection id="account" eyebrow="Account & security">
            <div className="mt-3">
              <SettingRow label="Email" sub={prefs?.email || "Not set"} />
              <SettingRow label="Session" sub="Signed in on this device">
                <Btn variant="secondary" size="sm" onClick={signOut}>
                  <LogOut size={14} /> Sign out
                </Btn>
              </SettingRow>
            </div>
          </SettingsSection>

          <SettingsSection id="data" eyebrow="Your data">
            <div className="mt-3">
              <SettingRow label="Export my data" sub="Your profile, customers, and jobs as JSON">
                <Btn variant="secondary" size="sm" loading={exporting} onClick={exportData}>
                  Download
                </Btn>
              </SettingRow>
              <DeleteAccountRow actor={`pro:${proId}`} onDeleted={signOut} />
            </div>
          </SettingsSection>
        </div>
      </div>

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

