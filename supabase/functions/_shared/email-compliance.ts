// Shared helpers for CAN-SPAM compliant commercial emails.
// Import from other edge functions with a relative path.

export const POSTAL_ADDRESS =
  "HomesBrain — Story Equity Inc., 72 Sunshine Bass Ct, Ponte Vedra, FL 32081";

export const CONTACT_EMAIL = "ilan@maverich.ai";

export const SENDER_NAME = "HomesBrain";

export type ComplianceFooterCopy = {
  unsubscribe: string;
  optOut: string;
  questions: string;
  email: string;
};

const DEFAULT_FOOTER_COPY: ComplianceFooterCopy = {
  unsubscribe: "Unsubscribe",
  optOut: "You can opt out of these emails at any time.",
  questions: "Questions?",
  email: "Email",
};

const APP_ORIGIN = "https://homesbrain.com";

export function buildUnsubUrl(token: string): string {
  return `${APP_ORIGIN}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildOneClickUrl(token: string): string {
  const base =
    (globalThis as { Deno?: { env: { get(k: string): string | undefined } } })
      .Deno?.env.get(
        "SUPABASE_URL",
      ) ?? "";
  const fnBase = base.replace(/\/+$/, "");
  return `${fnBase}/functions/v1/email-unsubscribe?token=${
    encodeURIComponent(token)
  }`;
}

export function listUnsubscribeHeaders(token: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${
      buildOneClickUrl(token)
    }>, <mailto:${CONTACT_EMAIL}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function complianceFooterHtml(
  unsubUrl: string,
  reason?: string,
  copy: ComplianceFooterCopy = DEFAULT_FOOTER_COPY,
): string {
  const reasonLine = reason
    ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.55;color:#73706a;">${
      esc(reason)
    }</p>`
    : "";
  return `
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e7e5de;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${reasonLine}
    <p style="margin:0 0 6px;font-size:12px;line-height:1.55;color:#73706a;">
      <a href="${
    esc(unsubUrl)
  }" style="color:#473fb0;text-decoration:underline;">${
    esc(copy.unsubscribe)
  }</a>
      · ${esc(copy.optOut)}
    </p>
    <p style="margin:0 0 6px;font-size:12px;line-height:1.55;color:#73706a;">
      ${esc(copy.questions)} ${esc(copy.email)} <a href="mailto:${
    esc(CONTACT_EMAIL)
  }" style="color:#473fb0;text-decoration:underline;">${esc(CONTACT_EMAIL)}</a>.
    </p>
    <p style="margin:0;font-size:12px;line-height:1.55;color:#73706a;">
      ${esc(SENDER_NAME)}<br/>${esc(POSTAL_ADDRESS)}
    </p>
  </div>`;
}

export function complianceFooterText(
  unsubUrl: string,
  reason?: string,
  copy: ComplianceFooterCopy = DEFAULT_FOOTER_COPY,
): string {
  const parts = ["", "----"];
  if (reason) parts.push(reason);
  parts.push(`${copy.unsubscribe}: ${unsubUrl}`);
  parts.push(`${copy.questions} ${copy.email} ${CONTACT_EMAIL}`);
  parts.push(SENDER_NAME);
  parts.push(POSTAL_ADDRESS);
  return parts.join("\n");
}

type AdminClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function isEmailOptedOut(
  admin: AdminClient,
  email: string,
): Promise<boolean> {
  const { data } = await admin.rpc("is_email_opted_out", { p_email: email });
  return data === true;
}

export async function getUnsubToken(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.rpc("get_unsub_token", {
    p_email: email,
  });
  if (error || typeof data !== "string") return null;
  return data;
}
