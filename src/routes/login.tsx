import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { resumePath } from "@/lib/mobile";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Btn, Field, Input } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { logEvent } from "@/lib/hb";
import { queueCelebration } from "@/components/celebration";
import { useT, type TKey } from "@/lib/i18n";

type LoginSearch = { email?: string; claim?: string; note?: string };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in - HomesBrain" }] }),
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    email: typeof s.email === "string" ? s.email : undefined,
    claim: typeof s.claim === "string" ? s.claim : undefined,
    note: typeof s.note === "string" ? s.note : undefined,
  }),
  component: Login,
});

/* Email-first login. One email field for everyone; the
   lookup_login_method RPC decides the path:
   pro -> password step, homeowner -> magic link sent immediately,
   both -> small choice, none -> signup pointers. */
type Step =
  | "email"
  | "pro-sent"
  | "pro-password"
  | "ho-password"
  | "ho-sent"
  | "no-account"
  | "choose-role"
  | "forgot"
  | "forgot-sent";

const STEP_COPY: Record<Step, { title: TKey; sub: TKey }> = {
  email: { title: "login.email.title", sub: "login.email.sub" },
  "pro-sent": { title: "login.sent.title", sub: "login.sent.sub" },
  "pro-password": { title: "login.email.title", sub: "login.password.sub" },
  "ho-password": { title: "login.email.title", sub: "login.password.sub" },
  "ho-sent": { title: "login.sent.title", sub: "login.sent.sub" },
  "no-account": { title: "login.noAccount.title", sub: "login.noAccount.sub" },
  "choose-role": { title: "login.chooseRole.title", sub: "login.chooseRole.sub" },
  forgot: { title: "login.forgot.title", sub: "login.forgot.sub" },
  "forgot-sent": { title: "login.forgotSent.title", sub: "login.forgotSent.sub" },
};

type Role = "homeowner" | "pro";
const ROLE_KEY = "hb_login_role";

function readSavedRole(): Role {
  if (typeof window === "undefined") return "homeowner";
  try {
    const v = localStorage.getItem(ROLE_KEY);
    return v === "pro" ? "pro" : "homeowner";
  } catch {
    return "homeowner";
  }
}

function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const t = useT();
  const [step, setStep] = useState<Step>("email");
  const [role, setRoleState] = useState<Role>("homeowner");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showHoPassword, setShowHoPassword] = useState(false);
  const [showProPassword, setShowProPassword] = useState(false);
  const claimRecordId = search.claim ?? null;
  const expiredNote = search.note === "expired";

  // Hydrate saved role after mount (SSR-safe).
  useEffect(() => {
    setRoleState(readSavedRole());
  }, []);

  function setRole(next: Role) {
    setRoleState(next);
    try {
      localStorage.setItem(ROLE_KEY, next);
    } catch {
      // ignore
    }
  }

  // Prefill and auto-continue when the callback sent us here after an
  // expired magic link.
  useEffect(() => {
    if (search.email && expiredNote) {
      // Fire a fresh link automatically so it's really one tap.
      void sendMagicLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetToEmail() {
    setStep("email");
    setPassword("");
    setErr(null);
    setShowHoPassword(false);
    setShowProPassword(false);
  }

  async function continueWithEmail() {
    // Login is for existing accounts only. Look up which account types
    // the email has, and whether the account already has a password.
    // Password-first when set (magic link stays as a fallback link);
    // otherwise send the magic link immediately.
    setBusy(true);
    setErr(null);
    const trimmed = email.trim();
    const { data, error } = await supabase.rpc("lookup_login_context", {
      p_email: trimmed,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const ctx = (data as { method?: string; has_password?: boolean } | null) ?? {};
    const method = ctx.method ?? "none";
    const hasPassword = ctx.has_password === true;
    // Route by the account we actually found, not the toggle. The toggle only
    // breaks ties when this email has both account types; otherwise the looked-up
    // method wins, so a returning user can never be sent to the wrong flow
    // (Vladimir test: make it impossible to mess up). "none" means no account,
    // so fall back to the toggle as a statement of intent for signup routing.
    const effectiveRole: Role =
      method === "pro" ? "pro" : method === "homeowner" ? "homeowner" : role;

    if (method === "none") {
      setBusy(false);
      navigate({
        to: effectiveRole === "pro" ? "/pro/signup" : "/home/signup",
        search: { email: trimmed },
      });
      return;
    }

    if (effectiveRole === "pro") {
      if (hasPassword) {
        setBusy(false);
        setStep("pro-password");
      } else {
        await sendProMagicLink();
      }
    } else {
      if (hasPassword) {
        setBusy(false);
        setStep("ho-password");
      } else {
        await sendMagicLink();
      }
    }
  }

  async function sendProMagicLink() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("pro-login", {
      body: { email: email.trim(), origin: window.location.origin },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const res = data as { ok?: boolean; code?: string } | null;
    if (!res?.ok) {
      setErr(
        res?.code === "not_configured"
          ? "Email is not configured yet."
          : res?.code === "daily_limit"
            ? "Too many sign-in links sent recently. Try again later."
            : "We couldn't send that link. Try again.",
      );
      setBusy(false);
      return;
    }
    setStep("pro-sent");
    setBusy(false);
  }

  async function sendMagicLink() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("homeowner-login", {
      // claim: keep the record from an expired link on the fresh one, so
      // the resent email still opens (and claims) the same record.
      body: { email: email.trim(), origin: window.location.origin, claim: claimRecordId },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const res = data as { ok?: boolean; code?: string } | null;
    if (!res?.ok) {
      if (res?.code === "no_account") {
        setStep("no-account");
        setBusy(false);
        return;
      }
      setErr(
        res?.code === "not_configured"
          ? "Email is not configured yet."
          : res?.code === "daily_limit"
            ? "Too many sign-in links sent recently. Try again later."
            : "We couldn't send that link. Try again.",
      );
      setBusy(false);
      return;
    }
    setStep("ho-sent");
    setBusy(false);
  }

  async function homeownerPasswordLogin() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    if (claimRecordId) {
      const { error: claimErr } = await supabase.rpc("claim_home", {
        p_record_id: claimRecordId,
      });
      if (claimErr) {
        // already_claimed = the home belongs to another account; anything else
        // is unexpected. Either way the dashboard is the honest landing spot.
        console.error("claim_home failed", claimErr);
      } else {
        queueCelebration("home_claimed");
        navigate({ to: "/home/records/$recordId", params: { recordId: claimRecordId } });
        return;
      }
    }
    navigate({ to: (resumePath("/home") ?? "/home") as "/home" });
  }

  async function proLogin() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const { data: pro } = await supabase
      .from("pros")
      .select("id,business")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();
    if (!pro) {
      setErr("This account isn't a pro account. Contact support.");
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }
    await logEvent(`pro:${pro.id}`, "logged_in", { role: "pro" });
    navigate({ to: (resumePath("/pro") ?? "/pro") as "/pro" });
  }

  async function sendReset() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("password-reset", {
      body: { email: email.trim(), origin: window.location.origin },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const res = data as { ok?: boolean; code?: string } | null;
    if (!res?.ok) {
      setErr(
        res?.code === "not_configured"
          ? "Email is not configured yet."
          : "We couldn't send that link. Try again.",
      );
      setBusy(false);
      return;
    }
    setStep("forgot-sent");
    setBusy(false);
  }

  const copy = STEP_COPY[step];

  return (
    <AuthShell>
      <div className="mb-6">
        <h1 className="text-3xl tracking-tight">{t(copy.title)}</h1>
        <p className="mt-2 text-sm text-muted">{t(copy.sub)}</p>
      </div>

      <div className="space-y-4">
        {step === "email" && (
          <>
            <RoleToggle role={role} onChange={setRole} disabled={busy} t={t} />
            <GoogleButton
              busy={busy}
              t={t}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                // Stash the chosen role so /auth/callback creates the
                // matching account row if it doesn't exist yet.
                try {
                  localStorage.setItem("hb_pending_login_role", role);
                } catch {
                  // ignore
                }
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/auth/callback`,
                });
                if (result.error) {
                  setErr(result.error.message ?? "Google sign-in failed");
                  setBusy(false);
                  return;
                }
                if (result.redirected) return;
                // Popup flow completed in-preview; session is set.
                navigate({ to: "/auth/callback" });
              }}
            />
            <OrDivider t={t} />
            <Field label={t("auth.email")}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                autoComplete="email"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim() && !busy) continueWithEmail();
                }}
              />
            </Field>
            <ErrorRow err={err} />
            <Btn
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={!email.trim()}
              loading={busy}
              onClick={continueWithEmail}
            >
              {role === "pro" ? t("login.continuePro") : t("login.continueHomeowner")}
            </Btn>
            <p className="text-center text-xs text-muted">
              {t("login.newHere")}{" "}
              <Link to="/pro/signup" className="font-semibold text-indigo hover:underline">
                {t("login.startFreePro")}
              </Link>{" "}
              {t("auth.or")}{" "}
              <Link to="/home/signup" className="font-semibold text-indigo hover:underline">
                {t("login.createHomeAccountLink")}
              </Link>
            </p>
          </>
        )}

        {step === "pro-sent" && (
          <>
            <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
              {t("login.proSent.pre")}
              <span className="font-semibold">{email.trim()}</span>
              {t("login.proSent.post")}
            </div>
            {showProPassword ? (
              <>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    autoComplete="current-password"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password && !busy) proLogin();
                    }}
                  />
                </Field>
                <ErrorRow err={err} />
                <Btn
                  variant="indigo"
                  size="lg"
                  className="w-full"
                  disabled={!password}
                  loading={busy}
                  onClick={proLogin}
                >
                  {t("auth.signIn")}
                </Btn>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("forgot");
                      setErr(null);
                    }}
                    className="text-xs font-semibold text-indigo hover:underline"
                  >
                    {t("login.forgotPassword")}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowProPassword(true);
                    setErr(null);
                  }}
                  className="text-xs font-semibold text-indigo hover:underline"
                >
                  {t("login.usePasswordInstead")}
                </button>
              </div>
            )}
            <BackToEmail onClick={resetToEmail} />
          </>
        )}

        {step === "pro-password" && (
          <>
            <EmailSummary email={email} onChange={resetToEmail} />
            <Field
              label={
                email.trim().toLowerCase() === "appreview@homesbrain.com"
                  ? "Verification code"
                  : "Password"
              }
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  email.trim().toLowerCase() === "appreview@homesbrain.com"
                    ? "6-digit code"
                    : t("auth.passwordPlaceholder")
                }
                autoComplete="current-password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password && !busy) proLogin();
                }}
              />
            </Field>

            <ErrorRow err={err} />
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              disabled={!password}
              loading={busy}
              onClick={proLogin}
            >
              {t("auth.signIn")}
            </Btn>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setStep("forgot");
                  setErr(null);
                }}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                {t("login.forgotPassword")}
              </button>
              <span className="text-xs text-muted">·</span>
              <button
                type="button"
                disabled={busy}
                onClick={sendProMagicLink}
                className="text-xs font-semibold text-indigo hover:underline disabled:opacity-60"
              >
                {t("login.emailLinkInstead")}
              </button>
            </div>
          </>
        )}

        {step === "ho-password" && (
          <>
            <EmailSummary email={email} onChange={resetToEmail} />
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                autoComplete="current-password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password && !busy) homeownerPasswordLogin();
                }}
              />
            </Field>
            <ErrorRow err={err} />
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              disabled={!password}
              loading={busy}
              onClick={homeownerPasswordLogin}
            >
              {t("auth.signIn")}
            </Btn>
            <Btn
              variant="secondary"
              size="lg"
              className="w-full"
              loading={busy}
              onClick={sendMagicLink}
            >
              {t("login.emailLinkInstead")}
            </Btn>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("forgot");
                  setErr(null);
                }}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                {t("login.forgotPassword")}
              </button>
            </div>
          </>
        )}

        {step === "ho-sent" && (
          <>
            {expiredNote && (
              <div className="text-sm text-ink bg-amberbg rounded-xl px-3 py-2">
                {t("login.expiredLink")}
              </div>
            )}
            <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
              {t("login.hoSent.pre")}
              <span className="font-semibold">{email.trim()}</span>
              {t("login.hoSent.post")}
            </div>
            {showHoPassword ? (
              <>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    autoComplete="current-password"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password && !busy) homeownerPasswordLogin();
                    }}
                  />
                </Field>
                <ErrorRow err={err} />
                <Btn
                  variant="indigo"
                  size="lg"
                  className="w-full"
                  disabled={!password}
                  loading={busy}
                  onClick={homeownerPasswordLogin}
                >
                  {t("auth.signIn")}
                </Btn>
              </>
            ) : (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowHoPassword(true);
                    setErr(null);
                  }}
                  className="text-xs font-semibold text-indigo hover:underline"
                >
                  {t("login.usePasswordInstead")}
                </button>
              </div>
            )}
            <BackToEmail onClick={resetToEmail} />
          </>
        )}

        {step === "no-account" && (
          <>
            <div className="text-sm text-ink bg-soft border border-line rounded-xl px-3 py-2">
              {t("login.noAccount.pre")}
              <span className="font-semibold">{email.trim()}</span>
              {t("login.noAccount.post")}
            </div>
            <Link to="/pro/signup" className="block">
              <Btn variant="indigo" size="lg" className="w-full">
                {t("login.startFreePro")}
              </Btn>
            </Link>
            <Link to="/home/signup" className="block">
              <Btn variant="secondary" size="lg" className="w-full">
                {t("login.createHomeAccountBtn")}
              </Btn>
            </Link>
            <BackToEmail onClick={resetToEmail} />
          </>
        )}

        {step === "choose-role" && (
          <>
            <EmailSummary email={email} onChange={resetToEmail} />
            <ErrorRow err={err} />
            <Btn
              variant="indigo"
              size="lg"
              className="w-full"
              onClick={() => {
                setStep("pro-password");
                setErr(null);
              }}
            >
              {t("login.signInWithPassword")}
            </Btn>
            <Btn
              variant="secondary"
              size="lg"
              className="w-full"
              loading={busy}
              onClick={sendMagicLink}
            >
              {t("login.emailLink")}
            </Btn>
          </>
        )}

        {step === "forgot" && (
          <>
            <EmailSummary email={email} onChange={resetToEmail} />
            <ErrorRow err={err} />
            <Btn variant="indigo" size="lg" className="w-full" loading={busy} onClick={sendReset}>
              {t("login.sendReset")}
            </Btn>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("pro-password");
                  setErr(null);
                }}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                {t("login.backToSignIn")}
              </button>
            </div>
          </>
        )}

        {step === "forgot-sent" && (
          <>
            <div className="text-sm text-ink bg-indigobg rounded-xl px-3 py-2">
              {t("login.forgotSent.pre")}
              <span className="font-semibold">{email.trim()}</span>
              {t("login.forgotSent.post")}
            </div>
            <BackToEmail onClick={resetToEmail} />
          </>
        )}
      </div>
    </AuthShell>
  );
}

function ErrorRow({ err }: { err: string | null }) {
  if (!err) return null;
  return (
    <div role="alert" className="anim-fade-in text-sm text-red bg-redbg rounded-xl px-3 py-2">
      {err}
    </div>
  );
}

/* The confirmed email, shown read-only above later steps. */
function EmailSummary({ email, onChange }: { email: string; onChange: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5">
      <span className="truncate text-sm font-semibold text-ink">{email.trim()}</span>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-xs font-semibold text-indigo hover:underline"
      >
        {t("login.notYou")}
      </button>
    </div>
  );
}

function BackToEmail({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={onClick}
        className="text-xs font-semibold text-indigo hover:underline"
      >
        {t("login.useDifferentEmail")}
      </button>
    </div>
  );
}

function GoogleButton({
  busy,
  onClick,
  t,
}: {
  busy: boolean;
  onClick: () => void;
  t: (key: TKey) => string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 py-4 text-base font-bold text-ink shadow-sm transition hover:bg-soft hover:shadow-md active:translate-y-px disabled:opacity-60"
    >
      <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
      {busy ? t("auth.openingGoogle") : t("auth.continueGoogle")}
    </button>
  );
}

function OrDivider({ t }: { t: (key: TKey) => string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
      <div className="h-px flex-1 bg-line" />
      {t("auth.or")}
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

/* Segmented Homeowner|Pro toggle. Decides which magic-link function to
   call and which account row to auto-create on the other side of the
   token exchange, so one email can hold both types. */
function RoleToggle({
  role,
  onChange,
  disabled,
  t,
}: {
  role: Role;
  onChange: (r: Role) => void;
  disabled?: boolean;
  t: (key: TKey) => string;
}) {
  const base =
    "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40";
  const active = "bg-white text-ink shadow-sm";
  const inactive = "text-muted hover:text-ink";
  return (
    <div
      role="tablist"
      aria-label={t("login.signInAs")}
      className="flex items-center gap-1 rounded-full border border-line bg-soft p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={role === "homeowner"}
        disabled={disabled}
        onClick={() => onChange("homeowner")}
        className={`${base} ${role === "homeowner" ? active : inactive}`}
      >
        {t("login.role.homeowner")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={role === "pro"}
        disabled={disabled}
        onClick={() => onChange("pro")}
        className={`${base} ${role === "pro" ? active : inactive}`}
      >
        {t("login.role.pro")}
      </button>
    </div>
  );
}
