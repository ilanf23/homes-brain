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
  renderReassurance,
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
  title: string;
  intro: (business: string, address: string, eqPhrase: string | null) => string;
  valueSentence: (hasEquipment: boolean, hasNext: boolean) => string;
  yourHome: string;
  noteFrom: (name: string) => string;
  service: string;
  equipment: string;
  nextService: string;
  homeService: string;
  equipmentServiceSuffix: string; // e.g. "service" -> "Refrigerator service"
  cta: string;
  tagline: string;
  via: string;
  reassurance: string;
  reason: (business: string, address: string) => string;
  footer: ComplianceFooterCopy;
};

const EMAIL_COPY: Record<SupportedLocale, EmailCopy> = {
  en: {
    subject: (business) =>
      business
        ? `${business} saved today's service record for your home`
        : `Your service record is ready`,
    title: "Your home remembers today's service.",
    intro: (business, address, eqPhrase) =>
      `${business || "Your pro"} created a permanent record after servicing ${eqPhrase || "your home"} at ${address}.`,
    valueSentence: (hasEquipment, hasNext) => {
      if (hasEquipment && hasNext) {
        return "Your service history, equipment details, and next recommended visit are now saved in one place.";
      }
      if (hasEquipment) {
        return "Your service history and equipment details are now saved in one place.";
      }
      if (hasNext) {
        return "Your service history and next recommended visit are now saved in one place.";
      }
      return "Your service history is now saved in one place.";
    },
    yourHome: "your home",
    noteFrom: (name) => `A note from ${name || "your pro"}`,
    service: "Service",
    equipment: "Equipment",
    nextService: "Next service",
    homeService: "Home service",
    equipmentServiceSuffix: "service",
    cta: "View today's home record",
    tagline: "Every visit builds your home's living record. Free for life.",
    via: "via HomesBrain",
    reassurance: "Free, private, and yours for life.",
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
        ? `${business} guardó el registro de servicio de hoy para tu hogar`
        : `Tu registro de servicio está listo`,
    title: "Tu hogar recuerda el servicio de hoy.",
    intro: (business, address, eqPhrase) =>
      `${business || "Tu profesional"} creó un registro permanente después de dar servicio a ${eqPhrase || "tu hogar"} en ${address}.`,
    valueSentence: (hasEquipment, hasNext) => {
      if (hasEquipment && hasNext) {
        return "Tu historial de servicio, los detalles del equipo y la próxima visita recomendada quedan guardados en un solo lugar.";
      }
      if (hasEquipment) {
        return "Tu historial de servicio y los detalles del equipo quedan guardados en un solo lugar.";
      }
      if (hasNext) {
        return "Tu historial de servicio y la próxima visita recomendada quedan guardados en un solo lugar.";
      }
      return "Tu historial de servicio queda guardado en un solo lugar.";
    },
    yourHome: "tu hogar",
    noteFrom: (name) => `Una nota de ${name || "tu profesional"}`,
    service: "Servicio",
    equipment: "Equipo",
    nextService: "Próximo servicio",
    homeService: "Servicio en el hogar",
    equipmentServiceSuffix: "servicio",
    cta: "Ver el registro de hoy",
    tagline:
      "Cada visita construye el historial vivo de tu hogar. Gratis de por vida.",
    via: "a través de HomesBrain",
    reassurance: "Gratis, privado y tuyo de por vida.",
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
        ? `${business} сохранил сегодняшнюю запись обслуживания вашего дома`
        : `Ваша запись об обслуживании готова`,
    title: "Ваш дом помнит сегодняшнее обслуживание.",
    intro: (business, address, eqPhrase) =>
      `${business || "Ваш специалист"} создал постоянную запись после обслуживания ${eqPhrase || "вашего дома"} по адресу ${address}.`,
    valueSentence: (hasEquipment, hasNext) => {
      if (hasEquipment && hasNext) {
        return "История обслуживания, характеристики оборудования и следующий рекомендуемый визит теперь собраны в одном месте.";
      }
      if (hasEquipment) {
        return "История обслуживания и характеристики оборудования теперь собраны в одном месте.";
      }
      if (hasNext) {
        return "История обслуживания и следующий рекомендуемый визит теперь собраны в одном месте.";
      }
      return "История обслуживания теперь собрана в одном месте.";
    },
    yourHome: "вашего дома",
    noteFrom: (name) => `Заметка от ${name || "вашего специалиста"}`,
    service: "Услуга",
    equipment: "Оборудование",
    nextService: "Следующее обслуживание",
    homeService: "Обслуживание дома",
    equipmentServiceSuffix: "обслуживание",
    cta: "Открыть сегодняшнюю запись",
    tagline:
      "Каждый визит дополняет живую историю вашего дома. Бесплатно навсегда.",
    via: "через HomesBrain",
    reassurance: "Бесплатно, приватно и навсегда ваше.",
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
        ? `${business} зберіг сьогоднішній запис обслуговування для вашого дому`
        : `Ваш запис обслуговування готовий`,
    title: "Ваш дім пам'ятає сьогоднішнє обслуговування.",
    intro: (business, address, eqPhrase) =>
      `${business || "Ваш фахівець"} створив постійний запис після обслуговування ${eqPhrase || "вашого дому"} за адресою ${address}.`,
    valueSentence: (hasEquipment, hasNext) => {
      if (hasEquipment && hasNext) {
        return "Історія обслуговування, характеристики обладнання та наступний рекомендований візит тепер зібрані в одному місці.";
      }
      if (hasEquipment) {
        return "Історія обслуговування та характеристики обладнання тепер зібрані в одному місці.";
      }
      if (hasNext) {
        return "Історія обслуговування та наступний рекомендований візит тепер зібрані в одному місці.";
      }
      return "Історія обслуговування тепер зібрана в одному місці.";
    },
    yourHome: "вашого дому",
    noteFrom: (name) => `Нотатка від ${name || "вашого фахівця"}`,
    service: "Послуга",
    equipment: "Обладнання",
    nextService: "Наступне обслуговування",
    homeService: "Обслуговування дому",
    equipmentServiceSuffix: "обслуговування",
    cta: "Відкрити сьогоднішній запис",
    tagline:
      "Кожен візит доповнює живу історію вашого дому. Безкоштовно назавжди.",
    via: "через HomesBrain",
    reassurance: "Безкоштовно, приватно й назавжди ваше.",
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

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

// Local, table-based note panel to sidestep border-left quirks in Outlook.
// A small coral dot before the eyebrow is the single restrained homeowner
// accent in an otherwise indigo email.
const NOTE_FONT_STACK = `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
function renderNotePanel(label: string, body: string): string {
  const safeLabel = esc(label);
  const safeBody = esc(body);
  return `
  <table role="presentation" style="width:100%;border-collapse:separate;margin-top:22px;background:#f2f0ea;border:1px solid #e7e5de;border-radius:18px;">
    <tr>
      <td style="width:4px;background:#473fb0;border-top-left-radius:18px;border-bottom-left-radius:18px;">&nbsp;</td>
      <td style="padding:16px 20px;">
        <div style="font-family:${NOTE_FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#473fb0;">
          <span style="color:#c2461f;">&bull;</span>&nbsp;${safeLabel}
        </div>
        <p style="margin:8px 0 0;font-family:${NOTE_FONT_STACK};font-size:15px;line-height:1.6;color:#16160f;font-style:italic;">${safeBody}</p>
      </td>
    </tr>
  </table>`;
}

function recordEmail(opts: {
  locale: SupportedLocale;
  business: string;
  logo: string | null;
  noteName: string; // pro first name if available, otherwise business
  address: string;
  whatDone: string | null;
  equipment: EquipmentPreview | null;
  nextServiceDate: string | null;
  ctaUrl: string;
  unsubUrl: string;
  translatedWhatDone?: string | null;
  translatedEquipmentType?: string | null;
}) {
  const {
    locale,
    business,
    logo,
    noteName,
    address,
    whatDone,
    equipment,
    nextServiceDate,
    ctaUrl,
    unsubUrl,
    translatedWhatDone,
    translatedEquipmentType,
  } = opts;
  const copy = EMAIL_COPY[locale];
  const displayBusiness = business || "";
  const cta = copy.cta;
  const localizedWork = (translatedWhatDone ?? whatDone ?? "").trim();
  const eqLine = equipmentLine(equipment, translatedEquipmentType);
  const eqPhrase = eqLine ? eqLine : null;
  const nextServiceFormatted = nextServiceDate
    ? formatEmailDate(nextServiceDate, locale)
    : null;

  // Concise service label derived from structured data — never the raw
  // what_done sentence (that text already lives in the note panel).
  const eqTypeLocalized = (translatedEquipmentType ?? equipment?.type ?? "")
    .trim();
  const serviceLabel = eqTypeLocalized
    ? `${eqTypeLocalized} ${copy.equipmentServiceSuffix}`
    : copy.homeService;

  const detailRows: Array<{ label: string; value: string }> = [
    { label: copy.service, value: serviceLabel },
  ];
  if (eqLine) detailRows.push({ label: copy.equipment, value: eqLine });
  if (nextServiceFormatted) {
    detailRows.push({ label: copy.nextService, value: nextServiceFormatted });
  }

  const introEscaped = esc(copy.intro(displayBusiness, address, eqPhrase));
  let introHtml = introEscaped;
  if (displayBusiness) {
    introHtml = introHtml.replace(esc(displayBusiness), emphasize(displayBusiness));
  }
  introHtml = introHtml.replace(esc(address), emphasize(address));

  const valueSentence = copy.valueSentence(!!eqLine, !!nextServiceFormatted);

  const noteHtml = localizedWork
    ? renderNotePanel(copy.noteFrom(noteName || displayBusiness), localizedWork)
    : "";

  const bodyHtml = [
    renderH1(copy.title),
    renderBodyHtml(introHtml),
    renderBodyHtml(esc(valueSentence)),
    noteHtml,
    renderDetails(detailRows),
    renderCta(ctaUrl, cta),
    renderReassurance(copy.reassurance),
  ].filter(Boolean).join("\n");

  // Plain-text mirror follows the same hierarchy.
  const textLines = [
    copy.title,
    "",
    copy.intro(displayBusiness, address, eqPhrase),
    "",
    valueSentence,
  ];
  if (localizedWork) {
    textLines.push(
      "",
      `${copy.noteFrom(noteName || displayBusiness)}:`,
      `"${localizedWork}"`,
    );
  }
  const summaryLines: string[] = [
    `${copy.service}: ${serviceLabel}`,
  ];
  if (eqLine) summaryLines.push(`${copy.equipment}: ${eqLine}`);
  if (nextServiceFormatted) {
    summaryLines.push(`${copy.nextService}: ${nextServiceFormatted}`);
  }
  textLines.push("", ...summaryLines);
  textLines.push("", `${cta}: ${ctaUrl}`, "", copy.reassurance, "", copy.via);
  const reason = copy.reason(displayBusiness, address);
  textLines.push(complianceFooterText(unsubUrl, reason, copy.footer));

  // logo image is intentionally not shown in the branded shell header; the
  // approved design uses the HomesBrain house mark + business name title.
  void logo;
  void isHttpsUrl;

  const html = renderEmailShell({
    lang: locale,
    brandLine: business,
    eyebrow: copy.via,
    bodyHtml,
    reason,
    unsubUrl,
    footerCopy: copy.footer,
  });
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
        "id,created_at,what_done,equipment_id,next_service_date,localized_content,records(id,created_at)",
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
    const proFirstName = (pro.owner_first_name ?? "")
      .replace(/[<>]/g, "")
      .trim();
    const email = recordEmail({
      locale: localeUsed,
      business: safeBusiness,
      logo: pro.logo ?? null,
      noteName: proFirstName || safeBusiness,
      address,
      whatDone: latestJob?.what_done ?? null,
      equipment,
      nextServiceDate: latestJob?.next_service_date ?? null,
      ctaUrl,
      unsubUrl,
      translatedWhatDone: translationUsed ? translatedWhatDone : null,
      translatedEquipmentType: translationUsed ? translatedEquipmentType : null,
    });
    void claimed;

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
