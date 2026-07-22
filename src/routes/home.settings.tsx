import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import {
  Btn,
  Field,
  Input,
  KV,
  PageLoader,
  PhoneInput,
  SettingRow,
  Skeleton,
  Toast,
  Toggle,
} from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
import {
  DeleteAccountRow,
  downloadJson,
  LanguageSettingsSection,
  SettingsSection,
} from "@/components/settings";

export const Route = createFileRoute("/home/settings")({
  head: () => ({ meta: [{ title: "Settings - HomesBrain" }] }),
  component: HomeownerSettings,
});

/* What you hear about - stays client-side until per-type columns exist. */
type LocalPrefs = { reminders: boolean; new_records: boolean };
const PREFS_KEY = "hb_homeowner_prefs";
const DEFAULT_PREFS: LocalPrefs = { reminders: true, new_records: true };

function loadLocalPrefs(): LocalPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as LocalPrefs) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

const LOCAL_PREF_ITEMS: { key: keyof LocalPrefs; label: string; sub: string }[] = [
  {
    key: "reminders",
    label: "Service reminders",
    sub: "When something on your home is due for service.",
  },
  { key: "new_records", label: "New records", sub: "When a pro logs a job on your home." },
];

/* DB-backed notification and privacy preferences. */
type DbPrefs = {
  notify_email: boolean;
  notify_sms: boolean;
  sms_opt_out: boolean;
  respect_quiet_hrs: boolean;
  marketing_consent: boolean;
  promo_sms_consent: boolean;
};


function HomeownerSettings() {
  const navigate = useNavigate();
  const {
    homeownerId,
    homeowner,
    setHomeowner,
    home,
    homes,
    jobs: hookJobs,
    loading: guardLoading,
  } = useHomeownerGuard();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [localPrefs, setLocalPrefs] = useState<LocalPrefs>(DEFAULT_PREFS);
  const [prefs, setPrefs] = useState<DbPrefs | null>(null);
  const [prefErr, setPrefErr] = useState<string | null>(null);
  const [proCount, setProCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [smsSavedAt, setSmsSavedAt] = useState<string | null>(null);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsErr, setSmsErr] = useState<string | null>(null);

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  useEffect(() => {
    if (!homeowner) return;
    setName(homeowner.name ?? "");
    setPhone(homeowner.phone ?? "");
    setEmail(homeowner.email ?? "");
    setLocalPrefs(loadLocalPrefs());
    const ho = homeowner as unknown as { sms_consent_at?: string | null };
    setSmsPhone(homeowner.phone ?? "");
    setSmsConsent(!!ho.sms_consent_at);
    setSmsSavedAt(ho.sms_consent_at ?? null);
  }, [homeowner]);

  useEffect(() => {
    if (!homeowner) return;
    // Prefs live on the homeowner row; get_home_view returns the full row.
    const ho = homeowner as unknown as DbPrefs & {
      notify_email: boolean;
      sms_consent_at?: string | null;
      promo_sms_consent?: boolean;
    };
    setPrefs({
      notify_email: ho.notify_email ?? true,
      notify_sms: !!ho.sms_consent_at,
      sms_opt_out: ho.sms_opt_out ?? false,
      respect_quiet_hrs: ho.respect_quiet_hrs ?? true,
      marketing_consent: ho.marketing_consent ?? false,
      promo_sms_consent: ho.promo_sms_consent ?? false,
    });
  }, [homeowner]);


  useEffect(() => {
    // Distinct-pro count from hook jobs.
    setProCount(new Set(hookJobs.map((j) => j.pro_id)).size);
  }, [hookJobs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveContact() {
    if (!homeowner || !homeownerId) return;
    setSaving(true);
    setProfileErr(null);
    const { error } = await supabase.rpc("homeowner_update_profile", {
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_email: email.trim(),
    });
    if (error) {
      setProfileErr(error.message || "Couldn't save. Try again.");
    } else {
      setHomeowner({
        ...homeowner,
        name: name.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      setToast("Profile saved");
    }
    setSaving(false);
  }

  function toggleLocalPref(key: keyof LocalPrefs) {
    const next = { ...localPrefs, [key]: !localPrefs[key] };
    setLocalPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  /* Optimistic toggle: flip first, revert on failure. */
  async function setPref(key: keyof DbPrefs, value: boolean) {
    if (!prefs || !homeownerId) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setPrefErr(null);
    const params = { [`p_${key}`]: value } as {
      p_notify_email?: boolean;
      p_notify_sms?: boolean;
      p_sms_opt_out?: boolean;
      p_respect_quiet_hrs?: boolean;
      p_marketing_consent?: boolean;
      p_promo_sms_consent?: boolean;
    };
    const { error } = await supabase.rpc("homeowner_update_profile", params);

    if (error) {
      setPrefs(prev);
      setPrefErr("Couldn't save that change. Try again.");
      return;
    }
    if (key === "notify_sms") {
      const validPhone = (homeowner?.phone ?? "").replace(/\D/g, "").length === 10;
      const now = value && validPhone ? new Date().toISOString() : null;
      await supabase.from("homeowners").update({ sms_consent_at: now }).eq("id", homeownerId);
      setSmsSavedAt(now);
      setSmsConsent(!!now);
    }
    if (key === "sms_opt_out") {
      await logEvent(`homeowner:${homeownerId}`, value ? "sms_opted_out" : "sms_opted_in", {});
    }
  }

  async function saveSmsConsent() {
    if (!homeowner || !homeownerId) return;
    setSmsErr(null);
    const trimmed = smsPhone.trim();
    if (smsConsent && !trimmed) {
      setSmsErr("Enter a mobile number to opt in.");
      return;
    }
    setSmsSaving(true);
    const now = new Date().toISOString();
    const patch: { phone?: string; sms_consent_at: string | null } = smsConsent
      ? { phone: trimmed, sms_consent_at: now }
      : { sms_consent_at: null };
    const { error } = await supabase.from("homeowners").update(patch).eq("id", homeownerId);
    if (error) {
      setSmsErr(error.message || "Couldn't save. Try again.");
      setSmsSaving(false);
      return;
    }
    setSmsSavedAt(smsConsent ? now : null);
    if (smsConsent) {
      setHomeowner({ ...homeowner, phone: trimmed });
      setPhone(trimmed);
    }
    await logEvent(
      `homeowner:${homeownerId}`,
      smsConsent ? "sms_web_opted_in" : "sms_web_opted_out",
      {},
    );
    setToast(smsConsent ? "You're opted in for texts" : "Text consent removed");
    setSmsSaving(false);
  }

  async function exportData() {
    if (!homeownerId) return;
    setExporting(true);
    const { data } = await supabase.rpc("get_home_view");
    downloadJson(
      `homesbrain-home-record-${new Date().toISOString().slice(0, 10)}.json`,
      data ?? {},
    );
    await logEvent(`homeowner:${homeownerId}`, "data_exported", { kind: "homeowner" });
    setExporting(false);
    setToast("Your record downloaded");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (guardLoading) return <PageLoader label="Loading settings" />;
  if (!home) return <PageLoader label="Setting up your home" />;

  const optedOut = prefs?.sms_opt_out ?? false;

  return (
    <HomeShell active="settings" homeowner={homeowner} home={home}>
      <HomePageHead
        eyebrow="Settings"
        title="Your account"
        sub="How we reach you, and what's yours to keep."
      />

      <div className="mx-auto max-w-2xl space-y-3">
        <SettingsSection id="profile" eyebrow="Profile" delay={1} collapsible defaultOpen>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Ellis"
              />
            </Field>
            <Field label="Phone">
              <PhoneInput value={phone} onChange={(v) => setPhone(v)} />
            </Field>
            <Field label="Email">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="jordan@example.com"
              />
            </Field>
          </div>
          {profileErr && (
            <div
              role="alert"
              className="anim-fade-in mt-3 text-sm text-red bg-redbg rounded-xl px-3 py-2"
            >
              {profileErr}
            </div>
          )}
          <div className="mt-4">
            <Btn variant="indigo" loading={saving} onClick={saveContact}>
              Save
            </Btn>
          </div>
        </SettingsSection>

        <LanguageSettingsSection delay={2} collapsible />

        <SettingsSection id="notifications" eyebrow="Notifications" delay={2} collapsible>
          {prefs ? (
            <>
              <div className="mt-3">
                <SettingRow label="Email" sub="Reminders and records to your inbox">
                  <Toggle
                    checked={prefs.notify_email}
                    onChange={(v) => setPref("notify_email", v)}
                    label="Email notifications"
                  />
                </SettingRow>
                <SettingRow
                  label="Text messages"
                  sub={
                    optedOut
                      ? "Paused - you've stopped all texts below"
                      : "Reminders and records by text"
                  }
                >
                  <Toggle
                    checked={prefs.notify_sms && !optedOut}
                    onChange={(v) => setPref("notify_sms", v)}
                    label="Text notifications"
                    disabled={optedOut}
                  />
                </SettingRow>
                <p className="px-1 pb-3 -mt-1 text-xs text-muted leading-relaxed">
                  By turning this on, I agree to receive recurring automated service and reminder
                  text messages from HomesBrain at the mobile number on my profile. Consent is not a
                  condition of any purchase or service. Msg &amp; data rates may apply. Message
                  frequency varies. Reply STOP to opt out, HELP for help. See our{" "}
                  <Link to="/privacy" className="font-semibold text-indigo hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/messaging-terms" className="font-semibold text-indigo hover:underline">
                    Messaging Terms
                  </Link>
                  .
                </p>
              </div>

              <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                What you hear about
              </div>
              <div className="mt-1">
                {LOCAL_PREF_ITEMS.map(({ key, label, sub }) => (
                  <SettingRow key={key} label={label} sub={sub}>
                    <Toggle
                      checked={localPrefs[key]}
                      onChange={() => toggleLocalPref(key)}
                      label={label}
                    />
                  </SettingRow>
                ))}
              </div>

              {/* Compliance controls stay loud on purpose. */}
              <div
                className={`mt-5 rounded-xl border p-4 transition-colors duration-200 ${
                  optedOut ? "border-red/25 bg-redbg/60" : "border-line bg-soft"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">Stop all texts</div>
                    <div className="text-xs text-muted mt-0.5">
                      Same as replying STOP. Every text from us ends immediately.
                    </div>
                  </div>
                  <Toggle
                    checked={optedOut}
                    onChange={(v) => setPref("sms_opt_out", v)}
                    label="Stop all texts"
                    accent="red"
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-line/70 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">Quiet hours</div>
                    <div className="text-xs text-muted mt-0.5">
                      Only text between 8am and 9pm your time.
                    </div>
                  </div>
                  <Toggle
                    checked={prefs.respect_quiet_hrs}
                    onChange={(v) => setPref("respect_quiet_hrs", v)}
                    label="Quiet hours"
                  />
                </div>
              </div>

              {/* Web SMS opt-in: unchecked by default, records timestamp. */}
              <div className="mt-5 rounded-xl border border-line bg-white p-4">
                <div className="text-sm font-semibold text-ink">Text updates from HomesBrain</div>
                <div className="mt-3 space-y-3">
                  <Field label="Mobile number (for text updates)">
                    <PhoneInput value={smsPhone} onChange={setSmsPhone} />
                  </Field>
                  <label className="flex items-start gap-2 text-xs text-muted leading-relaxed">
                    <input
                      type="checkbox"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Text me my service records and reminders. By checking this box, I agree to
                      receive recurring automated service and reminder text messages from HomesBrain
                      at the number I provide. Consent is not a condition of any purchase or
                      service. Msg &amp; data rates may apply. Message frequency varies. Reply STOP
                      to opt out, HELP for help. See our{" "}
                      <Link to="/privacy" className="font-semibold text-indigo hover:underline">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link
                        to="/messaging-terms"
                        className="font-semibold text-indigo hover:underline"
                      >
                        Messaging Terms
                      </Link>
                      .
                    </span>
                  </label>
                  {smsErr && (
                    <div role="alert" className="text-sm text-red bg-redbg rounded-xl px-3 py-2">
                      {smsErr}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted">
                      {smsSavedAt
                        ? `Opted in ${formatDate(smsSavedAt)}`
                        : "Unchecked by default. Opt in only if you want texts."}
                    </div>
                    <Btn variant="indigo" size="sm" loading={smsSaving} onClick={saveSmsConsent}>
                      Save
                    </Btn>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {prefErr && (
            <div
              role="alert"
              className="anim-fade-in mt-3 text-sm text-red bg-redbg rounded-xl px-3 py-2"
            >
              {prefErr}
            </div>
          )}
        </SettingsSection>

        <SettingsSection id="myhome" eyebrow="My home" delay={3} collapsible>
          <div className="mt-2">
            <KV k="Address" v={home.address} mono={false} />
            {home.claimed_at && <KV k="Claimed" v={formatDate(home.claimed_at)} />}
            <KV k="Homes on your account" v={`${homes.length || 1} claimed`} mono={false} />
            <KV k="Your plan" v="Free for life" mono={false} />
          </div>
          <p className="mt-3 text-sm text-muted">
            This record sells as a $49 seller history report when homes change hands. Yours is free
            for life because your pros write it. Every claimed home linked to your account appears
            on your Profile.
          </p>
        </SettingsSection>

        <SettingsSection id="mypros" eyebrow="My pros" delay={4} collapsible>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-ink">
                {proCount === null
                  ? "…"
                  : proCount === 0
                    ? "No pros yet"
                    : `${proCount} pro${proCount === 1 ? "" : "s"} on your home`}
              </div>
              <div className="text-xs text-muted mt-0.5">
                Everyone who has logged a job on your record.
              </div>
            </div>
            <Link to="/home/pros">
              <Btn variant="secondary" size="sm">
                Manage
              </Btn>
            </Link>
          </div>
        </SettingsSection>

        <SettingsSection id="privacy" eyebrow="Data & privacy" collapsible>
          <div className="mt-3">
            <SettingRow
              label="Export my record"
              sub="Your home, equipment, and job history as JSON"
            >
              <Btn variant="secondary" size="sm" loading={exporting} onClick={exportData}>
                Download
              </Btn>
            </SettingRow>
            <SettingRow
              label="Record links"
              sub="Anyone with a record link can view that job. Sharing controls come later."
            />
            {prefs ? (
              <>
                <SettingRow
                  label="Product news (email)"
                  sub="Occasional updates and offers by email. Off by default."
                >
                  <Toggle
                    checked={prefs.marketing_consent}
                    onChange={(v) => setPref("marketing_consent", v)}
                    label="Marketing consent"
                  />
                </SettingRow>
                <SettingRow
                  label="Promotional texts"
                  sub={
                    prefs.promo_sms_consent
                      ? "You'll get occasional offers by text. Reply STOP any time."
                      : "Off by default. Opt in to get occasional offers by text."
                  }
                >
                  <Toggle
                    checked={prefs.promo_sms_consent}
                    onChange={(v) => setPref("promo_sms_consent", v)}
                    label="Promotional SMS consent"
                    accent="coral"
                  />
                </SettingRow>
                <p className="px-1 pb-3 -mt-1 text-xs text-muted leading-relaxed">
                  By turning this on, I agree to receive recurring automated promotional text
                  messages from HomesBrain at the mobile number on my profile. Consent is not a
                  condition of any purchase or service. Msg &amp; data rates may apply. Message
                  frequency varies. Reply STOP to opt out, HELP for help. See our{" "}
                  <Link to="/privacy" className="font-semibold text-indigo hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/messaging-terms" className="font-semibold text-indigo hover:underline">
                    Messaging Terms
                  </Link>
                  .
                </p>
              </>
            ) : (
              <Skeleton className="h-10 w-full my-2" />
            )}

            <DeleteAccountRow actor={`homeowner:${homeownerId}`} onDeleted={signOut} />
          </div>
        </SettingsSection>

        <SettingsSection id="account" eyebrow="Account & security" collapsible>
          <div className="mt-3">
            <SettingRow label="Email" sub={homeowner?.email || "Not set"} />
            <AccountPasswordRow onDone={(msg) => setToast(msg)} />
            <AccountGoogleRow onDone={(msg) => setToast(msg)} />
            <SettingRow label="Session" sub="Signed in on this device">
              <Btn variant="secondary" size="sm" onClick={signOut}>
                <LogOut size={14} /> Sign out
              </Btn>
            </SettingRow>
          </div>
        </SettingsSection>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </HomeShell>
  );
}

/* Optional: add a password so the homeowner can also sign in with email +
   password later. Magic link still works either way. */
function AccountPasswordRow({ onDone }: { onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const identities = data.user?.identities ?? [];
      setHasPassword(identities.some((i) => i.provider === "email"));
    })();
  }, []);

  async function save() {
    setErr(null);
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { has_password: true },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setPw("");
    setConfirm("");
    setOpen(false);
    setHasPassword(true);
    onDone("Password set - you can now sign in with email + password too.");
  }

  const label = hasPassword === false ? "Add a password" : "Change password";
  const sub =
    hasPassword === false
      ? "Optional. You can keep using the magic link instead."
      : "Update the password on your account.";

  return (
    <>
      <SettingRow label={label} sub={sub}>
        <Btn variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : hasPassword === false ? "Add" : "Change"}
        </Btn>
      </SettingRow>
      {open && (
        <div className="anim-fade-in mt-2 space-y-3 rounded-xl border border-line bg-soft p-4">
          <Field label="New password">
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </Field>
          <Field label="Confirm">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          {err && (
            <div role="alert" className="text-sm text-red bg-redbg rounded-xl px-3 py-2">
              {err}
            </div>
          )}
          <Btn variant="indigo" size="sm" loading={busy} onClick={save}>
            Save password
          </Btn>
        </div>
      )}
    </>
  );
}

/* Optional: link a Google identity so the homeowner can also sign in with
   Google later. Magic link still works either way. */
function AccountGoogleRow({ onDone }: { onDone: (msg: string) => void }) {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const identities = data.user?.identities ?? [];
      setLinked(identities.some((i) => i.provider === "google"));
    })();
  }, []);

  async function link() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    // Redirect happens; keep busy state.
    onDone("Google linked.");
  }

  return (
    <SettingRow
      label="Google sign-in"
      sub={linked ? "Google connected." : "Optional. Sign in with one tap next time."}
    >
      {linked ? (
        <span className="text-xs font-semibold text-muted">Connected</span>
      ) : (
        <Btn variant="secondary" size="sm" loading={busy} onClick={link}>
          Link Google
        </Btn>
      )}
      {err && (
        <div role="alert" className="mt-2 text-sm text-red bg-redbg rounded-xl px-3 py-2">
          {err}
        </div>
      )}
    </SettingRow>
  );
}
