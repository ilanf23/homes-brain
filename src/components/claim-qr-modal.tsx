import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, X } from "lucide-react";
import { Avatar, Btn } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  customerId: string;
  proId: string;
  recordId?: string;
  proBusiness: string;
  proLogo?: string | null;
  onClose: () => void;
};

type QrResponse =
  | { ok: true; claim_url: string; expires_at: string }
  | { ok: false; code: string };

export function ClaimQRModal({
  customerId,
  proId,
  recordId,
  proBusiness,
  proLogo,
  onClose,
}: Props) {
  const [state, setState] = useState<"loading" | "ready" | "no_email" | "error">("loading");
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mint = useCallback(async () => {
    setState("loading");
    setCopied(false);
    const { data, error } = await supabase.functions.invoke("claim-qr", {
      body: {
        customer_id: customerId,
        pro_id: proId,
        record_id: recordId,
        origin: window.location.origin,
      },
    });
    const result = data as QrResponse | null;
    if (error || !result?.ok) {
      const code = (result && !result.ok && result.code) || "error";
      if (code === "no_email") {
        setState("no_email");
      } else {
        setErrorCode(code);
        setState("error");
      }
      return;
    }
    setClaimUrl(result.claim_url);
    setExpiresAt(result.expires_at);
    setState("ready");
  }, [customerId, proId, recordId]);

  useEffect(() => {
    void mint();
  }, [mint]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyLink() {
    if (!claimUrl) return;
    await navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan to claim your home record"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 anim-fade-up"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-bg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="pressable absolute right-3 top-3 rounded-full p-1.5 text-muted hover:bg-soft hover:text-ink transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          {proLogo ? (
            // Pro logos come from a Supabase Storage URL under our control; no
            // third-party sanitization needed. Fall back to initials if the
            // image ever fails to load.
            <img
              src={proLogo}
              alt={proBusiness}
              className="h-11 w-11 rounded-xl object-contain bg-soft"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Avatar name={proBusiness} accent="indigo" size={44} />
          )}
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo">
            {proBusiness}
          </div>
          <h2 className="mt-1 text-xl tracking-tight">Scan to claim your home record</h2>
        </div>

        <div className="mt-5 flex min-h-[280px] items-center justify-center rounded-2xl bg-soft p-6">
          {state === "loading" && (
            <div className="text-sm text-muted">Generating a fresh code…</div>
          )}
          {state === "ready" && claimUrl && (
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG
                value={claimUrl}
                size={224}
                level="M"
                bgColor="#ffffff"
                fgColor="#16160f"
              />
            </div>
          )}
          {state === "no_email" && (
            <div className="text-center">
              <div className="text-sm font-semibold text-ink">Email needed</div>
              <p className="mt-1.5 text-sm text-muted">
                Add this homeowner's email first so they can claim by QR.
              </p>
              <div className="mt-4">
                <Link
                  to="/pro/customers/$customerId"
                  params={{ customerId }}
                  onClick={onClose}
                >
                  <Btn variant="indigo" size="sm">
                    Open customer
                  </Btn>
                </Link>
              </div>
            </div>
          )}
          {state === "error" && (
            <div className="text-center">
              <div className="text-sm font-semibold text-ink">Could not create a code</div>
              <p className="mt-1.5 text-xs text-muted">
                {errorCode === "no_record"
                  ? "Log a job first so there's a record to claim."
                  : "Please try again."}
              </p>
              <div className="mt-4">
                <Btn variant="secondary" size="sm" onClick={mint}>
                  Try again
                </Btn>
              </div>
            </div>
          )}
        </div>

        {state === "ready" && (
          <>
            <p className="mt-4 text-center text-xs text-muted">
              One scan · expires in 20 minutes.
              {expiresAt && (
                <>
                  {" "}
                  <span className="tnum">
                    {new Date(expiresAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Btn variant="secondary" size="sm" onClick={copyLink}>
                {copied ? "Copied ✓" : "Copy link"}
              </Btn>
              <Btn variant="secondary" size="sm" onClick={mint}>
                <RefreshCw size={14} /> New code
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
