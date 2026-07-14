import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Btn, Card, Field, Input, KV, PageLoader } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, logEvent } from "@/lib/hb";
import { queueCelebration } from "@/components/celebration";
import { claimCopy } from "@/lib/customer-locales";
import { isLocale, LanguageToggle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/claim/$token")({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: isLocale(search.lang) ? search.lang : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Claim your home record - HomesBrain" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClaimByToken,
});

type EquipmentPreview = {
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
};

type Preview = {
  record_id: string;
  equipment_id?: string | null;
  address: string | null;
  what_done: string | null;
  equipment: EquipmentPreview | null;
  pro: { business: string; logo: string | null } | null;
};

type ExchangeResp = {
  ok: boolean;
  code?: "invalid" | "expired" | "used" | "need_email" | "send_failed" | "error";
  hashed_token?: string;
  email?: string;
  record_id?: string;
  intent?: string | null;
  first_name?: string | null;
  preview?: Preview;
  locale?: unknown;
};

function ProHeader({ pro }: { pro: Preview["pro"] }) {
  const { locale } = useI18n();
  const copy = claimCopy(locale);
  const logoOk = pro?.logo && /^https:\/\//i.test(pro.logo);
  return (
    <div className="mb-6 flex items-center gap-3">
      {logoOk ? (
        <img src={pro!.logo!} alt={pro!.business} className="h-10 max-w-[220px] object-contain" />
      ) : (
        <div className="text-xl font-extrabold tracking-tight text-ink">
          {pro?.business ?? copy.yourServicePro}
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {copy.via}
        </div>
        <LanguageToggle />
      </div>
    </div>
  );
}

function RecordPreview({ preview }: { preview: Preview }) {
  const { locale } = useI18n();
  const copy = claimCopy(locale);
  const eq = preview.equipment;
  const eqLine = [eq?.type, eq?.make, eq?.model].filter(Boolean).join(" ");
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo">
        {copy.newServiceRecord}
      </div>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
        {preview.pro?.business ? copy.recordAddedBy(preview.pro.business) : copy.recordAddedGeneric}
      </h1>
      <div className="mt-4 space-y-2">
        {preview.address && <KV k={copy.address} v={preview.address} mono={false} />}
        {preview.what_done && <KV k={copy.workDone} v={preview.what_done} mono={false} />}
        {eqLine && <KV k={copy.equipment} v={eqLine} mono={false} />}
        {eq?.warranty_until && (
          <KV
            k={copy.warranty}
            v={copy.through(formatDate(eq.warranty_until, locale))}
            mono={false}
          />
        )}
      </div>
    </Card>
  );
}

function ClaimByToken() {
  const { token } = Route.useParams();
  const { lang } = Route.useSearch();
  const navigate = useNavigate();
  const { locale, setLocale } = useI18n();
  const copy = claimCopy(locale);
  const [phase, setPhase] = useState<"loading" | "need_email" | "claiming" | "error" | "done">(
    "loading",
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lang && lang !== locale) setLocale(lang);
  }, [lang, locale, setLocale]);

  function applyResponseLocale(resp: ExchangeResp) {
    if (isLocale(resp.locale) && resp.locale !== locale) setLocale(resp.locale);
  }

  const invokeExchange = useMemo(
    () =>
      async (email?: string): Promise<ExchangeResp | null> => {
        const { data, error } = await supabase.functions.invoke("claim-exchange", {
          body: email ? { token, email } : { token },
        });
        if (error && !data) {
          setErrorCode("network");
          return null;
        }
        return data as ExchangeResp;
      },
    [token],
  );

  async function finalize(resp: ExchangeResp) {
    applyResponseLocale(resp);
    if (!resp.hashed_token) {
      setPhase("error");
      setErrorCode(resp.code ?? "error");
      return;
    }
    setPhase("claiming");
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: resp.hashed_token,
      type: "email",
    });
    if (verifyErr) {
      console.error("verifyOtp failed", verifyErr);
      setPhase("error");
      setErrorCode("send_failed");
      return;
    }
    if (resp.record_id) {
      const { error: claimErr } = await supabase.rpc("claim_home", {
        p_record_id: resp.record_id,
      });
      // claim_home raises already_claimed only when the home belongs to a
      // DIFFERENT account (re-claiming your own home is a no-op success).
      // Navigating on into /home/records would bounce through an empty
      // dashboard, so surface the truth here instead.
      if (claimErr) {
        console.error("claim_home failed", claimErr);
        setPhase("error");
        setErrorCode(/already_claimed/i.test(claimErr.message ?? "") ? "already_claimed" : "error");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await logEvent(`user:${userData.user.id}`, "home_claimed", {
          record_id: resp.record_id,
          via: "branded_claim",
        });
      }
      setPhase("done");
      queueCelebration("home_claimed");
      const rid = resp.record_id ?? preview?.record_id ?? null;
      if (rid) {
        navigate({ to: "/home/records/$recordId", params: { recordId: rid } });
      } else {
        navigate({ to: "/home", search: { welcome: "1" } as never });
      }

      return;
    }
    // Login-only token. If this was a pro intent, ensure a pros row exists
    // via SECURITY DEFINER RPC and route straight to /pro.
    // Never call homeowner-side RPCs here: that would create a stray homeowners row.
    if (resp.intent === "pro") {
      const { error: ensureErr } = await supabase.rpc("pro_ensure", {
        p_first_name: resp.first_name ?? undefined,
      });
      if (ensureErr) console.error("pro_ensure failed", ensureErr);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        await logEvent(`user:${user.id}`, "pro_signed_in", { via: "magic_link" });
      }
      setPhase("done");
      navigate({ to: "/pro" });
      return;
    }
    // Default: homeowner login-only. Ensure a homeowners row exists for
    // this auth user (works even if the same email already has a pros
    // row - one auth user can hold both). get_home_view calls
    // homeowner_ensure under the hood.
    const { error: ensureHoErr } = await supabase.rpc("get_home_view");
    if (ensureHoErr) console.error("get_home_view failed", ensureHoErr);
    setPhase("done");
    navigate({ to: "/home" });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resp = await invokeExchange();
      if (cancelled || !resp) return;
      applyResponseLocale(resp);
      if (resp.preview) setPreview(resp.preview);
      if (resp.ok) {
        await finalize(resp);
        return;
      }
      if (resp.code === "need_email") {
        setPhase("need_email");
        return;
      }
      // A used link usually means the claim already went through (second tap
      // on the email link, rescanned QR). If a session is live, skip the
      // dead-end error and open the record; the record page's own guard
      // handles the case where this account doesn't actually own it.
      if (resp.code === "used" && resp.record_id) {
        const { data: userData } = await supabase.auth.getUser();
        if (!cancelled && userData?.user) {
          navigate({ to: "/home/records/$recordId", params: { recordId: resp.record_id } });
          return;
        }
      }
      if (cancelled) return;
      setPhase("error");
      setErrorCode(resp.code ?? "error");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim() || submitting) return;
    setSubmitting(true);
    const resp = await invokeExchange(emailInput.trim());
    setSubmitting(false);
    if (!resp) {
      setPhase("error");
      return;
    }
    applyResponseLocale(resp);
    if (resp.preview) setPreview(resp.preview);
    if (resp.ok) {
      await finalize(resp);
      return;
    }
    setPhase("error");
    setErrorCode(resp.code ?? "error");
  }

  async function requestFreshLink() {
    if (!preview?.record_id) {
      navigate({ to: "/login" });
      return;
    }
    // Kick the homeowner into the fresh-magic-link flow, preserving the
    // record so the resend still claims the right home.
    navigate({
      to: "/login",
      search: { note: "expired", claim: preview.record_id } as never,
    });
  }

  if (phase === "loading" || phase === "claiming") {
    return (
      <div className="min-h-screen bg-soft">
        <div className="mx-auto max-w-xl px-4 py-10">
          {preview && (
            <>
              <ProHeader pro={preview.pro} />
              <RecordPreview preview={preview} />
            </>
          )}
          <div className="mt-6">
            <PageLoader label={phase === "claiming" ? copy.settingUp : copy.openingRecord} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft">
      <div className="mx-auto max-w-xl px-4 py-10">
        <ProHeader pro={preview?.pro ?? null} />
        {preview && <RecordPreview preview={preview} />}

        {phase === "need_email" && (
          <Card className="mt-6">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">{copy.confirmTitle}</h2>
            <p className="mt-1 text-sm text-muted">{copy.confirmBody}</p>
            <form onSubmit={submitEmail} className="mt-4 space-y-3">
              <Field label={copy.email}>
                <Input
                  type="email"
                  autoFocus
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Btn type="submit" variant="indigo" disabled={submitting}>
                {submitting ? copy.opening : copy.claimRecord}
              </Btn>
            </form>
          </Card>
        )}

        {phase === "error" && (
          <Card className="mt-6">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">
              {errorCode === "expired"
                ? copy.expiredTitle
                : errorCode === "used"
                  ? copy.usedTitle
                  : errorCode === "already_claimed"
                    ? copy.alreadyClaimedTitle
                    : copy.cannotOpenTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {errorCode === "used"
                ? copy.usedBody
                : errorCode === "expired"
                  ? copy.expiredBody
                  : errorCode === "already_claimed"
                    ? copy.alreadyClaimedBody
                    : copy.cannotOpenBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {errorCode === "already_claimed" ? (
                // The magic link already signed this visitor in; a fresh claim
                // link cannot help because the home belongs to another account.
                <Btn variant="indigo" onClick={() => navigate({ to: "/home" })}>
                  {copy.goDashboard}
                </Btn>
              ) : (
                <Btn variant="indigo" onClick={requestFreshLink}>
                  {copy.freshLink}
                </Btn>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
