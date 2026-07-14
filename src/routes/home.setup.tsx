import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Btn, Field, Input, PageLoader, PhoneInput, Pill, SettingRow, Toggle } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, phoneDigits } from "@/lib/hb";
import { Logo } from "@/components/svg";
import { useHomeownerGuard } from "@/components/home-shell";

/* Homeowner setup wizard, the /pro/setup pattern for the other side of the
   loop. Only account-critical items live here (name, password, contact +
   consent, home confirm). Trust-gated items (appliances, inviting pros)
   stay as the checklist card on /home. Password step is skippable and is
   hidden entirely for Google-auth users. */

const ALL_STEPS = ["name", "password", "contact", "home"] as const;
type StepKey = (typeof ALL_STEPS)[number];

type SetupSearch = { step?: StepKey };

export const Route = createFileRoute("/home/setup")({
  head: () => ({ meta: [{ title: "Finish setting up - HomesBrain" }] }),
  validateSearch: (raw: Record<string, unknown>): SetupSearch => {
    const s = raw.step;
    return { step: ALL_STEPS.includes(s as StepKey) ? (s as StepKey) : undefined };
  },
  component: HomeSetupWizard,
});

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function HomeSetupWizard() {
  const navigate = useNavigate();
  const { step: initialStep } = Route.useSearch();
  const { homeowner, home, loading: guardLoading } = useHomeownerGuard();

  const [userLoading, setUserLoading] = useState(true);
  const [isGoogle, setIsGoogle] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notifySms, setNotifySms] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [quietHrs, setQuietHrs] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const [stepIdx, setStepIdx] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const steps = useMemo<StepKey[]>(
    () => (isGoogle ? ALL_STEPS.filter((s) => s !== "password") : [...ALL_STEPS]),
    [isGoogle],
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      setIsGoogle(u?.app_metadata?.provider === "google");
      setHasPassword(u?.user_metadata?.has_password === true);
      setUserLoading(false);
    })();
  }, []);

  // Prefill and jump to the first incomplete step once both loads settle.
  useEffect(() => {
    if (guardLoading || userLoading || initialized || !homeowner) return;
    setName((homeowner.name ?? "").trim());
    setPhone((homeowner.phone ?? "").trim());
    setEmail((homeowner.email ?? "").trim());
    setNotifySms(homeowner.notify_sms ?? false);
    setNotifyEmail(homeowner.notify_email ?? true);
    setQuietHrs(homeowner.respect_quiet_hrs ?? true);
    setMarketing(homeowner.marketing_consent ?? false);

    const keys: StepKey[] = isGoogle ? ALL_STEPS.filter((s) => s !== "password") : [...ALL_STEPS];
    const done: Record<StepKey, boolean> = {
      name: !!homeowner.name?.trim(),
      password: isGoogle || hasPassword,
      contact: !!homeowner.contact_confirmed_at,
      home: !!homeowner.setup_completed_at,
    };
    const firstIncomplete = keys.findIndex((k) => !done[k]);
    const firstIncompleteIdx = firstIncomplete === -1 ? keys.length - 1 : firstIncomplete;
    // Only honor a URL step up to the first incomplete step: an earlier or
    // equal step is fine, but a later one (e.g. ?step=home skipping contact)
    // is clamped back so Done can't stamp setup_completed_at with nothing
    // actually persisted.
    let idx = firstIncompleteIdx;
    if (initialStep && keys.includes(initialStep)) {
      idx = Math.min(keys.indexOf(initialStep), firstIncompleteIdx);
    }
    setStepIdx(Math.max(0, idx));
    setInitialized(true);
  }, [guardLoading, userLoading, initialized, homeowner, isGoogle, hasPassword, initialStep]);

  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const isLast = stepIdx === steps.length - 1;

  const validPhone = phoneDigits(phone).length === 10;
  const validEmail = isValidEmail(email.trim());
  const reachable = (validPhone && notifySms) || (validEmail && notifyEmail);

  const canAdvance = useMemo(() => {
    switch (step) {
      case "name":
        return name.trim().length > 1;
      case "password":
        return password.length >= 8;
      case "contact":
        return (
          (phone.trim() === "" || validPhone) && (email.trim() === "" || validEmail) && reachable
        );
      case "home":
        return true;
      default:
        return true;
    }
  }, [step, name, password, phone, email, validPhone, validEmail, reachable]);

  async function persistCurrent(): Promise<boolean> {
    setSaving(true);
    setErr(null);
    try {
      switch (step) {
        case "name": {
          const { error } = await supabase.rpc("homeowner_update_profile", {
            p_name: name.trim(),
          });
          if (error) throw error;
          break;
        }
        case "password": {
          const { error } = await supabase.auth.updateUser({
            password,
            data: { has_password: true },
          });
          if (error) throw error;
          setHasPassword(true);
          break;
        }
        case "contact": {
          const { error } = await supabase.rpc("homeowner_update_profile", {
            p_phone: phone.trim(),
            p_email: email.trim(),
            p_notify_sms: notifySms,
            p_notify_email: notifyEmail,
            p_marketing_consent: marketing,
            p_respect_quiet_hrs: quietHrs,
          });
          if (error) throw error;
          const { error: stampErr } = await supabase.rpc("homeowner_confirm_contact");
          if (stampErr) throw stampErr;
          break;
        }
        case "home":
          break;
      }
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    if (!canAdvance || saving) return;
    const ok = await persistCurrent();
    if (!ok) return;
    if (isLast) {
      const { error } = await supabase.rpc("homeowner_complete_setup");
      if (error) {
        setErr(error.message);
        return;
      }
      if (homeowner) {
        await logEvent(`homeowner:${homeowner.id}`, "homeowner_setup_completed", {
          skipped_password: !isGoogle && !hasPassword,
        });
      }
      navigate({ to: "/home" });
      return;
    }
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  }

  function goBack() {
    setErr(null);
    setStepIdx((i) => Math.max(0, i - 1));
  }

  function skipPassword() {
    setErr(null);
    setPassword("");
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  }

  if (guardLoading || userLoading || !initialized || !homeowner) {
    return <PageLoader label="Loading your account" />;
  }

  return (
    <div className="font-app min-h-dvh bg-soft flex flex-col">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Pill accent="indigo">
              Step {stepIdx + 1} of {steps.length}
            </Pill>
            <button
              type="button"
              onClick={() => navigate({ to: "/home" })}
              className="pressable p-2 rounded-full text-muted hover:text-ink hover:bg-paper"
              aria-label="Close setup"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-5 pb-3 flex items-center gap-1.5">
          {steps.map((k, i) => (
            <div
              key={k}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-indigo" : "bg-line"}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md px-5 py-10 sm:py-16">
        {step === "name" && (
          <StepFrame
            title="What should we call you?"
            sub="Your pros see this on the record they keep for you."
          >
            <Field label="Your name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Rivera"
                autoComplete="name"
                className="!text-xl !py-4"
                autoFocus
              />
            </Field>
          </StepFrame>
        )}

        {step === "password" && (
          <StepFrame
            title="Secure your account"
            sub="Set a password so you can sign in any time, without waiting for an emailed link."
          >
            <Field label="Password" hint="At least 8 characters.">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="!text-xl !py-4"
                autoFocus
              />
            </Field>
          </StepFrame>
        )}

        {step === "contact" && (
          <StepFrame
            title="How should your home reach you?"
            sub="Service reminders and new records go here. Confirm this is really you."
          >
            <div className="space-y-4">
              <Field label="Mobile phone">
                <PhoneInput value={phone} onChange={(v) => setPhone(v)} />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
              <div className="rounded-2xl border border-line bg-white px-4 py-1">
                <SettingRow
                  label="Text me reminders"
                  sub="Service due dates and new records by SMS."
                >
                  <Toggle checked={notifySms} onChange={setNotifySms} label="Text me reminders" />
                </SettingRow>
                <SettingRow label="Email me reminders" sub="The same updates in your inbox.">
                  <Toggle
                    checked={notifyEmail}
                    onChange={setNotifyEmail}
                    label="Email me reminders"
                  />
                </SettingRow>
                <SettingRow label="Respect quiet hours" sub="No messages late at night.">
                  <Toggle checked={quietHrs} onChange={setQuietHrs} label="Respect quiet hours" />
                </SettingRow>
                <SettingRow label="Occasional home tips" sub="Seasonal maintenance tips. Optional.">
                  <Toggle
                    checked={marketing}
                    onChange={setMarketing}
                    label="Occasional home tips"
                  />
                </SettingRow>
              </div>
              {!reachable && (
                <p className="text-xs text-muted">
                  Keep at least one way to reach you: a valid phone with texts on, or a valid email
                  with email on.
                </p>
              )}
            </div>
          </StepFrame>
        )}

        {step === "home" && (
          <StepFrame title="Is this your home?" sub="Your record lives at this address.">
            {home ? (
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Address
                </div>
                <div className="mt-1 text-lg font-bold text-ink">{home.address}</div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No home is linked yet. Claim a service record from your pro, or add your address
                from your home screen after you finish.
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Something wrong?{" "}
              <Link to="/home/settings" className="font-semibold text-indigo hover:underline">
                Fix it in settings
              </Link>
              .
            </p>
          </StepFrame>
        )}

        {err && (
          <div role="alert" className="mt-4 text-sm text-red bg-redbg rounded-xl px-3 py-2">
            {err}
          </div>
        )}

        {step === "password" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={skipPassword}
              className="text-sm font-semibold text-muted hover:text-ink underline underline-offset-2"
            >
              Skip for now: keep using emailed links
            </button>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-line bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-md px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIdx === 0}
            className="pressable inline-flex items-center justify-center w-14 h-14 rounded-full border border-line bg-white text-ink disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <Btn
            variant="indigo"
            size="lg"
            className="flex-1 h-14"
            disabled={!canAdvance}
            loading={saving}
            onClick={goNext}
          >
            {isLast ? (
              <span className="inline-flex items-center gap-2">
                <Check size={20} /> Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Next <ArrowRight size={20} />
              </span>
            )}
          </Btn>
        </div>
      </footer>
    </div>
  );
}

function StepFrame({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="anim-fade-up">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-2 text-base text-muted">{sub}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}
