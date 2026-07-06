import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Btn, Field, Input, KV, PageLoader, SettingRow, Skeleton, Toast, Toggle } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { HomePageHead, HomeShell, useHomeownerGuard } from "@/components/home-shell";
import {
  DeleteAccountRow,
  downloadJson,
  SettingsNav,
  SettingsSection,
} from "@/components/settings";
import { clearSession } from "@/lib/session";

export const Route = createFileRoute("/home/settings")({
  head: () => ({ meta: [{ title: "Settings - HomesBrain" }] }),
  component: HomeownerSettings,
});

/* What you hear about - stays client-side until per-type columns exist. */
type LocalPrefs = { reminders: boolean; recalls: boolean; new_records: boolean };
const PREFS_KEY = "hb_homeowner_prefs";
const DEFAULT_PREFS: LocalPrefs = { reminders: true, recalls: true, new_records: true };

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
  { key: "recalls", label: "Recall alerts", sub: "If an item on file is recalled." },
  { key: "new_records", label: "New records", sub: "When a pro logs a job on your home." },
];

/* DB-backed notification and privacy preferences. */
type DbPrefs = {
  notify_email: boolean;
  notify_sms: boolean;
  sms_opt_out: boolean;
  respect_quiet_hrs: boolean;
  marketing_consent: boolean;
};

const NAV = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "myhome", label: "My home" },
  { id: "mypros", label: "My pros" },
  { id: "privacy", label: "Data & privacy" },
  { id: "account", label: "Account & security" },
];

function HomeownerSettings() {
  const navigate = useNavigate();
  const { homeownerId, homeowner, setHomeowner, home, loading: guardLoading } = useHomeownerGuard();
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

  useEffect(() => {
    if (!guardLoading && !home) navigate({ to: "/home" });
  }, [guardLoading, home, navigate]);

  useEffect(() => {
    if (!homeowner) return;
    setName(homeowner.name ?? "");
    setPhone(homeowner.phone ?? "");
    setEmail(homeowner.email ?? "");
    setLocalPrefs(loadLocalPrefs());
  }, [homeowner]);

  useEffect(() => {
    if (!homeowner) return;
    // Prefs live on the homeowner row; get_home_view returns the full row.
    const ho = homeowner as unknown as DbPrefs & { notify_email: boolean };
    setPrefs({
      notify_email: ho.notify_email ?? true,
      notify_sms: ho.notify_sms ?? true,
      sms_opt_out: ho.sms_opt_out ?? false,
      respect_quiet_hrs: ho.respect_quiet_hrs ?? true,
      marketing_consent: ho.marketing_consent ?? false,
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
      p_homeowner_id: homeownerId,
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
    const params: Record<string, unknown> = { p_homeowner_id: homeownerId };
    params[`p_${key}`] = value;
    const { error } = await supabase.rpc(
      "homeowner_update_profile",
      params as unknown as { p_homeowner_id: string },
    );
    if (error) {
      setPrefs(prev);
      setPrefErr("Couldn't save that change. Try again.");
      return;
    }
    if (key === "sms_opt_out") {
      await logEvent(`homeowner:${homeownerId}`, value ? "sms_opted_out" : "sms_opted_in", {});
    }
  }

  async function exportData() {
    if (!homeownerId) return;
    setExporting(true);
    // Reuse the public home view for a full JSON export.
    const { data } = await supabase.rpc("get_home_view", { p_homeowner_id: homeownerId });
    downloadJson(
      `homesbrain-home-record-${new Date().toISOString().slice(0, 10)}.json`,
      data ?? {},
    );
    await logEvent(`homeowner:${homeownerId}`, "data_exported", { kind: "homeowner" });
    setExporting(false);
    setToast("Your record downloaded");
  }

  function signOut() {
    clearSession();
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

      <div className="lg:grid lg:grid-cols-[170px_1fr] lg:gap-8 items-start">
        <SettingsNav items={NAV} />

        <div className="space-y-5 min-w-0">
          <SettingsSection id="profile" eyebrow="Profile" delay={1}>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Ellis"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="904-555-0182"
                />
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

          <SettingsSection id="notifications" eyebrow="Notifications" delay={2}>
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

          <SettingsSection id="myhome" eyebrow="My home" delay={3}>
            <div className="mt-2">
              <KV k="Address" v={home.address} mono={false} />
              {home.claimed_at && <KV k="Claimed" v={formatDate(home.claimed_at)} />}
              <KV k="Your plan" v="Free for life" mono={false} />
            </div>
            <p className="mt-3 text-sm text-muted">
              This record sells as a $49 seller history report when homes change hands. Yours is
              free for life because your pros write it. Own more than one home? Multi-home support
              is coming.
            </p>
          </SettingsSection>

          <SettingsSection id="mypros" eyebrow="My pros" delay={4}>
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

          <SettingsSection id="privacy" eyebrow="Data & privacy">
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
                <SettingRow
                  label="Product news"
                  sub="Occasional updates and offers. Off by default."
                >
                  <Toggle
                    checked={prefs.marketing_consent}
                    onChange={(v) => setPref("marketing_consent", v)}
                    label="Marketing consent"
                  />
                </SettingRow>
              ) : (
                <Skeleton className="h-10 w-full my-2" />
              )}
              <DeleteAccountRow actor={`homeowner:${homeownerId}`} onDeleted={signOut} />
            </div>
          </SettingsSection>

          <SettingsSection id="account" eyebrow="Account & security">
            <div className="mt-3">
              <SettingRow label="Email" sub={homeowner?.email || "Not set"} />
              <SettingRow label="Session" sub="Signed in on this device">
                <Btn variant="secondary" size="sm" onClick={signOut}>
                  <LogOut size={14} /> Sign out
                </Btn>
              </SettingRow>
            </div>
          </SettingsSection>
        </div>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </HomeShell>
  );
}
