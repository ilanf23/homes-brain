/* Per-record homeowner notification. Every new job triggers one email
   telling the homeowner a new service record was added to their home.

   The CTA in the email is now a branded homesbrain.com/claim/:token
   link. That token is minted here (single-use, hashed at rest, 7-day
   TTL) and consumed by the /claim/:token page + claim-exchange edge
   function. No supabase.co URL is exposed to the homeowner.

   verify_jwt stays off at the gateway for compatibility with current key
   formats; the handler validates the caller's session and derives its pro. */

import {
  buildUnsubUrl,
  complianceFooterText,
  getUnsubToken,
  isEmailOptedOut,
  listUnsubscribeHeaders,
} from "../_shared/email-compliance.ts";
import type { ComplianceFooterCopy } from "../_shared/email-compliance.ts";
import {
  renderBodyHtml,
  renderCta,
  renderDetails,
  renderEmailShell,
  renderFinePrint,
  renderH1,
  emphasize,
} from "../_shared/email-shell.ts";
import { authenticatePro } from "../_shared/pro-auth.ts";
import {
  isSupportedLocale,
  LOCALE_TAGS,
  type SupportedLocale,
} from "../_shared/locales.ts";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_LIMIT = 200; // per-pro sends in a rolling 24h window
const FALLBACK_ORIGIN = "https://homesbrain.com";
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/(www\.)?homesbrain\.com$/,
];
const EMAIL_TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function claimOrigin(raw: unknown): string {
  if (typeof raw !== "string") return FALLBACK_ORIGIN;
  return ALLOWED_ORIGINS.some((re) => re.test(raw)) ? raw : FALLBACK_ORIGIN;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function base64url(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isHttpsUrl(v: unknown): v is string {
  return typeof v === "string" && /^https:\/\//i.test(v);
}

type EquipmentPreview = {
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
};

function equipmentLine(
  eq: EquipmentPreview | null,
  translatedType?: string | null,
): string | null {
  if (!eq) return null;
  const parts = [translatedType ?? eq.type, eq.make, eq.model].filter(
    (x): x is string => !!x && !!x.trim(),
  );
  if (!parts.length) return null;
  return parts.join(" ");
}

type EmailCopy = {
  subject: (business: string) => string;
  addedAt: (business: string, address: string) => string;
  record: string;
  address: string;
  work: string;
  equipment: string;
  warranty: string;
  warrantyThrough: (date: string) => string;
  openHome: string;
  claimRecord: string;
  tagline: string;
  via: string;
  title: (business: string) => string;
  description: (business: string) => string;
  oneTap: string;
  reason: (business: string, address: string) => string;
  footer: ComplianceFooterCopy;
};

const EMAIL_COPY: Record<SupportedLocale, EmailCopy> = {
  en: {
    subject: (business) =>
      business
        ? `${business} added a service record for your home`
        : `You have a new service record`,
    addedAt: (business, address) =>
      `${business} added a new service record to your home at ${address}.`,
    record: "Record",
    address: "Address",
    work: "Work done",
    equipment: "Equipment",
    warranty: "Warranty",
    warrantyThrough: (date) => `Warranty through ${date}`,
    openHome: "Add record",
    claimRecord: "Add record",
    tagline: "Every visit builds your home's living record. Free for life.",
    via: "via HomesBrain",
    title: (business) =>
      business
        ? `${business} added a service record for your home`
        : `You have a new service record`,
    description: (business) =>
      `${business || "Your pro"} added a new record to your home. It's saved to your address for life. Free.`,
    oneTap:
      "One tap opens your record and signs you in. This link only works from your inbox.",
    reason: (business, address) =>
      `You're receiving this because ${business || "your pro"} services your home at ${address}. HomesBrain hosts the record on their behalf.`,
    footer: {
      unsubscribe: "Unsubscribe",
      optOut: "You can opt out of these emails at any time.",
      questions: "Questions?",
      email: "Email",
    },
  },
  es: {
    subject: (business) =>
      business
        ? `${business} agregó un registro de servicio para tu hogar`
        : `Tienes un nuevo registro de servicio`,
    addedAt: (business, address) =>
      `${business} agregó un nuevo registro de servicio para tu hogar en ${address}.`,
    record: "Registro",
    address: "Dirección",
    work: "Trabajo realizado",
    equipment: "Equipo",
    warranty: "Garantía",
    warrantyThrough: (date) => `Garantía hasta ${date}`,
    openHome: "Agregar registro",
    claimRecord: "Agregar registro",
    tagline:
      "Cada visita construye el historial vivo de tu hogar. Gratis de por vida.",
    via: "a través de HomesBrain",
    title: (business) =>
      business
        ? `${business} agregó un registro de servicio para tu hogar`
        : `Tienes un nuevo registro de servicio`,
    description: (business) =>
      `${business || "Tu profesional"} agregó un nuevo registro a tu hogar. Queda guardado en tu dirección de por vida. Gratis.`,
    oneTap:
      "Un toque abre tu registro e inicia tu sesión. Este enlace solo funciona desde tu correo.",
    reason: (business, address) =>
      `Recibes este correo porque ${business || "tu profesional"} presta servicio a tu hogar en ${address}. HomesBrain aloja el registro en su nombre.`,
    footer: {
      unsubscribe: "Darse de baja",
      optOut: "Puedes dejar de recibir estos correos en cualquier momento.",
      questions: "¿Preguntas?",
      email: "Escribe a",
    },
  },
  ru: {
    subject: (business) =>
      business
        ? `${business} добавил запись об обслуживании вашего дома`
        : `У вас новая запись об обслуживании`,
    addedAt: (business, address) =>
      `${business} добавил новую запись об обслуживании вашего дома по адресу ${address}.`,
    record: "Запись",
    address: "Адрес",
    work: "Выполненные работы",
    equipment: "Оборудование",
    warranty: "Гарантия",
    warrantyThrough: (date) => `Гарантия до ${date}`,
    openHome: "Добавить запись",
    claimRecord: "Добавить запись",
    tagline:
      "Каждый визит дополняет живую историю вашего дома. Бесплатно навсегда.",
    via: "через HomesBrain",
    title: (business) =>
      business
        ? `${business} добавил запись об обслуживании вашего дома`
        : `У вас новая запись об обслуживании`,
    description: (business) =>
      `${business || "Ваш специалист"} добавил новую запись о вашем доме. Она навсегда сохранена за вашим адресом. Бесплатно.`,
    oneTap:
      "Одно нажатие откроет запись и выполнит вход. Ссылка работает только из вашего почтового ящика.",
    reason: (business, address) =>
      `Вы получили это письмо, потому что ${business || "ваш специалист"} обслуживает ваш дом по адресу ${address}. HomesBrain хранит запись от имени компании.`,
    footer: {
      unsubscribe: "Отписаться",
      optOut: "Вы можете отказаться от этих писем в любое время.",
      questions: "Есть вопросы?",
      email: "Напишите на",
    },
  },
  uk: {
    subject: (business) =>
      business
        ? `${business} додав запис про обслуговування вашого дому`
        : `У вас новий запис про обслуговування`,
    addedAt: (business, address) =>
      `${business} додав новий запис про обслуговування вашого дому за адресою ${address}.`,
    record: "Запис",
    address: "Адреса",
    work: "Виконані роботи",
    equipment: "Обладнання",
    warranty: "Гарантія",
    warrantyThrough: (date) => `Гарантія до ${date}`,
    openHome: "Додати запис",
    claimRecord: "Додати запис",
    tagline:
      "Кожен візит доповнює живу історію вашого дому. Безкоштовно назавжди.",
    via: "через HomesBrain",
    title: (business) =>
      business
        ? `${business} додав запис про обслуговування вашого дому`
        : `У вас новий запис про обслуговування`,
    description: (business) =>
      `${business || "Ваш фахівець"} додав новий запис про ваш дім. Він назавжди зберігається за вашою адресою. Безкоштовно.`,
    oneTap:
      "Одне натискання відкриє запис і виконає вхід. Посилання працює лише з вашої поштової скриньки.",
    reason: (business, address) =>
      `Ви отримали цей лист, тому що ${business || "ваш фахівець"} обслуговує ваш дім за адресою ${address}. HomesBrain зберігає запис від імені компанії.`,
    footer: {
      unsubscribe: "Відписатися",
      optOut: "Ви можете відмовитися від цих листів у будь-який час.",
      questions: "Є запитання?",
      email: "Напишіть на",
    },
  },
};


function formatEmailDate(raw: string, locale: SupportedLocale): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00Z`)
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function cleanTranslation(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= max ? cleaned : null;
}

function recordEmail(opts: {
  locale: SupportedLocale;
  business: string;
  logo: string | null;
  address: string;
  whatDone: string | null;
  equipment: EquipmentPreview | null;
  ctaUrl: string;
  claimed: boolean;
  unsubUrl: string;
  translatedWhatDone?: string | null;
  translatedEquipmentType?: string | null;
}) {
  const {
    locale,
    business,
    logo,
    address,
    whatDone,
    equipment,
    ctaUrl,
    claimed,
    unsubUrl,
    translatedWhatDone,
    translatedEquipmentType,
  } = opts;
  const copy = EMAIL_COPY[locale];
  const cta = claimed ? copy.openHome : copy.claimRecord;
  const localizedWork = translatedWhatDone ?? whatDone;
  const eqLine = equipmentLine(equipment, translatedEquipmentType);
  const warranty = equipment?.warranty_until
    ? copy.warrantyThrough(formatEmailDate(equipment.warranty_until, locale))
    : null;
  const textLines = [
    copy.addedAt(business, address),
    "",
    copy.record,
    `${copy.address}: ${address}`,
  ];
  if (localizedWork?.trim()) {
    textLines.push(`${copy.work}: ${localizedWork.trim()}`);
  }
  if (eqLine) textLines.push(`${copy.equipment}: ${eqLine}`);
  if (warranty) textLines.push(warranty);
  textLines.push("", `${cta}: ${ctaUrl}`, "", copy.tagline, "", copy.via);
  const reason = copy.reason(business, address);
  textLines.push(complianceFooterText(unsubUrl, reason, copy.footer));

  const b = esc(business);
  const a = esc(address);
  const w = localizedWork?.trim() ? esc(localizedWork.trim()) : "";
  const eqEsc = eqLine ? esc(eqLine) : "";
  const warrantyEsc = warranty ? esc(warranty) : "";

  const header = logo && isHttpsUrl(logo)
    ? `<img src="${
      esc(logo)
    }" alt="${b}" style="max-height:44px;max-width:220px;display:block;" />`
    : `<div translate="no" class="notranslate" style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#16160f;">${b}</div>`;

  const previewRows = [
    `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;width:110px;">${
      esc(copy.address)
    }</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${a}</td></tr>`,
    w
      ? `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;">${
        esc(copy.work)
      }</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${w}</td></tr>`
      : "",
    eqEsc
      ? `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;">${
        esc(copy.equipment)
      }</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${eqEsc}</td></tr>`
      : "",
    warrantyEsc
      ? `<tr><td style="padding:8px 0;color:#73706a;font-size:13px;">${
        esc(copy.warranty)
      }</td><td style="padding:8px 0;color:#16160f;font-size:14px;font-weight:600;">${warrantyEsc}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `<!doctype html>
<html lang="${locale}"><body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="display:flex;align-items:center;gap:12px;">${header}</div>
    <div translate="no" class="notranslate" style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#73706a;">${
    esc(copy.via)
  }</div>

    <div style="margin-top:18px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
      <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">${
    esc(copy.title(business))
  }</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#73706a;">${
    esc(copy.description(business))
  }</p>
      <table role="presentation" style="width:100%;margin-top:18px;border-collapse:collapse;border-top:1px solid #e7e5de;">${previewRows}</table>
      <div style="margin-top:22px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">${cta}</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">${
    esc(copy.oneTap)
  }</p>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">${
    esc(reason)
  }</p>
    ${complianceFooterHtml(unsubUrl, undefined, copy.footer)}
  </div>
</body></html>`;
  return {
    subject: copy.subject(business),
    text: textLines.join("\n"),
    html,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }

  try {
    const auth = await authenticatePro(req);
    if (!auth) return json({ ok: false, code: "unauthorized" }, 401);
    const { admin, pro } = auth;

    const body = await req.json();
    const { customer_id, pro_id, origin, record_id, translations } = body;
    if (typeof customer_id !== "string" || !customer_id) {
      console.error("invite-claim bad_request", {
        hasBody: !!body,
        keys: body && typeof body === "object" ? Object.keys(body) : [],
        customerIdType: typeof customer_id,
        customerIdEmpty: customer_id === "",
        recordIdType: typeof record_id,
      });
      return json({ ok: false, code: "bad_request" }, 400);
    }
    // Older clients still send pro_id. Accept it only when it matches the
    // authenticated identity; new clients can omit it entirely.
    if (typeof pro_id === "string" && pro_id && pro_id !== pro.id) {
      return json({ ok: false, code: "forbidden", stage: "pro" }, 403);
    }

    const { data: customer, error: custErr } = await admin
      .from("customers")
      .select(
        "id,pro_id,home_id,email,claim_invited_at,preferred_locale,homes(address,claimed_at)",
      )
      .eq("id", customer_id)
      .maybeSingle();
    if (!customer || customer.pro_id !== pro.id) {
      console.error("invite-claim customer check failed", {
        customer_id,
        hasCustomer: !!customer,
        custPro: customer?.pro_id,
        pro: pro.id,
        custErr,
      });
      return json({ ok: false, code: "forbidden", stage: "customer" }, 403);
    }

    const home = Array.isArray(customer.homes)
      ? customer.homes[0]
      : customer.homes;
    if (!customer.email) return json({ ok: false, code: "no_email" });
    const requestedLocale: SupportedLocale = isSupportedLocale(body?.locale)
      ? body.locale
      : isSupportedLocale(customer.preferred_locale)
      ? customer.preferred_locale
      : "en";

    // Honor CAN-SPAM opt-outs before doing any send-side work.
    if (await isEmailOptedOut(admin, customer.email)) {
      return json({ ok: false, code: "opted_out" });
    }
    const unsubToken = await getUnsubToken(admin, customer.email);
    if (!unsubToken) {
      return json({ ok: false, code: "unsub_token_failed" }, 500);
    }
    const unsubUrl = buildUnsubUrl(unsubToken);

    // Per-pro daily cap protects the sending domain reputation.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: sentToday } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("kind", "record_notice")
      .eq("channel", "email")
      .gt("created_at", since);
    if ((sentToday ?? 0) >= DAILY_LIMIT) {
      return json({ ok: false, code: "daily_limit" });
    }

    // Latest job for this home + pro gives us the "what was done" summary
    // and (via records) the record id we hand to /auth/callback for claim.
    const { data: jobRows } = await admin
      .from("jobs")
      .select(
        "id,created_at,what_done,equipment_id,localized_content,records(id,created_at)",
      )
      .eq("home_id", customer.home_id)
      .eq("pro_id", pro.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestJob = jobRows?.[0] ?? null;
    const jobRecords = (latestJob?.records ?? []) as {
      id: string;
      created_at: string;
    }[];
    const latestRecordId = jobRecords.slice().sort((
      a,
      b,
    ) => (a.created_at < b.created_at ? 1 : -1))[0]?.id ?? null;

    // Trust an explicit record_id only when it actually belongs to a job by
    // this pro on this customer's home.
    let claimRecordId: string | null = null;
    if (typeof record_id === "string" && record_id) {
      const { data: verify } = await admin
        .from("records")
        .select("id,jobs!inner(pro_id,home_id)")
        .eq("id", record_id)
        .maybeSingle();
      const jrec = verify as unknown as {
        jobs?: { pro_id: string; home_id: string };
      } | null;
      if (
        jrec?.jobs?.pro_id === pro.id && jrec.jobs.home_id === customer.home_id
      ) {
        claimRecordId = record_id;
      }
    }
    if (!claimRecordId) claimRecordId = latestRecordId;

    // Equipment preview for the email body.
    let equipment: EquipmentPreview | null = null;
    if (latestJob?.equipment_id) {
      const { data: eq } = await admin
        .from("equipment")
        .select("type,make,model,warranty_until")
        .eq("id", latestJob.equipment_id)
        .maybeSingle();
      if (eq) equipment = eq;
    }

    const translatedWhatDone = cleanTranslation(translations?.what_done, 4000);
    const translatedEquipmentType = cleanTranslation(
      translations?.equipment_type,
      300,
    );
    const translationProvided = !!(translatedWhatDone || translatedEquipmentType);
    const translationComplete =
      (!latestJob?.what_done?.trim() || !!translatedWhatDone) &&
      (!equipment?.type?.trim() || !!translatedEquipmentType);
    // English sends either way: with no translations the record text is
    // assumed to already be English, and a pro who authored the record in
    // another language supplies an English translation like any other target.
    const localeUsed: SupportedLocale =
      requestedLocale === "en" || translationComplete ? requestedLocale : "en";
    const translationFallback = localeUsed !== requestedLocale;
    const translationUsed = translationProvided && translationComplete &&
      localeUsed === requestedLocale;

    // Snapshot the exact translation shown in Review. The original job text
    // remains untouched and each locale lives under its own JSON key.
    if (translationUsed && latestJob?.id) {
      const prior = latestJob.localized_content &&
          typeof latestJob.localized_content === "object" &&
          !Array.isArray(latestJob.localized_content)
        ? latestJob.localized_content
        : {};
      const { error: localizedError } = await admin
        .from("jobs")
        .update({
          localized_content: {
            ...prior,
            [localeUsed]: {
              what_done: translatedWhatDone,
              equipment_type: translatedEquipmentType,
            },
          },
        })
        .eq("id", latestJob.id)
        .eq("pro_id", pro.id);
      if (localizedError) {
        console.error("invite-claim localized snapshot failed", localizedError);
      }
    }

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const originUrl = claimOrigin(origin);
    const address = home?.address ?? "your home";
    const claimed = !!home?.claimed_at;

    // Mint a branded, single-use, hashed, expiring claim token whenever we
    // have a record to point at. For unclaimed homes claim_home attaches the
    // home to the homeowner; for already-claimed homes it's a no-op and the
    // /claim/:token page just signs the homeowner in and opens the record.
    let ctaUrl = `${originUrl}/home?lang=${localeUsed}`;
    if (claimRecordId) {
      const raw = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await sha256Hex(raw);
      const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS).toISOString();
      const { error: tokErr } = await admin.from("claim_tokens").insert({
        token_hash: tokenHash,
        record_id: claimRecordId,
        home_id: customer.home_id,
        pro_id: pro.id,
        email: customer.email,
        locale: localeUsed,
        expires_at: expiresAt,
      });
      if (tokErr) {
        console.error("invite-claim token insert failed", tokErr);
      } else {
        ctaUrl = `${originUrl}/claim/${raw}?lang=${localeUsed}`;
      }
    }

    const safeBusiness = (pro.business ?? "").replace(/[<>]/g, "").trim();
    const email = recordEmail({
      locale: localeUsed,
      business: safeBusiness,
      logo: pro.logo ?? null,
      address,
      whatDone: latestJob?.what_done ?? null,
      equipment,
      ctaUrl,
      claimed,
      unsubUrl,
      translatedWhatDone: translationUsed ? translatedWhatDone : null,
      translatedEquipmentType: translationUsed ? translatedEquipmentType : null,
    });

    // Display name is the pro; sending address stays on the verified
    // homesbrain.com domain so deliverability doesn't crater. Fall back to
    // plain "HomesBrain" when the pro has no business name yet, so a blank
    // never leaks into the sender line.
    const fromDisplay = safeBusiness
      ? `${safeBusiness} via HomesBrain`
      : `HomesBrain`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromDisplay} <invites@homesbrain.com>`,
        to: [customer.email],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: listUnsubscribeHeaders(unsubToken),
      }),
    });
    if (!resp.ok) {
      console.error("resend error", resp.status, await resp.text());
      return json({ ok: false, code: "send_failed" }, 502);
    }

    const now = new Date().toISOString();
    if (!customer.claim_invited_at) {
      const { error: stampError } = await admin
        .from("customers")
        .update({ claim_invited_at: now })
        .eq("id", customer.id);
      if (stampError) console.error("invite-claim stamp failed", stampError);
    }
    const { error: messageError } = await admin.from("messages").insert({
      channel: "email",
      to_contact: customer.email,
      body: email.text,
      kind: "record_notice",
      locale: localeUsed,
    });
    if (messageError) {
      console.error("invite-claim message log failed", messageError);
    }

    return json({
      ok: true,
      sent_at: now,
      locale_used: localeUsed,
      translation_fallback: translationFallback,
    });
  } catch (e) {
    console.error("invite-claim error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
