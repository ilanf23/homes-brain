// Shared branded email shell used by ALL transactional emails.
// Layout: warm cream page bg + centered 600px container. Header = indigo
// rounded-square brand mark + two-line title block. Body = white card with
// a soft warm-neutral border (indigo reserved for ink + CTA). Footer sits
// below the card and holds reason + unsubscribe + legal.
//
// Copy for each email lives in that email's function. This file only owns
// the visual chrome and reusable inner pieces (h1, p, details panel, CTA).

import {
  CONTACT_EMAIL,
  POSTAL_ADDRESS,
  SENDER_NAME,
  type ComplianceFooterCopy,
} from "./email-compliance.ts";

const DEFAULT_FOOTER: ComplianceFooterCopy = {
  unsubscribe: "Unsubscribe",
  optOut: "You can opt out of these emails at any time.",
  questions: "Questions?",
  email: "Email",
};

const HB = `<span translate="no" class="notranslate">HomesBrain</span>`;

// Plus Jakarta Sans first so Apple Mail / iOS / macOS clients that have it
// installed render the brand face; every other client falls back cleanly
// down the system stack. No @font-face or <link> (Gmail strips them and
// they hurt deliverability).
export const FONT_STACK = `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Replaces literal "HomesBrain" occurrences in an already-escaped string
// with a <span translate="no">…</span> so Gmail can't translate/garble it.
export function protectBrand(escaped: string): string {
  return escaped.replace(/HomesBrain/g, HB);
}

// Hosted PNG house mark on the verified production domain. Inline SVG is
// stripped by Gmail Web, so a plain <img> with explicit width/height is the
// only format that renders consistently across Gmail (web+mobile), Apple
// Mail, and Outlook. Alt text keeps a graceful fallback when images are
// blocked.
const BRAND_MARK_URL = "https://homesbrain.com/__l5e/assets-v1/0b5f93c6-5ff5-4f48-ae8a-99c0dc75cfcd/homesbrain-mark.png";

export type EmailShellOptions = {
  lang?: string;
  // Top bold title next to the brand mark, e.g. "Acme Plumbing" or "HomesBrain".
  brandLine: string;
  // Uppercase small line under it, e.g. "VIA HOMESBRAIN" or "EVERY HOME REMEMBERS".
  eyebrow: string;
  // Pre-rendered inner HTML for the card (use renderH1/renderBody/etc).
  bodyHtml: string;
  // Optional small paragraph shown just under the card.
  reason?: string;
  // Optional unsubscribe URL. When present, renders unsub + opt-out lines.
  unsubUrl?: string;
  // Locale-aware footer strings for the record email; defaults are English.
  footerCopy?: ComplianceFooterCopy;
};

export function renderH1(text: string): string {
  return `<h1 style="margin:0;font-family:${FONT_STACK};font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;color:#16160f;">${protectBrand(esc(text))}</h1>`;
}

// Simple body paragraph. Pass raw text; HomesBrain mentions get wrapped
// automatically. For an emphasized span inside a sentence, pass pre-escaped
// HTML via renderBodyHtml.
export function renderBody(text: string, opts: { marginTop?: number } = {}): string {
  const mt = opts.marginTop ?? 14;
  return `<p style="margin:${mt}px 0 0;font-family:${FONT_STACK};font-size:15.5px;line-height:1.55;color:#4a4842;">${protectBrand(esc(text))}</p>`;
}

// Escape hatch when the body needs inline <strong> or already-safe HTML.
export function renderBodyHtml(html: string, opts: { marginTop?: number } = {}): string {
  const mt = opts.marginTop ?? 14;
  return `<p style="margin:${mt}px 0 0;font-family:${FONT_STACK};font-size:15.5px;line-height:1.55;color:#4a4842;">${html}</p>`;
}

export function emphasize(text: string): string {
  return `<strong style="color:#16160f;font-weight:700;">${protectBrand(esc(text))}</strong>`;
}

export function renderDetails(rows: Array<{ label: string; value: string }>): string {
  if (!rows.length) return "";
  const trs = rows
    .map(
      (r) =>
        `<tr><td style="padding:9px 0;font-family:${FONT_STACK};color:#73706a;font-size:13px;width:130px;vertical-align:top;">${protectBrand(esc(r.label))}</td><td style="padding:9px 0;font-family:${FONT_STACK};color:#16160f;font-size:14px;font-weight:600;vertical-align:top;">${protectBrand(esc(r.value))}</td></tr>`,
    )
    .join("");
  return `<div style="margin-top:22px;background:#f2f0ea;border:1px solid #e7e5de;border-radius:18px;padding:16px 20px;"><table role="presentation" style="width:100%;border-collapse:collapse;">${trs}</table></div>`;
}

export function renderCta(url: string, label: string): string {
  const safeUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<div style="margin-top:26px;"><a href="${safeUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:16px 34px;">${protectBrand(esc(label))}</a></div>`;
}

// Small trailing paragraph, muted. Good for "One tap opens..." or
// "Reply to this email...".
export function renderFinePrint(text: string): string {
  return `<p style="margin:18px 0 0;font-family:${FONT_STACK};font-size:12.5px;line-height:1.55;color:#8a877f;">${protectBrand(esc(text))}</p>`;
}

// Stronger secondary line under the CTA — darker and heavier than fine
// print, but still visually behind the button. Used for the "free, private,
// yours for life" reassurance.
export function renderReassurance(text: string): string {
  return `<p style="margin:18px 0 0;font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:#3d3b34;font-weight:600;">${protectBrand(esc(text))}</p>`;
}

function renderFooter(opts: {
  reason?: string;
  unsubUrl?: string;
  footerCopy?: ComplianceFooterCopy;
}): string {
  const copy = opts.footerCopy ?? DEFAULT_FOOTER;
  const reasonLine = opts.reason
    ? `<p style="margin:0 0 12px;font-family:${FONT_STACK};font-size:12px;line-height:1.55;color:#8a877f;">${protectBrand(esc(opts.reason))}</p>`
    : "";
  const unsubLine = opts.unsubUrl
    ? `<p style="margin:0 0 8px;font-family:${FONT_STACK};font-size:12px;line-height:1.55;color:#8a877f;"><a href="${esc(opts.unsubUrl)}" style="color:#473fb0;text-decoration:underline;">${esc(copy.unsubscribe)}</a> · ${esc(copy.optOut)}</p>`
    : "";
  return `
  <div style="margin-top:20px;padding:0 4px;">
    ${reasonLine}
    <hr style="border:none;border-top:1px solid #e7e5de;margin:12px 0;" />
    ${unsubLine}
    <p style="margin:0 0 8px;font-family:${FONT_STACK};font-size:12px;line-height:1.55;color:#8a877f;">${esc(copy.questions)} ${esc(copy.email)} <a href="mailto:${esc(CONTACT_EMAIL)}" style="color:#473fb0;text-decoration:underline;">${esc(CONTACT_EMAIL)}</a>.</p>
    <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:1.55;color:#8a877f;">${protectBrand(esc(SENDER_NAME))}<br/>${esc(POSTAL_ADDRESS)}</p>
  </div>`;
}

export function renderEmailShell(opts: EmailShellOptions): string {
  const lang = opts.lang ?? "en";
  const title = protectBrand(esc(opts.brandLine));
  const eyebrow = protectBrand(esc(opts.eyebrow));
  return `<!doctype html>
<html lang="${esc(lang)}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f2f0ea;font-family:${FONT_STACK};">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <table role="presentation" style="border-collapse:collapse;"><tr>
      <td style="vertical-align:middle;padding-right:12px;">
        <img src="${BRAND_MARK_URL}" width="40" height="40" alt="HomesBrain" style="display:block;width:40px;height:40px;border:0;outline:none;border-radius:11px;" />
      </td>
      <td style="vertical-align:middle;">
        <div style="font-family:${FONT_STACK};font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;line-height:1.2;">${title}</div>
        <div style="margin-top:2px;font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a877f;">${eyebrow}</div>
      </td>
    </tr></table>

    <div style="margin-top:22px;background:#ffffff;border:1px solid #e7e5de;border-radius:22px;padding:32px;box-shadow:0 24px 48px -30px rgba(22,22,15,0.22);">
      ${opts.bodyHtml}
    </div>
    ${renderFooter({ reason: opts.reason, unsubUrl: opts.unsubUrl, footerCopy: opts.footerCopy })}
  </div>
</body></html>`;
}
