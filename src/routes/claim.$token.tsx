import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Btn, Card, Field, Input, KV, PageLoader } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";

export const Route = createFileRoute("/claim/$token")({
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
  preview?: Preview;
};

function ProHeader({ pro }: { pro: Preview["pro"] }) {
  const logoOk = pro?.logo && /^https:\/\//i.test(pro.logo);
  return (
    <div className="mb-6 flex items-center gap-3">
      {logoOk ? (
        <img src={pro!.logo!} alt={pro!.business} className="h-10 max-w-[220px] object-contain" />
      ) : (
        <div className="text-xl font-extrabold tracking-tight text-ink">
          {pro?.business ?? "Your service pro"}
        </div>
      )}
      <div className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        via HomesBrain
      </div>
    </div>
  );
}

function RecordPreview({ preview }: { preview: Preview }) {
  const eq = preview.equipment;
  const eqLine = [eq?.type, eq?.make, eq?.model].filter(Boolean).join(" ");
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo">
        New service record
      </div>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
        {preview.pro?.business
          ? `${preview.pro.business} added a record to your home`
          : "A record was added to your home"}
      </h1>
      <div className="mt-4 space-y-2">
        {preview.address && <KV k="Address" v={preview.address} mono={false} />}
        {preview.what_done && <KV k="Work done" v={preview.what_done} mono={false} />}
        {eqLine && <KV k="Equipment" v={eqLine} mono={false} />}
        {eq?.warranty_until && (
          <KV k="Warranty" v={`Through ${eq.warranty_until}`} mono={false} />
        )}
      </div>
    </Card>
  );
}

function ClaimByToken() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<
    "loading" | "need_email" | "claiming" | "error" | "done"
  >("loading");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      if (claimErr && !/already_claimed/i.test(claimErr.message ?? "")) {
        console.error("claim_home failed", claimErr);
      }
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await logEvent(`user:${userData.user.id}`, "home_claimed", {
          record_id: resp.record_id,
          via: "branded_claim",
        });
      }
      try {
        sessionStorage.setItem("hb_prompt_secure", "1");
      } catch {
        // ignore
      }
      setPhase("done");
      navigate({ to: "/home", search: { welcome: "1" } as never });
      return;
    }
    // Login-only token: session established, straight to /home.
    setPhase("done");
    navigate({ to: "/home" });
  }


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resp = await invokeExchange();
      if (cancelled || !resp) return;
      if (resp.preview) setPreview(resp.preview);
      if (resp.ok) {
        await finalize(resp);
        return;
      }
      if (resp.code === "need_email") {
        setPhase("need_email");
        return;
      }
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
            <PageLoader label={phase === "claiming" ? "Setting up your home" : "Opening your record"} />
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
            <h2 className="text-lg font-extrabold tracking-tight text-ink">
              Confirm your email to claim
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter the email your service pro has for you. We'll open your record and save this home to your account.
            </p>
            <form onSubmit={submitEmail} className="mt-4 space-y-3">
              <Field label="Email">
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
                {submitting ? "Opening…" : "Claim my home record"}
              </Btn>
            </form>
          </Card>
        )}

        {phase === "error" && (
          <Card className="mt-6">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">
              {errorCode === "expired"
                ? "This link has expired"
                : errorCode === "used"
                  ? "This link was already used"
                  : "We couldn't open this link"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {errorCode === "used"
                ? "For security, each claim link only works once. We can send a fresh one to your inbox."
                : "Links expire after 7 days for security. Get a fresh one and we'll still take you straight to your record."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Btn variant="indigo" onClick={requestFreshLink}>
                Send a fresh link
              </Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
