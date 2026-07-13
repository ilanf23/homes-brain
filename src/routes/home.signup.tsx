import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, PhoneInput, Pill } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { logEvent } from "@/lib/hb";
import { Logo } from "@/components/svg";
import { AddressField } from "@/components/address-field";
import { LanguageToggle, useT } from "@/lib/i18n";

type HomeSignupSearch = { email?: string };

export const Route = createFileRoute("/home/signup")({
  head: () => ({ meta: [{ title: "Create your home account - HomesBrain" }] }),
  validateSearch: (s: Record<string, unknown>): HomeSignupSearch => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  component: HomeownerSignup,
});

const PENDING_KEY = "hb_pending_signup";

/* Homeowner signup via email + password. Email is auto-confirmed at the
   project level, so submitting the form creates the account and signs the
   user in immediately. Google OAuth still works for one-tap signup. */
function HomeownerSignup() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) return;
      setFinishing(true);
      let pending: { name?: string; address?: string; consent?: boolean } = {};
      try {
        pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "{}");
      } catch {
        // ignore
      }
      const { data, error } = await supabase.rpc("homeowner_signup", {
        p_address: pending.address ?? "",
        p_marketing_consent: pending.consent ?? false,
      });
      if (error || !data) {
        setErr(error?.message ?? "Could not finish signup");
        setFinishing(false);
        return;
      }
      const homeownerId = data as string;
      if (pending.name && pending.name.trim()) {
        await supabase.rpc("homeowner_update_profile", { p_name: pending.name.trim() });
      }
      await logEvent(`homeowner:${homeownerId}`, "homeowner_signed_up", {
        has_address: !!pending.address,
      });
      localStorage.removeItem(PENDING_KEY);
      navigate({ to: "/home" });
    };
    finish();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") finish();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function signUpWithPassword() {
    setBusy(true);
    setErr(null);
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ name: name.trim(), address: address.trim(), consent }),
    );
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { has_password: true },
      },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      // Fall back to signing in (covers "user already exists" flows too).
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setErr(signInErr.message);
        setBusy(false);
        return;
      }
    }
    // onAuthStateChange in the effect will finish setup and navigate.
  }

  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Pill accent="indigo">{t("chrome.forHomeowners")}</Pill>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="text-center mb-6">
          <h1 className="text-3xl tracking-tight">{t("signup.title")}</h1>
          <p className="mt-2 text-sm text-muted">{t("signup.subtitle")}</p>
        </div>
        <Card>
          {finishing ? (
            <div className="py-6 text-center text-sm text-muted">{t("signup.finishing")}</div>
          ) : (
            <div className="space-y-4">
              <GoogleAuthButton
                busy={busy}
                onError={setErr}
                onBusyChange={setBusy}
                stashPending={() => {
                  localStorage.setItem(
                    PENDING_KEY,
                    JSON.stringify({ name: name.trim(), address: address.trim(), consent }),
                  );
                }}
              />
              <OrDivider />
              <Field label={t("signup.nameLabel")}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("signup.namePlaceholder")}
                />
              </Field>
              <Field label={t("auth.email")}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                />
              </Field>
              <Field label={t("auth.password")}>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("signup.passwordPlaceholder")}
                  autoComplete="new-password"
                />
              </Field>
              <Field label={t("signup.addressLabel")}>
                <AddressField
                  value={address}
                  onChange={setAddress}
                  onResolve={(r) => setAddress(r.address)}
                  placeholder={t("signup.addressPlaceholder")}
                  ariaLabel={t("signup.addressLabel")}
                />
                <p className="mt-1.5 text-xs text-muted">{t("signup.addressHelp")}</p>
              </Field>
              <label className="flex items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>{t("signup.consent")}</span>
              </label>
              {err && (
                <div className="text-sm text-red bg-redbg rounded-xl px-3 py-2">{err}</div>
              )}
              <Btn
                variant="indigo"
                size="lg"
                className="w-full"
                disabled={!email.trim() || password.length < 8 || busy}
                onClick={signUpWithPassword}
              >
                {busy ? t("signup.creating") : t("signup.create")}
              </Btn>
              <p className="text-center text-xs text-muted">
                {t("signup.haveAccount")}{" "}
                <Link to="/login" className="font-semibold text-indigo hover:underline">
                  {t("auth.logIn")}
                </Link>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


function GoogleAuthButton({
  busy,
  onError,
  onBusyChange,
  stashPending,
}: {
  busy: boolean;
  onError: (m: string | null) => void;
  onBusyChange: (b: boolean) => void;
  stashPending: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        onBusyChange(true);
        onError(null);
        stashPending();
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/auth/callback`,
        });
        if (result.error) {
          onError(result.error.message ?? "Google sign-in failed");
          onBusyChange(false);
          return;
        }
        if (result.redirected) return;
        window.location.href = "/auth/callback";
      }}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-soft disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {t("auth.continueGoogle")}
    </button>
  );
}

function OrDivider() {
  const t = useT();
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
      <div className="h-px flex-1 bg-line" />
      {t("auth.or")}
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
