import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Avatar,
  Btn,
  Card,
  Field,
  Input,
  PhoneInput,
  Pill,
  StepBar,
  Textarea,
  Toast,
} from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { useProGuard } from "@/components/pro-shell";
import { ClaimQRModal } from "@/components/claim-qr-modal";
import { Celebration } from "@/components/celebration";
import { AlertTriangle, Check, Pencil, QrCode } from "lucide-react";
import {
  buildRecordUrl,
  checkRecall,
  formatDate,
  geocodeHome,
  haversineMeters,
  logEvent,
  normalizeAddress,
  tradeLabel,
} from "@/lib/hb";
import { createInvoice, formatMoney } from "@/lib/invoices";

import { reverseGeocode, type ResolvedAddress } from "@/lib/geo";
import { AddressField } from "@/components/address-field";
import {
  extractFromNotes,
  extractFullJob,
  scanNameplate,
  useDictation,
  useMicLevel,
} from "@/lib/capture";
import { CameraIcon, CheckBurst, Logo, MicIcon, ShieldCheck, UserPlusIcon } from "@/components/svg";
import { VoiceCaptureOverlay } from "@/components/voice-orb";
import { Select } from "@/lib/ui";
import {
  fetchTradeFields,
  fetchTrades,
  type TradeField,
  type TradeOption,
} from "@/lib/trade-fields";
import {
  cleanAttributes,
  TradeFieldInputs,
  type AttributeValues,
} from "@/components/trade-field-inputs";
import { LanguageToggle, LOCALES, isLocale, useI18n, useT, type Locale } from "@/lib/i18n";
import { customerPreviewCopy } from "@/lib/customer-locales";

export const Route = createFileRoute("/pro/jobs/new")({
  head: () => ({ meta: [{ title: "Log a job - HomesBrain" }] }),
  component: NewJob,
});

type Stage = "customer" | "location" | "work" | "review" | "done";
type CustomerOpt = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  preferred_locale: Locale;
  home_id: string;
  homes: {
    address: string;
    lat: number | null;
    lng: number | null;
    geocoded_at: string | null;
  } | null;
};
type ApplianceOpt = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
  attributes: Record<string, string | boolean> | null;
  last_job_at: string | null;
  job_count: number;
};
type JobHistoryRow = { id: string; what_done: string; created_at: string };

type VoiceCustomerExtract = {
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
};

type ReviewEdit = "customer" | "address" | "equipment" | "work" | "next_service" | null;

function normalizedPhone(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? digits.slice(-10) : "";
}

function findVoiceCustomer(existing: CustomerOpt[], extract: VoiceCustomerExtract) {
  const email = extract.customer_email?.trim().toLowerCase() ?? "";
  const phone = normalizedPhone(extract.customer_phone);
  const name = extract.customer_name?.trim().toLowerCase() ?? "";
  const address = extract.address ? normalizeAddress(extract.address) : "";

  const contactMatches = existing.filter((customer) => {
    const emailMatches = email && customer.email?.trim().toLowerCase() === email;
    const phoneMatches = phone && normalizedPhone(customer.phone) === phone;
    return emailMatches || phoneMatches;
  });
  if (contactMatches.length === 1) return contactMatches[0];

  const nameAndAddressMatches = existing.filter(
    (customer) =>
      name &&
      address &&
      customer.name.trim().toLowerCase() === name &&
      !!customer.homes?.address &&
      normalizeAddress(customer.homes.address) === address,
  );
  return nameAndAddressMatches.length === 1 ? nameAndAddressMatches[0] : undefined;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function deliveryErrorMessage(code: string | null) {
  if (code === "opted_out") return "This customer has opted out of email.";
  if (code === "daily_limit") return "Your daily email limit has been reached.";
  if (code === "not_configured") return "Email delivery is temporarily unavailable.";
  if (code === "no_email") return "Add the customer's email before sending.";
  if (code === "bad_request") return "The email couldn't be sent — the record is missing details. Try again.";
  if (code === "forbidden") return "You don't have access to send for this customer.";
  if (code === "unauthorized") return "Your session expired. Sign in again and retry.";
  if (code === "send_failed") return "The email service rejected the send. Try again in a moment.";
  return "Check your connection and try the email again.";
}

const STAGES: Stage[] = ["customer", "location", "work", "review"];
const STAGE_LABELS = ["Customer", "Location", "The work", "Send"];

/* Canonical keys for the optional record rows the pro can hide from the
   customer. Stored on records.hidden_fields; the homeowner-side dashboard
   uses these to hide the corresponding rows in the equipment/job view. */
const FIELD_CUSTOMER = "customer";
const FIELD_EQUIPMENT = "equipment";
const FIELD_MAKE_MODEL = "make_model";
const FIELD_WORK_DONE = "work_done";
const FIELD_NEXT_SERVICE = "next_service";
const FIELD_RECALL = "recall";

/* Small square checkmark used as the "include this row" control. */
function CheckSquare({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        on ? "border-indigo bg-indigo" : "border-line bg-paper"
      }`}
      aria-hidden="true"
    >
      {on && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke="var(--on-accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

/* One row of the live record. The check controls customer visibility while the
   value opens its editor; excluded rows dim and strike through. */
function RecordRow({
  label,
  value,
  included,
  onToggle,
  onEdit,
}: {
  label: string;
  value: ReactNode;
  included: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
}) {
  const dim = !included;
  return (
    <div className="flex w-full items-start justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={included}
        aria-label={`${included ? "Exclude" : "Include"} ${label}`}
        className="pressable flex min-h-11 shrink-0 items-center gap-2.5 text-left"
      >
        <CheckSquare on={included} />
        <span className={`text-sm text-muted ${dim ? "opacity-50" : ""}`}>{label}</span>
      </button>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          className="pressable flex min-h-11 min-w-0 items-center justify-end gap-2 text-right"
        >
          <span
            className={`min-w-0 text-[13px] font-semibold text-ink font-mono tnum ${
              dim ? "opacity-50 line-through" : ""
            }`}
          >
            {value}
          </span>
          <Pencil size={16} className="shrink-0 text-muted" aria-hidden="true" />
        </button>
      ) : (
        <span
          className={`min-w-0 py-3 text-right text-[13px] font-semibold text-ink font-mono tnum ${
            dim ? "opacity-50 line-through" : ""
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function ReviewEditor({
  children,
  onDone,
  doneDisabled = false,
}: {
  children: ReactNode;
  onDone: () => void;
  doneDisabled?: boolean;
}) {
  return (
    <div className="flex items-end gap-2 border-b border-line bg-soft/60 px-3 py-3">
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onDone}
        disabled={doneDisabled}
        aria-label="Done editing"
        title="Done editing"
        className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check size={19} aria-hidden="true" />
      </button>
    </div>
  );
}

function NewJob() {
  const navigate = useNavigate();
  const t = useT();
  const { locale: uiLocale } = useI18n();
  const uiCopy = customerPreviewCopy(uiLocale);
  const { proId, pro } = useProGuard();
  const proName = pro?.business ?? "";
  const proTrade = pro?.trade ?? "";
  const [stage, setStage] = useState<Stage>("customer");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Customer
  const [existing, setExisting] = useState<CustomerOpt[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomer, setNewCustomer] = useState({ name: "", address: "", phone: "", email: "" });
  const [customerLocale, setCustomerLocale] = useState<Locale>("en");
  const [translatedRecord, setTranslatedRecord] = useState<{
    whatDone: string | null;
    equipmentType: string | null;
  } | null>(null);
  const [translationState, setTranslationState] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const [deliveryLocale, setDeliveryLocale] = useState<Locale>("en");
  const [translationFallback, setTranslationFallback] = useState(false);

  const [query, setQuery] = useState("");

  // Location slide: the address for an existing customer (prefilled from file,
  // editable). `resolved` holds the last address we have coordinates for (from
  // GPS reverse-geocode or a Places pick); used to store the home's lat/lng.
  const [locAddress, setLocAddress] = useState("");
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);
  // True once the pro types or picks in the new-customer address field, so a
  // late-arriving GPS prefill never clobbers what they entered.
  const addressTouched = useRef(false);

  // Geolocation: raw device coords bias autocomplete; the reverse-geocoded
  // address prefills a new customer's location field.
  type LocState =
    | { status: "idle" }
    | { status: "locating" }
    | { status: "ready"; address: string }
    | { status: "denied" }
    | { status: "unavailable" };
  const [loc, setLoc] = useState<LocState>({ status: "idle" });
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  // Work
  const [eqType, setEqType] = useState("");
  const [eqMake, setEqMake] = useState("");
  const [eqModel, setEqModel] = useState("");
  const [warrantyUntil, setWarrantyUntil] = useState("");
  const [whatDone, setWhatDone] = useState("");
  const [nextService, setNextService] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Appliance picker (for repeat visits to same home)
  const [homeAppliances, setHomeAppliances] = useState<ApplianceOpt[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(""); // "" = add new
  const [editDetails, setEditDetails] = useState(false);
  const [applianceHistory, setApplianceHistory] = useState<JobHistoryRow[]>([]);

  // Trade-driven dynamic equipment fields. `activeTrade` defaults to the pro's
  // trade but can be overridden per job (e.g. a plumber logging a water-treatment
  // unit). Fields are fetched from `trade_fields` in the database so admins can
  // change the form without a deploy. Answers live in `attrValues` and are
  // written to `equipment.attributes` on save.
  const [trades, setTrades] = useState<TradeOption[]>([]);
  const [activeTrade, setActiveTrade] = useState<string>("");
  const [tradeFields, setTradeFields] = useState<TradeField[]>([]);
  const [attrValues, setAttrValues] = useState<AttributeValues>({});
  const setAttr = (key: string, value: string | boolean) =>
    setAttrValues((prev) => ({ ...prev, [key]: value }));

  // Nameplate scan
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // AI extract from the "What was done" note. Auto-runs on a debounce so the
  // pro dictates/types once and the equipment fields below fill themselves in.
  const [extractState, setExtractState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [extractFilled, setExtractFilled] = useState<string[]>([]);
  const lastExtractedNote = useRef<string>("");

  // Voice note. Dictation supplies the transcript; useMicLevel supplies live
  // loudness + frequency spectrum for the immersive orb. The full-screen mic
  // mode is opened from the work step and torn down on close (stops the mic,
  // closes the audio context).
  const dictation = useDictation((text) => {
    setWhatDone((prev) => (prev ? `${prev.replace(/\s+$/, "")} ` : "") + text);
  });
  const micLevel = useMicLevel();
  const [voiceOpen, setVoiceOpen] = useState(false);
  // "work" mode = classic dictation into the "what was done" note on the work
  // step. "full" mode = the pro talks through the whole job on the customer
  // step; on Done we run one AI extract and pre-fill every downstream field.
  const [voiceMode, setVoiceMode] = useState<"work" | "full">("work");
  const [fullNote, setFullNote] = useState("");
  const [fullBusy, setFullBusy] = useState(false);
  type RevealStep = {
    key: string;
    label: string;
    value: string | null;
    status: "pending" | "active" | "done";
  };
  const [fullReveal, setFullReveal] = useState<RevealStep[] | null>(null);
  const fullDictation = useDictation((text) => {
    setFullNote((prev) => (prev ? `${prev.replace(/\s+$/, "")} ` : "") + text);
  });

  function openVoice() {
    // start() must run inside this tap so the AudioContext can resume.
    setVoiceMode("work");
    micLevel.start();
    dictation.start();
    setVoiceOpen(true);
  }
  function openVoiceFull() {
    setVoiceMode("full");
    setFullNote("");
    micLevel.start();
    fullDictation.start();
    setVoiceOpen(true);
  }
  function closeVoice() {
    dictation.stop();
    fullDictation.stop();
    micLevel.stop();
    setVoiceOpen(false);
  }

  // Review. The record always sends (no branded-record toggle in v0); only the
  // Google review ask is optional.
  const [askReview, setAskReview] = useState(true);
  const [reviewEdit, setReviewEdit] = useState<ReviewEdit>(null);
  const [reviewName, setReviewName] = useState<string | null>(null);
  const [reviewEmail, setReviewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Real single-use claim URL minted via claim-qr on a successful email send.
  // Only populated when the record actually reached the customer's inbox;
  // used by the done-screen "Copy link" button.
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  // Captured on submit so the "Show claim QR" button on the done screen can
  // open ClaimQRModal for the same customer + record we just sent.
  const [sentCustomerId, setSentCustomerId] = useState<string | null>(null);
  const [sentRecordId, setSentRecordId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  // Honest post-send state driving the done screen. "sent" only when the email
  // actually went out; "phone_only" / "no_contact" surface the truth instead
  // of the old "inbox and texts" lie. SMS delivery is not live yet.
  type DeliveryState = "sent" | "send_failed" | "phone_only" | "no_contact" | "record_failed";
  const [deliveryState, setDeliveryState] = useState<DeliveryState>("no_contact");
  const [sentTo, setSentTo] = useState<{
    name: string;
    email: string | null;
    phone: string | null;
  }>({
    name: "",
    email: null,
    phone: null,
  });
  const [sendErrorCode, setSendErrorCode] = useState<string | null>(null);
  // Inline "add email" affordance on the done screen when the customer has a
  // phone but no email; lets the pro fix the missing contact and actually send.
  const [addEmail, setAddEmail] = useState("");
  const [retrying, setRetrying] = useState(false);
  // Optional "bill this customer" amount entered on the review slide. String so
  // the input can be empty; parsed to a number at submit time. When >0 we also
  // create an open invoice so the homeowner can pay it via the existing flow.
  const [chargeAmount, setChargeAmount] = useState("");
  const [billedAmount, setBilledAmount] = useState<number | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  // Optional record rows the pro has unchecked (excluded from the customer's
  // record). Keyed by FIELD_* constants; empty rows never enter this set.
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const toggleField = (key: string) =>
    setHiddenFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const { data: c } = await supabase
        .from("customers")
        .select("id,name,phone,email,preferred_locale,home_id,homes(address,lat,lng,geocoded_at)")
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      const rows = (c ?? []) as unknown as CustomerOpt[];
      if (cancelled) return;
      setExisting(rows);

      // Lazily geocode any linked homes that don't have coords yet so the
      // GPS-based customer recommendation can start working without a reload.
      // Paced ~1s apart to stay polite to the geocoding API.
      const targets = rows.filter((r) => r.homes && !r.homes.geocoded_at && r.home_id);
      for (let i = 0; i < targets.length; i++) {
        if (cancelled) return;
        if (i > 0) await new Promise((r) => setTimeout(r, 1000));
        const t = targets[i];
        if (!t.homes) continue;
        const coords = await geocodeHome(t.home_id, t.homes.address);
        if (cancelled) return;
        setExisting((prev) =>
          prev.map((p) =>
            p.id === t.id && p.homes
              ? {
                  ...p,
                  homes: {
                    ...p.homes,
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null,
                    geocoded_at: new Date().toISOString(),
                  },
                }
              : p,
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  /* Detect the pro's current position on mount: keep the raw coords to bias
     autocomplete, and reverse-geocode them into a best-guess address that
     prefills the location field for a new customer. */
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLoc({ status: "unavailable" });
      return;
    }
    setLoc({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGps({ lat, lng });
        const r = await reverseGeocode(lat, lng);
        if (!r?.address) {
          setLoc({ status: "unavailable" });
          return;
        }
        setLoc({ status: "ready", address: r.address });
        // Seed the coords a new home will be stored with (a Places pick overrides).
        setResolved({ address: r.address, lat: r.lat ?? lat, lng: r.lng ?? lng });
      },
      (err) => {
        setLoc({ status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }, []);

  /* Prefill the address once GPS resolves, even if it arrives after the pro
     has already reached Review (high-accuracy GPS can take 5-15s).
     Fills a new customer's address, or an existing customer's address when
     nothing is on file. Only fires while the field is still empty and
     untouched, so it never overwrites a typed or picked address. */
  useEffect(() => {
    if (stage !== "location" && stage !== "review") return;
    if (loc.status !== "ready") return;
    if (selectedCustomerId) {
      // Existing customer: only prefill when nothing is on file AND the pro
      // has not typed/picked anything yet, so we never clobber their edits.
      if (locAddress || addressTouched.current) return;
      setLocAddress(loc.address);
      setResolved({ address: loc.address, lat: gps?.lat ?? null, lng: gps?.lng ?? null });
    } else {
      // New customer: prefill whenever the field is empty (even if they later
      // cleared it), so the current location is always offered as a starting
      // point. A typed/picked value stays put because the field is not empty.
      if (newCustomer.address) return;
      setNewCustomer((n) => ({ ...n, address: loc.address }));
      addressTouched.current = false;
    }
  }, [stage, selectedCustomerId, loc, newCustomer.address, locAddress, gps]);

  /* When an existing customer is picked, load that home's appliances (with
     last-job info) so the pro can attach this new visit to the same physical
     unit instead of creating a duplicate equipment row. */
  useEffect(() => {
    const homeId = existing.find((x) => x.id === selectedCustomerId)?.home_id;
    if (!homeId) {
      setHomeAppliances([]);
      setSelectedEquipmentId("");
      setEditDetails(false);
      return;
    }
    (async () => {
      const { data: eq } = await supabase
        .from("equipment")
        // attributes column added by migration 2026-07-09; cast in the map
        // below until the Lovable-generated Database types refresh.
        .select("id,type,make,model,warranty_until,attributes,jobs(created_at)")
        .eq("home_id", homeId)
        .order("created_at", { ascending: false });
      const rows = (eq ?? []).map((r) => {
        const jobs = (r as { jobs?: { created_at: string }[] }).jobs ?? [];
        const last =
          jobs
            .map((j) => j.created_at)
            .sort()
            .at(-1) ?? null;
        const attrs = (r as { attributes?: unknown }).attributes;
        return {
          id: r.id as string,
          type: (r.type as string | null) ?? null,
          make: (r.make as string | null) ?? null,
          model: (r.model as string | null) ?? null,
          warranty_until: (r.warranty_until as string | null) ?? null,
          attributes:
            attrs && typeof attrs === "object" ? (attrs as Record<string, string | boolean>) : null,
          last_job_at: last,
          job_count: jobs.length,
        } satisfies ApplianceOpt;
      });
      setHomeAppliances(rows);
      setSelectedEquipmentId("");
      setEditDetails(false);
    })();
  }, [selectedCustomerId, existing]);

  /* When an existing appliance is picked, prefill the equipment fields (so the
     "correct details" toggle has real values to edit) and load its short
     service history to show inline while the pro writes the new job. */
  useEffect(() => {
    if (!selectedEquipmentId) {
      setApplianceHistory([]);
      return;
    }
    const app = homeAppliances.find((a) => a.id === selectedEquipmentId);
    if (app) {
      setEqType(app.type ?? "");
      setEqMake(app.make ?? "");
      setEqModel(app.model ?? "");
      setWarrantyUntil(app.warranty_until ?? "");
      // Prefill trade-specific attributes so "Correct unit details" opens with
      // the same answers the pro captured last time.
      setAttrValues((app.attributes ?? {}) as AttributeValues);
    }
    (async () => {
      const { data: js } = await supabase
        .from("jobs")
        .select("id,what_done,created_at")
        .eq("equipment_id", selectedEquipmentId)
        .order("created_at", { ascending: false })
        .limit(3);
      setApplianceHistory((js ?? []) as JobHistoryRow[]);
    })();
  }, [selectedEquipmentId, homeAppliances]);

  /* Load the trade catalog once, and default the active trade to the pro's own
     trade. Editable per job so a plumber can log a water-treatment unit, etc. */
  useEffect(() => {
    let cancelled = false;
    fetchTrades().then((t) => {
      if (cancelled) return;
      setTrades(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTrade || !proTrade) return;
    setActiveTrade(proTrade);
  }, [proTrade, activeTrade]);

  /* Fetch the fields for whichever trade is active. Answers already collected
     for keys that no longer exist stay in state (harmless) but only rendered
     fields show. */
  useEffect(() => {
    if (!activeTrade) {
      setTradeFields([]);
      return;
    }
    let cancelled = false;
    fetchTradeFields(activeTrade).then((f) => {
      if (cancelled) return;
      setTradeFields(f);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTrade]);

  async function onNameplate(file: File) {
    setScanState("scanning");
    setScanError(null);
    if (scanPreview) URL.revokeObjectURL(scanPreview);
    setScanPreview(URL.createObjectURL(file));
    try {
      const r = await scanNameplate(file);
      const filled: string[] = [];
      // Fill blanks only. Never clobber what the pro already typed.
      if (r.type && !eqType) {
        setEqType(r.type);
        filled.push("type");
      }
      if (r.make && !eqMake) {
        setEqMake(r.make);
        filled.push("make");
      }
      if (r.model && !eqModel) {
        setEqModel(r.model);
        filled.push("model");
      }
      if (r.warranty_until && /^\d{4}-\d{2}-\d{2}$/.test(r.warranty_until) && !warrantyUntil) {
        setWarrantyUntil(r.warranty_until);
        filled.push("warranty");
      }
      const detectedNothing = !r.type && !r.make && !r.model && !r.warranty_until;
      if (detectedNothing) {
        setScanState("error");
        setScanError("Couldn't read the photo. Type the details in below.");
        return;
      }
      setScanState("done");
      await logEvent(proId ? `pro:${proId}` : null, "nameplate_scanned", { filled });
    } catch (e) {
      setScanState("error");
      setScanError(e instanceof Error ? e.message : "Scan failed. Try again.");
    }
  }

  /* Ask the AI to pull equipment + next-service out of the note. Fills blanks
     only, never clobbers what the pro already typed or picked from history. */
  async function runExtract(note: string) {
    const trimmed = note.trim();
    if (trimmed.length < 6) return;
    if (trimmed === lastExtractedNote.current) return;
    lastExtractedNote.current = trimmed;
    setExtractState("working");
    try {
      const r = await extractFromNotes(trimmed, proTrade);
      const filled: string[] = [];
      if (r.type && !eqType) {
        setEqType(r.type);
        filled.push("type");
      }
      if (r.make && !eqMake) {
        setEqMake(r.make);
        filled.push("make");
      }
      if (r.model && !eqModel) {
        setEqModel(r.model);
        filled.push("model");
      }
      if (r.next_service_date && /^\d{4}-\d{2}-\d{2}$/.test(r.next_service_date) && !nextService) {
        setNextService(r.next_service_date);
        filled.push("next service");
      }
      if (typeof r.charge_amount === "number" && r.charge_amount > 0 && !chargeAmount.trim()) {
        setChargeAmount(String(r.charge_amount));
        filled.push("charge");
      }
      setExtractFilled(filled);
      setExtractState(filled.length ? "done" : "idle");
      if (filled.length) {
        // Reveal the equipment drawer on first-visit homes so the pro can see
        // what got filled in without having to expand it.
        setDetailsOpen(true);
        await logEvent(proId ? `pro:${proId}` : null, "notes_extracted", { filled });
      }
    } catch {
      setExtractState("error");
    }
  }

  /* Debounced auto-extract: 900ms after the pro stops typing/dictating. */
  useEffect(() => {
    if (stage !== "work") return;
    if (dictation.listening) return;
    const t = setTimeout(() => {
      void runExtract(whatDone);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatDone, dictation.listening, stage]);

  /* The Review card is also the customer-message preview. Fixed labels switch
     immediately; dynamic record fields are translated once and reused by the
     send function so the delivered email matches what the pro reviewed. */
  useEffect(() => {
    if (stage !== "review") return;
    if (customerLocale === "en") {
      setTranslatedRecord(null);
      setTranslationState("ready");
      return;
    }

    let cancelled = false;
    setTranslatedRecord(null);
    setTranslationState("loading");
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke("translate-record", {
        body: {
          target_locale: customerLocale,
          what_done: whatDone,
          equipment_type: eqType || null,
        },
      });
      if (cancelled) return;
      const response = data as {
        ok?: boolean;
        locale?: string;
        what_done?: string | null;
        equipment_type?: string | null;
      } | null;
      if (error || response?.ok !== true || response.locale !== customerLocale) {
        setTranslationState("failed");
        return;
      }
      setTranslatedRecord({
        whatDone: response.what_done ?? null,
        equipmentType: response.equipment_type ?? null,
      });
      setTranslationState("ready");
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customerLocale, eqType, stage, whatDone]);

  const recall = checkRecall(eqMake, eqModel);
  const selectedCustomer = existing.find((x) => x.id === selectedCustomerId);
  const previewName = reviewName ?? selectedCustomer?.name ?? newCustomer.name;
  const previewAddress = selectedCustomerId ? locAddress : newCustomer.address;
  const trimmedReviewEmail = reviewEmail.trim();
  const reviewEmailInvalid = !!trimmedReviewEmail && !isEmail(trimmedReviewEmail);
  const missingReviewAddress = !previewAddress.trim();
  const missingReviewEmail = !trimmedReviewEmail;
  const reviewRequiredComplete =
    !missingReviewAddress && !missingReviewEmail && !reviewEmailInvalid;
  const effectiveCustomerLocale: Locale = translationState === "failed" ? "en" : customerLocale;
  const customerCopy = customerPreviewCopy(effectiveCustomerLocale);
  const previewWork = translatedRecord?.whatDone ?? whatDone;
  const previewEquipmentType = translatedRecord?.equipmentType ?? eqType;

  // Slide-1 combobox: filter existing by name/address, offer create-new inline.
  const q = query.trim().toLowerCase();
  const baseFiltered = q
    ? existing.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.homes?.address?.toLowerCase().includes(q),
      )
    : existing;
  const hasExactMatch = existing.some((c) => c.name?.trim().toLowerCase() === q);

  // Existing customer whose home matches the pro's current GPS location.
  // Prefer distance (haversine, <60m) since address strings vary in format
  // and some homes have no address on file at all; fall back to a
  // normalized-address match. Used to suggest the name at the top of the
  // customer step so the pro just taps to confirm.
  const locationMatch = (() => {
    if (loc.status !== "ready") return undefined;
    if (gps) {
      let best: { c: CustomerOpt; d: number } | null = null;
      for (const c of existing) {
        const h = c.homes;
        if (!h || h.lat == null || h.lng == null) continue;
        const d = haversineMeters(gps, { lat: h.lat, lng: h.lng });
        if (d <= 60 && (!best || d < best.d)) best = { c, d };
      }
      if (best) return best.c;
    }
    return existing.find(
      (c) =>
        c.homes?.address && normalizeAddress(c.homes.address) === normalizeAddress(loc.address),
    );
  })();

  // Sort the location-matched customer to the top so the purple row is the first thing the pro sees.
  const filteredCustomers = locationMatch
    ? [
        ...baseFiltered.filter((c) => c.id === locationMatch.id),
        ...baseFiltered.filter((c) => c.id !== locationMatch.id),
      ]
    : baseFiltered;

  function pickExisting(c: CustomerOpt) {
    setSelectedCustomerId(c.id);
    setReviewName(c.name);
    setReviewEmail(c.email ?? "");
    setCustomerLocale(isLocale(c.preferred_locale) ? c.preferred_locale : "en");
    const onFile = c.homes?.address ?? "";
    addressTouched.current = false;
    // An existing customer's saved home is the source of truth. GPS is only a
    // fallback when the customer has no address on file; silently substituting
    // the truck's location can move the wrong home during submit.
    if (onFile) {
      setLocAddress(onFile);
      setResolved(null);
    } else if (loc.status === "ready") {
      setLocAddress(loc.address);
      setResolved({ address: loc.address, lat: gps?.lat ?? null, lng: gps?.lng ?? null });
    } else {
      setLocAddress("");
      setResolved(null);
    }
    // Existing customer: address is already on file. Skip the standalone
    // "location" step and drop straight into the work capture. The pro can
    // still back-edit the address from Review if it's a different property.
    setStage("work");
  }

  function startNewCustomer(name: string) {
    setSelectedCustomerId("");
    setReviewName(name);
    setReviewEmail("");
    setCustomerLocale("en");
    addressTouched.current = false;
    setNewCustomer((n) => ({
      ...n,
      name,
      address: n.address || (loc.status === "ready" ? loc.address : ""),
    }));
    setStage("location");
  }

  /* "Speak the whole job" done handler: one AI extract fills the customer,
     address, and work fields, then jumps straight to Review so the pro only
     has to eyeball it and send. */
  async function finishFullVoice() {
    // Web Speech often keeps the last utterance in `interim` (never fires
    // `isFinal`) until stop. Combine the finalized `fullNote` with the current
    // interim so nothing spoken is lost, then stop the mic so any trailing
    // final chunk still lands.
    const combined = `${fullNote} ${fullDictation.interim ?? ""}`.replace(/\s+/g, " ").trim();
    fullDictation.stop();
    micLevel.stop();
    // Give the recognizer one tick to flush a trailing final result on stop.
    await new Promise((r) => setTimeout(r, 150));
    const note = combined.length >= 3 ? combined : fullNote.trim();
    if (note.length < 3) {
      setVoiceOpen(false);
      setToast("Didn't catch that. Tap the AI card and try again.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    // Close the overlay so the pro sees the busy indicator on the form.
    setVoiceOpen(false);
    setFullBusy(true);
    let extract;
    try {
      extract = await extractFullJob(note, proTrade);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't read that. Try again.";
      setFullBusy(false);
      setToast(msg);
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setFullBusy(false);

    // Reuse a customer only on a strong contact match or an exact name+address
    // match. Review is always the next screen; uncertain or missing details are
    // corrected there instead of sending the pro backward through the funnel.
    const match = findVoiceCustomer(existing, extract);
    const extractedName = extract.customer_name?.trim() ?? "";
    const extractedAddress = extract.address?.trim() ?? "";
    const savedAddress = match?.homes?.address?.trim() ?? "";
    const locationAddress = loc.status === "ready" ? loc.address : "";
    const reviewAddress = extractedAddress || savedAddress || locationAddress;
    const usedLocationAddress =
      !!locationAddress && !extractedAddress && !savedAddress && reviewAddress === locationAddress;

    const customerLabel = match?.name || extractedName || null;
    const addressLabel = reviewAddress || null;
    const contactBits = [
      extract.customer_phone || match?.phone,
      extract.customer_email || match?.email,
    ].filter(Boolean) as string[];
    const equipmentBits = [extract.type, extract.make, extract.model].filter(Boolean) as string[];

    const steps: RevealStep[] = [
      { key: "customer", label: "Customer", value: customerLabel, status: "pending" },
      { key: "address", label: "Location", value: addressLabel, status: "pending" },
      {
        key: "contact",
        label: "Contact",
        value: contactBits.length ? contactBits.join(" · ") : null,
        status: "pending",
      },
      {
        key: "equipment",
        label: "Equipment",
        value: equipmentBits.length ? equipmentBits.join(" ") : null,
        status: "pending",
      },
      {
        key: "work",
        label: "What was done",
        value: extract.what_done_clean ?? note,
        status: "pending",
      },
      {
        key: "next",
        label: "Next service",
        value: extract.next_service_date,
        status: "pending",
      },
    ];
    setFullReveal(steps);

    // Apply each field as its step "completes" so the pro watches the record
    // build itself in real time before landing on Review.
    const applyStep = (key: string) => {
      if (key === "customer") {
        setReviewName(customerLabel ?? "");
        if (match) {
          setSelectedCustomerId(match.id);
          setNewCustomer({ name: "", address: "", phone: "", email: "" });
          setQuery(match.name);
        } else {
          setSelectedCustomerId("");
          setNewCustomer((prev) => ({ ...prev, name: extractedName }));
          if (extractedName) setQuery(extractedName);
        }
      } else if (key === "address") {
        if (!match) setNewCustomer((prev) => ({ ...prev, address: reviewAddress }));
        setLocAddress(reviewAddress);
        addressTouched.current = !!(extractedAddress || savedAddress);
        setResolved(
          usedLocationAddress
            ? { address: reviewAddress, lat: gps?.lat ?? null, lng: gps?.lng ?? null }
            : null,
        );
      } else if (key === "contact") {
        const email = extract.customer_email?.trim() || match?.email?.trim() || "";
        setReviewEmail(email);
        if (!match) {
          setNewCustomer((prev) => ({
            ...prev,
            phone: extract.customer_phone ?? "",
            email,
          }));
        }
      } else if (key === "equipment") {
        if (extract.type) setEqType(extract.type);
        if (extract.make) setEqMake(extract.make);
        if (extract.model) setEqModel(extract.model);
      } else if (key === "work") {
        setWhatDone(extract.what_done_clean ?? note);
      } else if (key === "next") {
        if (extract.next_service_date) setNextService(extract.next_service_date);
        if (
          typeof extract.charge_amount === "number" &&
          extract.charge_amount > 0 &&
          !chargeAmount.trim()
        ) {
          setChargeAmount(String(extract.charge_amount));
        }
      }
    };

    const STEP_MS = 520;
    const runStep = (i: number) => {
      if (i >= steps.length) {
        setTimeout(() => {
          setFullReveal(null);
          setReviewEdit(reviewAddress ? null : "address");
          setStage("review");
        }, 420);
        return;
      }
      setFullReveal((cur) =>
        cur ? cur.map((s, idx) => (idx === i ? { ...s, status: "active" } : s)) : cur,
      );
      setTimeout(() => {
        applyStep(steps[i].key);
        setFullReveal((cur) =>
          cur ? cur.map((s, idx) => (idx === i ? { ...s, status: "done" } : s)) : cur,
        );
        runStep(i + 1);
      }, STEP_MS);
    };
    runStep(0);

    logEvent(proId, "job_voice_full_captured", {
      filled: [
        extract.customer_name && "customer_name",
        extract.address && "address",
        extract.customer_phone && "phone",
        extract.customer_email && "email",
        extract.type && "type",
        extract.make && "make",
        extract.model && "model",
        extract.next_service_date && "next_service",
        typeof extract.charge_amount === "number" && extract.charge_amount > 0 && "charge",
      ].filter(Boolean),
      matched_existing: !!match,
    });
  }

  /* Coords to store for a home, but only when we actually have them for THIS
     exact address (GPS reverse-geocode or a Places pick). Otherwise null, so
     geocodeHome forward-geocodes the typed string instead. */
  function coordsFor(addr: string): { lat: number; lng: number } | null {
    if (
      resolved &&
      resolved.lat != null &&
      resolved.lng != null &&
      normalizeAddress(resolved.address) === normalizeAddress(addr)
    ) {
      return { lat: resolved.lat, lng: resolved.lng };
    }
    return null;
  }

  async function deliverRecord(customerId: string, recordId: string) {
    try {
      const { data: sendResp, error: sendErr } = await supabase.functions.invoke("invite-claim", {
        body: {
          customer_id: customerId,
          origin: window.location.origin,
          record_id: recordId,
          locale: customerLocale,
          translations:
            translationState === "ready" && customerLocale !== "en"
              ? {
                  what_done: translatedRecord?.whatDone ?? null,
                  equipment_type: translatedRecord?.equipmentType ?? null,
                }
              : null,
        },
      });
      // On non-2xx, supabase-js sets `sendErr` and leaves `sendResp` null,
      // discarding the JSON `{code}` in the error body. Read it off
      // `sendErr.context` (a Response) so the pro sees the real reason
      // instead of a generic "check your connection" fallback.
      let parsedResp = sendResp as { ok?: boolean; code?: string } | null;
      if (sendErr && !parsedResp) {
        const ctx = (sendErr as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.clone === "function") {
          try {
            parsedResp = (await ctx.clone().json()) as { ok?: boolean; code?: string };
          } catch {
            /* body wasn't JSON — fall through to generic code */
          }
        }
      }
      const ok = !sendErr && !!parsedResp && parsedResp.ok !== false;
      if (!ok) {
        return {
          ok: false as const,
          code: parsedResp?.code || sendErr?.message || "send_failed",
        };
      }

      // Delivery already happened even if the bookkeeping update or QR mint
      // fails, so neither follow-up is allowed to turn a sent email into a
      // false failure state.
      await supabase
        .from("records")
        .update({ sent_email_at: new Date().toISOString() })
        .eq("id", recordId);
      const localeUsed = isLocale((sendResp as { locale_used?: unknown }).locale_used)
        ? (sendResp as { locale_used: Locale }).locale_used
        : "en";
      const { data: qr } = await supabase.functions.invoke("claim-qr", {
        body: {
          customer_id: customerId,
          pro_id: proId,
          record_id: recordId,
          origin: window.location.origin,
          locale: localeUsed,
        },
      });
      const claimUrl =
        !!qr &&
        (qr as { ok?: boolean; claim_url?: string }).ok === true &&
        typeof (qr as { claim_url?: string }).claim_url === "string"
          ? (qr as { claim_url: string }).claim_url
          : null;
      return {
        ok: true as const,
        claimUrl,
        localeUsed,
        translationFallback:
          (sendResp as { translation_fallback?: unknown }).translation_fallback === true,
      };
    } catch {
      return { ok: false as const, code: "send_failed" };
    }
  }

  async function submit() {
    if (!proId) return;
    const work = whatDone.trim();
    const selected = existing.find((customer) => customer.id === selectedCustomerId);
    const finalName = (reviewName ?? selected?.name ?? newCustomer.name).trim() || "Customer";
    const finalAddress = (selectedCustomerId ? locAddress : newCustomer.address).trim();
    const finalEmail = reviewEmail.trim().toLowerCase();

    if (!work) {
      setStage("review");
      setReviewEdit("work");
      setToast("Add what was done before saving this job.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (selectedCustomerId && !selected) {
      setStage("customer");
      setToast("Choose the customer again before saving.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (!finalAddress) {
      setStage("review");
      setReviewEdit("address");
      setToast("Add the service address before saving this job.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (!finalEmail) {
      setStage("review");
      setToast("Add the customer's email before sending.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (!isEmail(finalEmail)) {
      setStage("review");
      setToast("Check the customer's email address.");
      setTimeout(() => setToast(null), 3500);
      return;
    }

    setSubmitting(true);
    setBillingError(null);
    setSendErrorCode(null);
    setClaimUrl(null);

    let customerId = selectedCustomerId;
    let homeId: string | undefined;
    let toName = "";
    let emailAddr = "";
    let phoneAddr = "";

    if (customerId) {
      const c = selected!;
      homeId = c.home_id;
      toName = finalName;
      emailAddr = finalEmail;
      phoneAddr = c.phone?.trim() ?? "";
      const customerUpdates: { name?: string; email?: string; preferred_locale?: Locale } = {};
      if (finalName !== c.name.trim()) customerUpdates.name = finalName;
      if (finalEmail !== (c.email?.trim().toLowerCase() ?? "")) {
        customerUpdates.email = finalEmail;
      }
      if (customerLocale !== (isLocale(c.preferred_locale) ? c.preferred_locale : "en")) {
        customerUpdates.preferred_locale = customerLocale;
      }
      if (Object.keys(customerUpdates).length) {
        const { error: customerUpdateErr } = await supabase
          .from("customers")
          .update(customerUpdates)
          .eq("id", customerId);
        if (customerUpdateErr) {
          setSubmitting(false);
          setToast("Could not update the customer details. Your job details are still here.");
          setTimeout(() => setToast(null), 4500);
          return;
        }
        setExisting((prev) =>
          prev.map((customer) =>
            customer.id === customerId ? { ...customer, ...customerUpdates } : customer,
          ),
        );
      }
      // Pro confirmed the address on the location slide; if they changed it
      // (moved, corrected a typo), update the home in place.
      const onFile = c.homes?.address ?? "";
      const confirmed = finalAddress;
      if (!confirmed) {
        setSubmitting(false);
        setStage("review");
        setReviewEdit("address");
        setToast("Confirm the service address before saving this job.");
        setTimeout(() => setToast(null), 3500);
        return;
      }
      if (confirmed && normalizeAddress(confirmed) !== normalizeAddress(onFile)) {
        const { error: addrErr } = await supabase
          .from("homes")
          .update({ address: confirmed })
          .eq("id", homeId);
        if (addrErr) {
          setSubmitting(false);
          setToast(
            addrErr.message.toLowerCase().includes("duplicate")
              ? "That address is already on file for another home."
              : "Could not update the address.",
          );
          setTimeout(() => setToast(null), 3500);
          return;
        }
        void geocodeHome(homeId, confirmed, coordsFor(confirmed));
      }
    } else {
      // Upsert home by address via RPC so a second pro serving the same
      // address does not hit the unique-address 409.
      const { data: upsertedHomeId, error: homeErr } = await supabase.rpc(
        "upsert_home_by_address",
        { p_address: finalAddress },
      );
      if (homeErr || !upsertedHomeId) {
        setSubmitting(false);
        setToast(homeErr?.message ?? "Could not save home");
        setTimeout(() => setToast(null), 3500);
        return;
      }
      homeId = upsertedHomeId as string;
      // Fire-and-forget geocode; reuse coords from the Places pick / GPS when we
      // have them for this exact address, else forward-geocode the string.
      void geocodeHome(homeId, finalAddress, coordsFor(finalAddress));

      const { data: newC, error: customerErr } = await supabase
        .from("customers")
        .insert({
          pro_id: proId,
          home_id: homeId,
          name: finalName,
          phone: newCustomer.phone.trim() || null,
          email: finalEmail,
          consent_at: new Date().toISOString(),
          consent_ref: `web_form_${Date.now()}`,
          preferred_locale: customerLocale,
        })
        .select("id")
        .single();
      if (customerErr || !newC) {
        setSubmitting(false);
        setToast("Could not save the customer. Your job details are still here. Try again.");
        setTimeout(() => setToast(null), 4500);
        return;
      }
      customerId = newC.id;
      toName = finalName;
      emailAddr = finalEmail;
      phoneAddr = newCustomer.phone.trim();
      const savedCoords = coordsFor(finalAddress);
      const savedCustomer: CustomerOpt = {
        id: newC.id,
        name: finalName,
        phone: phoneAddr || null,
        email: finalEmail,
        preferred_locale: customerLocale,
        home_id: homeId,
        homes: {
          address: finalAddress,
          lat: savedCoords?.lat ?? null,
          lng: savedCoords?.lng ?? null,
          geocoded_at: savedCoords ? new Date().toISOString() : null,
        },
      };
      // If a later equipment/job write fails, the retry must reuse the customer
      // that already saved instead of inserting a duplicate.
      setExisting((prev) => [
        savedCustomer,
        ...prev.filter((item) => item.id !== savedCustomer.id),
      ]);
      setSelectedCustomerId(savedCustomer.id);
      setLocAddress(finalAddress);
    }

    if (!homeId || !customerId) {
      setSubmitting(false);
      setToast("Could not prepare this job. Choose the customer and try again.");
      setTimeout(() => setToast(null), 4500);
      return;
    }

    // Equipment: reuse an existing appliance on this home when the pro picked
    // one (so a repeat visit builds a real service history), otherwise insert.
    let equipmentId: string | undefined;
    const cleanedAttrs = cleanAttributes(attrValues);
    const hasAttrs = Object.keys(cleanedAttrs).length > 0;
    if (selectedEquipmentId) {
      equipmentId = selectedEquipmentId;
      if (editDetails) {
        // attributes column shipped in migration 2026-07-09; cast the payload
        // until the Lovable-generated Database types refresh.
        const { error: equipmentErr } = await supabase
          .from("equipment")
          .update({
            type: eqType || null,
            make: eqMake || null,
            model: eqModel || null,
            warranty_until: warrantyUntil || null,
            recall_status: recall.status,
            recall_checked_at: recall.checked_at,
            attributes: cleanedAttrs,
          } as never)
          .eq("id", selectedEquipmentId);
        if (equipmentErr) {
          setSubmitting(false);
          setToast("Could not update the unit details. Your job details are still here.");
          setTimeout(() => setToast(null), 4500);
          return;
        }
      }
    } else if (eqType || eqMake || eqModel || hasAttrs) {
      const { data: eq, error: equipmentErr } = await supabase
        .from("equipment")
        .insert({
          home_id: homeId,
          type: eqType || null,
          make: eqMake || null,
          model: eqModel || null,
          warranty_until: warrantyUntil || null,
          recall_status: recall.status,
          recall_checked_at: recall.checked_at,
          source: "pro",
          attributes: cleanedAttrs,
        } as never)
        .select("id")
        .single();
      if (equipmentErr || !eq) {
        setSubmitting(false);
        setToast("Could not save the unit details. Your job details are still here.");
        setTimeout(() => setToast(null), 4500);
        return;
      }
      equipmentId = eq.id;
    }

    // Job
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        pro_id: proId,
        home_id: homeId,
        customer_id: customerId,
        equipment_id: equipmentId,
        what_done: work,
        next_service_date: nextService || null,
      })
      .select("id")
      .single();
    if (jobErr || !job) {
      setSubmitting(false);
      setToast("Could not save the job. Your details are still here. Try again.");
      setTimeout(() => setToast(null), 4500);
      return;
    }

    // Record. Persist which record rows the pro excluded, scoped to rows that
    // actually have a value, so the public record can hide exactly those.
    const presentKeys = new Set<string>([FIELD_CUSTOMER, FIELD_WORK_DONE, FIELD_RECALL]);
    if (eqType) presentKeys.add(FIELD_EQUIPMENT);
    if (eqMake || eqModel) presentKeys.add(FIELD_MAKE_MODEL);
    if (nextService) presentKeys.add(FIELD_NEXT_SERVICE);
    const hidden = Array.from(hiddenFields).filter((key) => presentKeys.has(key));

    const recordPayload = {
      job_id: job.id,
      public_url: buildRecordUrl("pending"),
      sent_sms_at: null,
      sent_email_at: null,
      ...(hidden.length ? { hidden_fields: hidden } : {}),
    };
    const { data: rec, error: recordErr } = await supabase
      .from("records")
      // hidden_fields added in migration 20260708120000_record_hidden_fields;
      // cast until Lovable regenerates supabase types.ts from the migration.
      .insert(recordPayload as never)
      .select("id")
      .single();

    setSentCustomerId(customerId);
    setSentTo({ name: toName, email: emailAddr || null, phone: phoneAddr || null });
    if (recordErr || !rec) {
      const chargeNum = parseFloat(chargeAmount);
      if (Number.isFinite(chargeNum) && chargeNum > 0) {
        setBillingError("The invoice was not created.");
      }
      setDeliveryState("record_failed");
      setSubmitting(false);
      setStage("done");
      setToast("Job saved");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setSentRecordId(rec.id);

    // First / second job milestones for the funnel dashboard.
    const { count: jobCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("pro_id", proId);
    if (jobCount === 1) {
      await logEvent(`pro:${proId}`, "pro_first_job", { role: "pro", job_id: job.id });
    } else if (jobCount === 2) {
      await logEvent(`pro:${proId}`, "pro_second_job", { role: "pro", job_id: job.id });
    }

    // Optional invoice: if the pro entered a charge amount, create an open
    // invoice tied to this job so the homeowner can pay through /home.
    const chargeNum = parseFloat(chargeAmount);
    setBilledAmount(null);
    if (Number.isFinite(chargeNum) && chargeNum > 0) {
      const inv = await createInvoice({
        proId,
        customerId,
        homeId,
        jobId: job.id,
        items: [{ description: work, amount: chargeNum }],
      });
      if (inv) setBilledAmount(chargeNum);
      else setBillingError("The job was saved, but the invoice could not be created.");
    }

    let delivered = false;
    let localeUsed: Locale = "en";
    let fellBack = false;
    if (emailAddr) {
      const delivery = await deliverRecord(customerId, rec.id);
      if (delivery.ok) {
        delivered = true;
        localeUsed = delivery.localeUsed;
        fellBack = delivery.translationFallback;
        setDeliveryLocale(localeUsed);
        setTranslationFallback(fellBack);
        if (delivery.claimUrl) setClaimUrl(delivery.claimUrl);
      } else {
        setSendErrorCode(delivery.code);
      }
    }

    if (delivered) {
      setDeliveryState("sent");
      await logEvent(`pro:${proId}`, "record_sent", {
        record_id: rec.id,
        requested_locale: customerLocale,
        locale_used: localeUsed,
        translation_fallback: fellBack,
      });
      // Google review ask: only fires on a real delivery, so the Reviews page
      // count reflects reality. No mock SMS - texting is not live yet.
      if (askReview) {
        await logEvent(`pro:${proId}`, "review_requested", {
          customer_id: customerId,
          locale: localeUsed,
        });
      }
    } else if (emailAddr) {
      setDeliveryState("send_failed");
    } else if (phoneAddr) {
      setDeliveryState("phone_only");
    } else {
      setDeliveryState("no_contact");
    }

    if (existing.length === 0) {
      await logEvent(`pro:${proId}`, "pro_activated", {});
    }

    setSubmitting(false);
    setStage("done");
    if (delivered) {
      setToast(
        fellBack
          ? `Sent to ${emailAddr} in English because translation was unavailable.`
          : `Sent to ${emailAddr}`,
      );
    } else {
      setToast("Job saved");
    }
    setTimeout(() => setToast(null), 3500);
  }

  async function retrySavedRecord(email: string, persistEmail: boolean) {
    if (!sentCustomerId || !sentRecordId || !proId) return;
    setRetrying(true);
    if (persistEmail) {
      const { error: updateError } = await supabase
        .from("customers")
        .update({ email })
        .eq("id", sentCustomerId);
      if (updateError) {
        setRetrying(false);
        setToast("Could not save that email. Try again.");
        setTimeout(() => setToast(null), 3500);
        return;
      }
    }

    const delivery = await deliverRecord(sentCustomerId, sentRecordId);
    if (!delivery.ok) {
      setSendErrorCode(delivery.code);
      setDeliveryState("send_failed");
      setRetrying(false);
      setToast(deliveryErrorMessage(delivery.code));
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (delivery.claimUrl) setClaimUrl(delivery.claimUrl);
    setDeliveryLocale(delivery.localeUsed);
    setTranslationFallback(delivery.translationFallback);
    setSentTo((prev) => ({ ...prev, email }));
    setSendErrorCode(null);
    setDeliveryState("sent");
    await logEvent(`pro:${proId}`, "record_sent", {
      record_id: sentRecordId,
      requested_locale: customerLocale,
      locale_used: delivery.localeUsed,
      translation_fallback: delivery.translationFallback,
    });
    if (askReview) {
      await logEvent(`pro:${proId}`, "review_requested", {
        customer_id: sentCustomerId,
        locale: delivery.localeUsed,
      });
    }
    setRetrying(false);
    setToast(
      delivery.translationFallback
        ? `Sent to ${email} in English because translation was unavailable.`
        : `Sent to ${email}`,
    );
    setTimeout(() => setToast(null), 3500);
  }

  /* When the pro adds an email on the done screen for a phone-only customer,
     persist it, then run the same real send path. */
  async function retryWithEmail() {
    const email = addEmail.trim().toLowerCase();
    if (!email) return;
    if (!isEmail(email)) {
      setToast("Check the customer's email address.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    await retrySavedRecord(email, true);
  }

  async function retryDelivery() {
    if (!sentTo.email) return;
    await retrySavedRecord(sentTo.email, false);
  }

  async function copyUrl() {
    if (!claimUrl) return;
    await navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* Reset in place for "Log another", no page reload. Refetch customers so the
     one just added is selectable on the next pass. */
  async function logAnother() {
    if (proId) {
      const { data: c } = await supabase
        .from("customers")
        .select("id,name,phone,email,preferred_locale,home_id,homes(address,lat,lng)")
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setExisting((c ?? []) as unknown as CustomerOpt[]);
    }
    setSelectedCustomerId("");
    setNewCustomer({ name: "", address: "", phone: "", email: "" });

    setQuery("");
    setLocAddress("");
    setResolved(null);
    addressTouched.current = false;
    setEqType("");
    setEqMake("");
    setEqModel("");
    setWarrantyUntil("");
    setDetailsOpen(false);
    setWhatDone("");
    setNextService("");
    setSelectedEquipmentId("");
    setEditDetails(false);
    setHomeAppliances([]);
    setApplianceHistory([]);
    setAttrValues({});
    setActiveTrade(proTrade);
    if (scanPreview) URL.revokeObjectURL(scanPreview);
    setScanPreview(null);
    setScanState("idle");
    setScanError(null);
    dictation.stop();
    micLevel.stop();
    setVoiceOpen(false);
    setAskReview(true);
    setReviewEdit(null);
    setReviewName(null);
    setReviewEmail("");
    setCustomerLocale("en");
    setTranslatedRecord(null);
    setTranslationState("idle");
    setDeliveryLocale("en");
    setTranslationFallback(false);
    setHiddenFields(new Set());
    setClaimUrl(null);
    setDeliveryState("no_contact");
    setSentTo({ name: "", email: null, phone: null });
    setSendErrorCode(null);
    setAddEmail("");
    setSentCustomerId(null);
    setSentRecordId(null);
    setQrOpen(false);
    setCopied(false);
    setChargeAmount("");
    setBilledAmount(null);
    setBillingError(null);
    setStage("customer");
  }

  const canWork = whatDone.length > 0;
  const canRetryDelivery = !["opted_out", "daily_limit", "not_configured"].includes(
    sendErrorCode ?? "",
  );

  // While listening, show the in-progress (interim) words live in the notes box
  // so text appears the instant it's spoken. Finalized words are already
  // committed to `whatDone` via the dictation callback, so this collapses to
  // just `whatDone` the moment speech finalizes or recording stops.
  const liveWhatDone =
    dictation.listening && dictation.interim
      ? (whatDone ? whatDone.replace(/\s+$/, "") + " " : "") + dictation.interim
      : whatDone;
  const liveFullNote =
    fullDictation.listening && fullDictation.interim
      ? (fullNote ? fullNote.replace(/\s+$/, "") + " " : "") + fullDictation.interim
      : fullNote;

  // Manual unit fields, shared by the repeat-home picker (shown when adding a
  // new unit or correcting one) and the new-home drawer (always shown there,
  // since a first-visit home has no unit on file yet to pick).
  // Trade picker + common unit fields + dynamic per-trade fields, driven by
  // the `trades` / `trade_fields` config tables so admins can change the form
  // without a code deploy.
  const tradePicker = trades.length > 0 && (
    <Field
      label="Trade"
      hint="Defaults to your trade. Switch it if this job is a different category."
    >
      <Select value={activeTrade} onChange={(e) => setActiveTrade(e.target.value)}>
        {trades.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </Select>
    </Field>
  );
  const unitFieldsGrid = (
    <div className="space-y-3">
      {tradePicker}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit type">
          <Input
            value={eqType}
            onChange={(e) => setEqType(e.target.value)}
            placeholder="Softener"
          />
        </Field>
        <Field label="Make">
          <Input
            value={eqMake}
            onChange={(e) => setEqMake(e.target.value)}
            placeholder="EcoWater"
          />
        </Field>
        <Field label="Model">
          <Input
            value={eqModel}
            onChange={(e) => setEqModel(e.target.value)}
            placeholder="EVR3700R30"
          />
        </Field>
        <Field label="Warranty until">
          <Input
            type="date"
            value={warrantyUntil}
            onChange={(e) => setWarrantyUntil(e.target.value)}
          />
        </Field>
      </div>
      <TradeFieldInputs fields={tradeFields} values={attrValues} onChange={setAttr} />
    </div>
  );
  const nextServiceField = (
    <Field label="Next service">
      <Input type="date" value={nextService} onChange={(e) => setNextService(e.target.value)} />
    </Field>
  );

  if (!proId) {
    return (
      <div className="font-app min-h-dvh bg-soft grid place-items-center text-muted text-sm">
        {t("pro.loading")}…
      </div>
    );
  }

  return (
    <div className="font-app min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
          <Link to="/pro" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Pill accent="indigo">{t("pro.logJob")}</Pill>
          </div>
        </div>
      </header>

      <div className={`mx-auto px-5 py-10 ${stage === "customer" ? "max-w-4xl" : "max-w-xl"}`}>
        {stage !== "done" && (
          <div className="anim-fade-up max-w-xl mx-auto mb-8">
            <Link
              to="/pro"
              className="mb-6 inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-indigo transition-colors hover:text-indigodark"
            >
              <span aria-hidden>&larr;</span>
              {t("pro.backDashboard")}
            </Link>
            {(() => {
              // Existing-customer flow skips the standalone location step, so
              // the step bar honestly reflects a 3-tap path (Customer → Work →
              // Send). New customers still see 4 steps because address entry
              // is essential up front.
              const flowStages: Stage[] = selectedCustomerId
                ? ["customer", "work", "review"]
                : ["customer", "location", "work", "review"];
              const flowLabels = selectedCustomerId
                ? ["Customer", "The work", "Send"]
                : STAGE_LABELS;
              const idx = flowStages.indexOf(stage);
              return <StepBar steps={flowLabels} current={idx < 0 ? 0 : idx} accent="indigo" />;
            })()}
            <h1 className="mt-6 text-2xl tracking-tight text-center">
              {stage === "customer"
                ? "Who is this for?"
                : stage === "location"
                  ? "Where's the job?"
                  : stage === "work"
                    ? "What did you do?"
                    : t("pro.reviewAndSend")}
            </h1>
          </div>
        )}

        <div>
          <div key={stage} className="anim-fade-up">
            {stage === "customer" && (
              <div className="space-y-4">
                {fullDictation.supported && (
                  <button
                    type="button"
                    onClick={openVoiceFull}
                    aria-label="Talk to HomesBrain AI and it fills in the job"
                    className="pressable group w-full rounded-3xl bg-indigo px-6 py-6 text-left text-white shadow-[0_18px_40px_-18px_rgba(71,63,176,0.7)] transition-all duration-200 hover:bg-indigodark"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <MicIcon size={26} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">
                          HomesBrain AI
                        </div>
                        <div className="mt-0.5 text-lg font-extrabold tracking-tight">
                          Just tell me about the job
                        </div>
                        <div className="mt-0.5 text-sm opacity-90">
                          Who it's for, where, when, what you did. HomesBrain AI fills it all in.
                        </div>
                      </div>
                    </div>
                  </button>
                )}
                {fullBusy && (
                  <div className="rounded-2xl border border-indigo/20 bg-indigobg px-4 py-3 text-sm font-semibold text-indigo">
                    HomesBrain AI is reading what you said…
                  </div>
                )}
                <Card className="space-y-3">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a customer by name or address, or type a new name…"
                    autoFocus
                    aria-label="Search customers or type a new name"
                  />

                  <div className="max-h-[560px] overflow-auto -mx-1 px-1">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q && !hasExactMatch && (
                        <button
                          type="button"
                          onClick={() => startNewCustomer(query.trim())}
                          className="pressable flex w-full items-center gap-3 rounded-2xl border border-dashed border-indigo/40 bg-indigobg/30 px-4 py-3.5 text-left transition-all duration-200 min-h-16 hover:bg-indigobg/60 sm:col-span-2"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigobg text-indigo">
                            <UserPlusIcon size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base font-semibold text-indigo">
                              Add "{query.trim()}"
                            </div>
                            <div className="mt-0.5 text-sm text-muted">New customer</div>
                          </div>
                        </button>
                      )}

                      {filteredCustomers.map((c) => {
                        const isMatch = !!locationMatch && c.id === locationMatch.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => pickExisting(c)}
                            className={`group pressable flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 min-h-16 ${
                              isMatch
                                ? "border-indigo/40 bg-indigobg hover:bg-indigobg/80"
                                : "border-line bg-paper hover:border-indigo/30 hover:bg-indigobg/40"
                            }`}
                          >
                            <Avatar name={c.name || "?"} accent="indigo" size={40} />
                            <div className="min-w-0 flex-1">
                              <div
                                className={`truncate text-base font-semibold ${
                                  isMatch ? "text-indigo" : "text-ink"
                                }`}
                              >
                                {c.name}
                              </div>
                              {isMatch ? (
                                <div className="mt-0.5 truncate text-xs uppercase tracking-wider font-semibold text-indigo/70">
                                  Matches your address
                                </div>
                              ) : (
                                <div className="mt-0.5 truncate text-sm text-muted">
                                  {c.homes?.address}
                                </div>
                              )}
                            </div>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                              className={`shrink-0 transition-all duration-200 group-hover:translate-x-0.5 ${
                                isMatch ? "text-indigo" : "text-muted group-hover:text-indigo"
                              }`}
                            >
                              <path
                                d="M9 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        );
                      })}
                    </div>

                    {!q && existing.length === 0 && (
                      <div className="px-1 py-3 text-sm text-muted">
                        No customers yet. Type a name to add your first.
                      </div>
                    )}

                    {q && filteredCustomers.length === 0 && hasExactMatch && (
                      <div className="px-1 py-3 text-sm text-muted">No other matches.</div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {stage === "location" &&
              (selectedCustomerId ? (
                /* PREVIOUS CLIENT - address on file, prefilled and editable */
                <Card className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedCustomer?.name || "?"} accent="indigo" size={44} />
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-ink tracking-tight">
                        {selectedCustomer?.name}
                      </div>
                      <div className="text-sm text-muted">Confirm the service address</div>
                    </div>
                  </div>

                  <Field label="Service address">
                    <AddressField
                      value={locAddress}
                      onChange={(v) => {
                        addressTouched.current = true;
                        setLocAddress(v);
                      }}
                      onResolve={(r) => {
                        addressTouched.current = true;
                        setLocAddress(r.address);
                        setResolved(r);
                      }}
                      bias={gps}
                      placeholder="123 Maple St, Austin TX"
                      ariaLabel="Service address"
                    />
                  </Field>

                  <div className="flex gap-2">
                    <Btn variant="secondary" onClick={() => setStage("customer")}>
                      Back
                    </Btn>
                    <Btn
                      variant="indigo"
                      size="lg"
                      className="flex-1"
                      disabled={!locAddress.trim()}
                      onClick={() => setStage("work")}
                    >
                      Continue
                    </Btn>
                  </div>
                </Card>
              ) : (
                /* NEW CUSTOMER - address prefilled from GPS, editable with autocomplete */
                <Card className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={newCustomer.name || "?"} accent="indigo" size={44} />
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-ink tracking-tight">
                        {newCustomer.name || "New customer"}
                      </div>
                      <div className="text-sm text-muted">
                        {loc.status === "locating"
                          ? "Finding your location…"
                          : "Confirm the service address"}
                      </div>
                    </div>
                  </div>

                  <Field
                    label="Service address"
                    hint={
                      loc.status === "ready" && newCustomer.address === loc.address
                        ? "From your current location. Edit if it's not exact."
                        : undefined
                    }
                  >
                    <AddressField
                      value={newCustomer.address}
                      onChange={(v) => {
                        addressTouched.current = true;
                        setNewCustomer((n) => ({ ...n, address: v }));
                      }}
                      onResolve={(r) => {
                        addressTouched.current = true;
                        setNewCustomer((n) => ({ ...n, address: r.address }));
                        setResolved(r);
                      }}
                      bias={gps}
                      placeholder="Start typing the address…"
                      ariaLabel="Service address"
                    />
                  </Field>

                  <Field label="Phone (optional)">
                    <PhoneInput
                      value={newCustomer.phone}
                      onChange={(v) => setNewCustomer({ ...newCustomer, phone: v })}
                    />
                  </Field>

                  <div className="flex gap-2">
                    <Btn variant="secondary" onClick={() => setStage("customer")}>
                      Back
                    </Btn>
                    <Btn
                      variant="indigo"
                      size="lg"
                      className="flex-1"
                      disabled={!(newCustomer.name && newCustomer.address)}
                      onClick={() => setStage("work")}
                    >
                      Continue
                    </Btn>
                  </div>
                </Card>
              ))}

            {stage === "work" && (
              <Card className="space-y-5">
                {/* Big voice button - opens the immersive white mic mode */}
                <div>
                  {dictation.supported ? (
                    <button
                      type="button"
                      onClick={openVoice}
                      aria-label="Tap and tell me what you did"
                      className="pressable w-full rounded-2xl bg-indigobg px-6 py-8 text-center text-indigo transition-all duration-200 hover:bg-indigo hover:text-white"
                    >
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/70">
                        <MicIcon size={36} />
                      </div>
                      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">
                        HomesBrain AI
                      </div>
                      <div className="mt-1 text-lg font-bold tracking-tight">
                        Tap and tell me what you did
                      </div>
                      <div className="mt-1 text-xs opacity-80">
                        HomesBrain AI turns your words into the record.
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-soft px-4 py-4 text-center text-sm text-muted">
                      Voice input isn't supported in this browser. Type below instead.
                    </div>
                  )}
                </div>

                {/* Small text box - always visible, required. While listening it
                    shows live interim words; typing is disabled mid-dictation so
                    the interim suffix can't collide with a manual edit. */}
                <Field label="What was done">
                  <Textarea
                    value={liveWhatDone}
                    onChange={(e) => setWhatDone(e.target.value)}
                    readOnly={dictation.listening}
                    placeholder="Or type here…"
                    rows={3}
                  />
                  {extractState === "working" && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                      <span className="h-3 w-3 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
                      HomesBrain AI reading your note…
                    </div>
                  )}
                  {extractState === "done" && extractFilled.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo">
                      <ShieldCheck size={13} animate={false} />
                      HomesBrain AI filled {extractFilled.join(", ")} below
                    </div>
                  )}
                </Field>

                {/* Photo (optional) */}
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onNameplate(f);
                      e.target.value = "";
                    }}
                  />
                  {scanState === "idle" ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="pressable w-full rounded-xl border-2 border-dashed border-indigo/40 bg-paper px-4 py-4 text-center hover:border-indigo hover:bg-indigobg/40 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-2 text-indigo">
                        <CameraIcon size={22} />
                        <span className="text-sm font-semibold">
                          Take a photo of the unit (optional)
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        HomesBrain AI reads the make, model, and warranty for you.
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-line bg-paper p-3">
                      <div className="flex items-center gap-3">
                        {scanPreview && (
                          <img
                            src={scanPreview}
                            alt="Unit photo"
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {scanState === "scanning" && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-indigo">
                              <span className="h-4 w-4 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
                              HomesBrain AI reading the photo…
                            </div>
                          )}
                          {scanState === "done" && (
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo">
                              <ShieldCheck size={16} animate={false} /> HomesBrain AI filled the
                              unit details
                            </div>
                          )}
                          {scanState === "error" && (
                            <div className="text-sm text-red">{scanError}</div>
                          )}
                        </div>
                        {scanState !== "scanning" && (
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="pressable shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:border-ink/20 transition-colors"
                          >
                            Retake
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recall alert - only when there's an actual recall. No recall
                    is the norm, so we don't surface it as noise. */}
                {recall.status !== "none" && (
                  <div className="rounded-xl bg-redbg px-3 py-2 flex items-center justify-between">
                    <span className="text-sm text-red font-semibold flex items-center gap-2">
                      <ShieldCheck size={16} animate={false} /> Recall found
                    </span>
                    <Pill accent="red">{recall.label}</Pill>
                  </div>
                )}

                {homeAppliances.length > 0 ? (
                  /* REPEAT HOME - the pro has serviced this address before, so we
                     know its units. Surface them as the primary action: tap the
                     unit you serviced and its details + history come with it, no
                     retyping. This job attaches to that unit's equipment_id. */
                  <div className="rounded-2xl border border-line bg-paper px-4 py-4 space-y-3">
                    <div>
                      <div className="text-base font-semibold text-ink">
                        Which unit did you service?
                      </div>
                      <div className="text-sm text-muted">
                        Tap a unit to pull up its details and history.
                      </div>
                    </div>

                    <div className="space-y-2">
                      {homeAppliances.map((a) => {
                        const label =
                          [a.type, a.make, a.model].filter(Boolean).join(" · ") || "Unnamed unit";
                        const meta = a.last_job_at
                          ? `Last serviced ${formatDate(a.last_job_at)} · ${a.job_count} job${a.job_count === 1 ? "" : "s"}`
                          : "No visits yet";
                        const picked = selectedEquipmentId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedEquipmentId(picked ? "" : a.id);
                              setEditDetails(false);
                            }}
                            aria-pressed={picked}
                            className={`pressable flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 min-h-16 ${
                              picked
                                ? "border-indigo bg-indigobg shadow-sm"
                                : "border-line bg-paper hover:bg-soft hover:border-ink/20"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm text-ink">{label}</div>
                              <div className="text-xs text-muted mt-0.5 tnum">{meta}</div>
                            </div>
                            {picked && (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo text-white">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden
                                >
                                  <path
                                    d="M5 12l5 5L20 7"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {!selectedEquipmentId && (
                      <div className="flex items-center gap-3 pt-1">
                        <div className="h-px flex-1 bg-line" />
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigobg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo">
                          New
                        </span>
                        <div className="h-px flex-1 bg-line" />
                      </div>
                    )}

                    {selectedEquipmentId && applianceHistory.length > 0 && (
                      <div className="rounded-xl bg-soft px-3 py-2.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                          Recent history
                        </div>
                        <ul className="space-y-1">
                          {applianceHistory.map((j) => (
                            <li key={j.id} className="text-xs text-ink flex gap-2">
                              <span className="text-muted tnum shrink-0 w-20">
                                {formatDate(j.created_at)}
                              </span>
                              <span className="truncate">{j.what_done}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedEquipmentId && (
                      <button
                        type="button"
                        onClick={() => setEditDetails((v) => !v)}
                        className="text-xs font-semibold text-indigo hover:underline"
                      >
                        {editDetails ? "Hide details" : "Correct unit details"}
                      </button>
                    )}

                    {(!selectedEquipmentId || editDetails) && unitFieldsGrid}
                    {nextServiceField}
                  </div>
                ) : (
                  /* NEW / FIRST-VISIT HOME - no units on file yet, so unit details
                     are optional and tucked into a collapsed drawer. */
                  <div
                    className={`rounded-2xl border bg-paper transition-colors ${
                      detailsOpen ? "border-indigo/30" : "border-line"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailsOpen((v) => !v)}
                      aria-expanded={detailsOpen}
                      className="pressable w-full flex items-center gap-3 px-5 py-4 text-left min-h-16 hover:bg-indigobg/40 rounded-2xl transition-colors"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigobg text-indigo">
                        <span className="text-xl leading-none font-bold">+</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-base font-semibold text-ink">
                          Add unit details
                        </span>
                        <span className="block text-sm text-muted">
                          Make, model, warranty, next service (optional)
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-lg text-muted transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                      >
                        ▾
                      </span>
                    </button>
                    {detailsOpen && (
                      <div className="border-t border-line px-4 py-4 space-y-4">
                        {unitFieldsGrid}
                        {nextServiceField}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Btn
                    variant="secondary"
                    onClick={() => setStage(selectedCustomerId ? "customer" : "location")}
                  >
                    {t("pro.back")}
                  </Btn>
                  <Btn
                    variant="indigo"
                    size="lg"
                    className="flex-1"
                    disabled={!canWork}
                    onClick={() => setStage("review")}
                  >
                    {t("pro.review")}
                  </Btn>
                </div>
              </Card>
            )}

            {stage === "review" && (
              <div className="space-y-4">
                <p className="px-2 text-center text-sm text-muted">{t("pro.reviewAndSend")}.</p>

                {!reviewRequiredComplete && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red/20 bg-redbg px-4 py-3 text-red"
                  >
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-bold">Finish these details before sending</div>
                      <div className="mt-0.5 text-sm">
                        {missingReviewAddress && missingReviewEmail
                          ? "Add the service address and customer email."
                          : missingReviewAddress
                            ? "Add the service address."
                            : missingReviewEmail
                              ? "Add the customer email."
                              : "Enter a valid customer email."}
                      </div>
                    </div>
                  </div>
                )}

                {/* One box: the live record IS the control surface. Every row is a
                    checkmark, and the Google review ask lives inside the same box. */}
                <Card className="shadow-[0_24px_60px_-30px_rgba(22,22,15,0.18)]">
                  <div className="flex items-center gap-3">
                    <Avatar name={proName || "?"} accent="indigo" size={44} />
                    <div className="min-w-0">
                      <div className="truncate font-extrabold text-ink">
                        {proName || t("pro.yourBusiness")}
                      </div>
                      <div className="text-xs text-muted">{tradeLabel(proTrade)}</div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <label
                      htmlFor="customer-language"
                      className="block text-sm font-semibold text-ink"
                    >
                      {uiCopy.language}
                    </label>
                    <Select
                      id="customer-language"
                      value={customerLocale}
                      onChange={(event) => {
                        if (isLocale(event.target.value)) setCustomerLocale(event.target.value);
                      }}
                      className="mt-2"
                    >
                      {LOCALES.map(({ code, label }) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <p className="mt-1.5 text-xs text-muted">{uiCopy.languageHelp}</p>
                    {translationState === "loading" && (
                      <div
                        className="mt-3 flex items-center gap-2 text-sm text-muted"
                        role="status"
                      >
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-indigo" />
                        {uiCopy.translating}
                      </div>
                    )}
                    {translationState === "failed" && (
                      <div
                        className="mt-3 flex items-start gap-2 rounded-xl border border-amber/25 bg-amberbg px-3 py-2.5 text-sm text-ink"
                        role="status"
                      >
                        <AlertTriangle
                          size={17}
                          className="mt-0.5 shrink-0 text-amber"
                          aria-hidden="true"
                        />
                        <span>
                          <strong>{uiCopy.fallbackTitle}.</strong> {uiCopy.fallbackBody}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className={`mt-4 border-y px-1 py-3 ${
                      missingReviewAddress ? "border-red/30 bg-redbg/50" : "border-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight">
                          {customerCopy.serviceRecord}
                        </h3>
                        <div
                          className={`mt-0.5 text-xs ${
                            missingReviewAddress ? "font-semibold text-red" : "text-muted"
                          }`}
                        >
                          {previewAddress || "Service address required"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewEdit("address")}
                        aria-label="Edit service address"
                        title="Edit service address"
                        className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-ink"
                      >
                        <Pencil size={17} aria-hidden="true" />
                      </button>
                    </div>

                    {(reviewEdit === "address" || missingReviewAddress) && (
                      <div className="mt-3">
                        <ReviewEditor
                          doneDisabled={missingReviewAddress}
                          onDone={() => setReviewEdit(null)}
                        >
                          <Field label="Service address *">
                            <AddressField
                              value={previewAddress}
                              onChange={(value) => {
                                addressTouched.current = true;
                                if (selectedCustomerId) setLocAddress(value);
                                else setNewCustomer((current) => ({ ...current, address: value }));
                              }}
                              onResolve={(address) => {
                                addressTouched.current = true;
                                if (selectedCustomerId) setLocAddress(address.address);
                                else {
                                  setNewCustomer((current) => ({
                                    ...current,
                                    address: address.address,
                                  }));
                                }
                                setResolved(address);
                              }}
                              bias={gps}
                              placeholder="123 Maple St, Austin TX"
                              ariaLabel="Service address"
                            />
                          </Field>
                        </ReviewEditor>
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <RecordRow
                      label={customerCopy.customer}
                      value={previewName || "Customer"}
                      included={!hiddenFields.has(FIELD_CUSTOMER)}
                      onToggle={() => toggleField(FIELD_CUSTOMER)}
                      onEdit={() => setReviewEdit("customer")}
                    />
                    {reviewEdit === "customer" && (
                      <ReviewEditor onDone={() => setReviewEdit(null)}>
                        <Field label="Customer name">
                          <Input
                            autoFocus
                            value={reviewName ?? previewName}
                            onChange={(event) => setReviewName(event.target.value)}
                            placeholder="Customer name"
                          />
                        </Field>
                      </ReviewEditor>
                    )}
                    {eqType && (
                      <RecordRow
                        label={customerCopy.equipment}
                        value={previewEquipmentType}
                        included={!hiddenFields.has(FIELD_EQUIPMENT)}
                        onToggle={() => toggleField(FIELD_EQUIPMENT)}
                        onEdit={() => setReviewEdit("equipment")}
                      />
                    )}
                    {(eqMake || eqModel) && (
                      <RecordRow
                        label={customerCopy.makeModel}
                        value={[eqMake, eqModel].filter(Boolean).join(" · ")}
                        included={!hiddenFields.has(FIELD_MAKE_MODEL)}
                        onToggle={() => toggleField(FIELD_MAKE_MODEL)}
                        onEdit={() => setReviewEdit("equipment")}
                      />
                    )}
                    {reviewEdit === "equipment" && (
                      <ReviewEditor onDone={() => setReviewEdit(null)}>
                        {unitFieldsGrid}
                      </ReviewEditor>
                    )}
                    <RecordRow
                      label={customerCopy.workDone}
                      value={previewWork || "-"}
                      included={!hiddenFields.has(FIELD_WORK_DONE)}
                      onToggle={() => toggleField(FIELD_WORK_DONE)}
                      onEdit={() => setReviewEdit("work")}
                    />
                    {reviewEdit === "work" && (
                      <ReviewEditor
                        doneDisabled={!whatDone.trim()}
                        onDone={() => setReviewEdit(null)}
                      >
                        <Field label="Work done">
                          <Textarea
                            autoFocus
                            value={whatDone}
                            onChange={(event) => setWhatDone(event.target.value)}
                            placeholder="What did you do?"
                          />
                        </Field>
                      </ReviewEditor>
                    )}
                    {nextService && (
                      <RecordRow
                        label={customerCopy.nextService}
                        value={formatDate(nextService)}
                        included={!hiddenFields.has(FIELD_NEXT_SERVICE)}
                        onToggle={() => toggleField(FIELD_NEXT_SERVICE)}
                        onEdit={() => setReviewEdit("next_service")}
                      />
                    )}
                    {reviewEdit === "next_service" && (
                      <ReviewEditor onDone={() => setReviewEdit(null)}>
                        <Field label="Next service">
                          <Input
                            type="date"
                            value={nextService}
                            onChange={(event) => setNextService(event.target.value)}
                          />
                        </Field>
                      </ReviewEditor>
                    )}
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <Field
                      label={uiCopy.email}
                      hint={reviewEmailInvalid ? uiCopy.emailInvalid : uiCopy.emailHelp}
                    >
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={reviewEmail}
                        onChange={(event) => setReviewEmail(event.target.value)}
                        placeholder="customer@email.com"
                        aria-invalid={missingReviewEmail || reviewEmailInvalid}
                        className={
                          missingReviewEmail || reviewEmailInvalid
                            ? "border-red bg-redbg/30 focus:border-red focus:ring-red/10"
                            : ""
                        }
                      />
                    </Field>
                  </div>

                  {/* Optional "bill this customer" amount. Leave blank to skip;
                      any positive number creates an open invoice tied to the job
                      so the homeowner can pay it from /home. */}
                  <div className="mt-5 border-t border-line pt-4">
                    <label htmlFor="charge-amount" className="block text-sm font-semibold text-ink">
                      {t("pro.chargeJob")}
                    </label>
                    <div className="mt-2 relative">
                      <span
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted"
                        aria-hidden
                      >
                        $
                      </span>
                      <input
                        id="charge-amount"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(e.target.value)}
                        className="w-full rounded-2xl border border-line bg-paper py-4 pl-10 pr-4 text-2xl font-bold tnum text-ink placeholder:text-muted/50 focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">{t("pro.chargeHelp")}</p>
                  </div>

                  {/* Google review ask: a checkmark in the same box, styled as an
                      action rather than a record row. */}
                  <div className="mt-5 border-t border-line pt-4">
                    <button
                      type="button"
                      onClick={() => setAskReview((v) => !v)}
                      aria-pressed={askReview}
                      className="pressable flex w-full items-center gap-2.5 rounded-xl bg-soft px-3 py-3 text-left text-sm transition-colors hover:bg-line/50"
                    >
                      <CheckSquare on={askReview} />
                      <span className={askReview ? "text-ink" : "text-muted"}>
                        {t("pro.askGoogleReview")}
                      </span>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <Btn variant="secondary" onClick={() => setStage("work")}>
                        {t("pro.back")}
                      </Btn>
                      <Btn
                        variant="indigo"
                        size="lg"
                        className="flex-1"
                        loading={submitting}
                        disabled={
                          !reviewRequiredComplete || submitting || translationState === "loading"
                        }
                        onClick={submit}
                      >
                        {uiCopy.sendRecord}
                      </Btn>
                    </div>
                    <div className="mt-3 text-xs text-muted">
                      {tradeLabel(proTrade)} · {proName}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {stage === "done" && (
              <Card className="anim-scale-in text-center py-12 max-w-xl mx-auto">
                {deliveryState === "sent" && <Celebration variant="burst" />}
                {deliveryState === "sent" && <CheckBurst className="mx-auto" />}
                {deliveryState === "sent" && (
                  <>
                    <h2 className="mt-4 text-2xl tracking-tight">{t("pro.recordSent")}</h2>
                    <p className="mt-2 text-sm text-muted">Sent to {sentTo.email}.</p>
                    {translationFallback && (
                      <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber/25 bg-amberbg px-3 py-2.5 text-sm text-ink">
                        Translation was unavailable, so this message and its linked pages were sent
                        in English.
                      </div>
                    )}
                    {!translationFallback && deliveryLocale !== "en" && (
                      <p className="mt-2 text-xs font-semibold text-indigo">
                        Sent in {LOCALES.find(({ code }) => code === deliveryLocale)?.label}.
                      </p>
                    )}
                  </>
                )}
                {deliveryState === "phone_only" && (
                  <>
                    <h2 className="mt-4 text-2xl tracking-tight">{t("pro.saved")}</h2>
                    <p className="mt-2 text-sm text-muted">
                      We can't reach {sentTo.name || "your customer"} yet. SMS delivery is coming.
                      Add an email to send the record now, or show the QR.
                    </p>
                    <div className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        placeholder="customer@email.com"
                        className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
                      />
                      <Btn
                        variant="indigo"
                        size="sm"
                        loading={retrying}
                        disabled={!addEmail.trim() || retrying}
                        onClick={retryWithEmail}
                      >
                        Send record
                      </Btn>
                    </div>
                  </>
                )}
                {deliveryState === "no_contact" && (
                  <>
                    <h2 className="mt-4 text-2xl tracking-tight">{t("pro.saved")}</h2>
                    <p className="mt-2 text-sm text-muted">
                      No way to reach {sentTo.name || "your customer"} yet. Add an email to send
                      their record.
                    </p>
                    <div className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        placeholder="customer@email.com"
                        className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
                      />
                      <Btn
                        variant="indigo"
                        size="sm"
                        loading={retrying}
                        disabled={!addEmail.trim() || retrying}
                        onClick={retryWithEmail}
                      >
                        Send record
                      </Btn>
                    </div>
                  </>
                )}
                {deliveryState === "send_failed" && (
                  <>
                    <h2 className="mt-4 text-2xl tracking-tight">{t("pro.saved")}</h2>
                    <p className="mt-2 text-sm text-muted">
                      We couldn't deliver the record to {sentTo.email || "the customer"}.{" "}
                      {deliveryErrorMessage(sendErrorCode)}
                    </p>
                    {canRetryDelivery && sentTo.email && (
                      <div className="mt-4">
                        <Btn variant="indigo" size="sm" loading={retrying} onClick={retryDelivery}>
                          Try email again
                        </Btn>
                      </div>
                    )}
                  </>
                )}
                {deliveryState === "record_failed" && (
                  <>
                    <h2 className="mt-4 text-2xl tracking-tight">Job saved.</h2>
                    <p className="mt-2 text-sm text-muted">
                      The work is safe, but we couldn't create or send the customer record. Do not
                      log the job again.
                    </p>
                  </>
                )}
                {billedAmount != null && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigobg px-4 py-2 text-sm font-semibold text-indigo">
                    Billed {formatMoney(billedAmount)} · they can pay it from their home page
                  </div>
                )}
                {billingError && (
                  <div className="mx-auto mt-4 max-w-sm rounded-xl bg-redbg px-4 py-3 text-sm font-semibold text-red">
                    {billingError}
                  </div>
                )}
                {claimUrl && (
                  <button
                    onClick={copyUrl}
                    className="pressable mt-4 inline-flex items-center gap-2 rounded-xl bg-soft px-4 py-2 text-sm font-mono text-ink hover:bg-line transition-colors break-all"
                  >
                    {copied ? "Copied ✓" : claimUrl}
                  </button>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {sentCustomerId && sentRecordId && (
                    <Btn variant="secondary" onClick={() => setQrOpen(true)}>
                      <QrCode size={15} /> {t("pro.showClaimQr")}
                    </Btn>
                  )}
                  <Btn variant="indigo" onClick={logAnother}>
                    {t("pro.logAnother")}
                  </Btn>
                  <Link to="/pro">
                    <Btn variant="secondary">{t("pro.backDashboard")}</Btn>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {voiceOpen && (
        <VoiceCaptureOverlay
          levelRef={micLevel.levelRef}
          bandsRef={micLevel.bandsRef}
          text={voiceMode === "full" ? liveFullNote : liveWhatDone}
          onDone={voiceMode === "full" ? finishFullVoice : closeVoice}
        />
      )}

      {fullReveal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo">
              <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-indigo" />
              HomesBrain AI
            </div>
            <div className="mt-1 text-lg font-extrabold tracking-tight text-ink">
              Building the record
            </div>
            <ul className="mt-4 space-y-2">
              {fullReveal.map((s) => {
                const done = s.status === "done";
                const active = s.status === "active";
                return (
                  <li
                    key={s.key}
                    className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-colors ${
                      done
                        ? "border-indigo/30 bg-indigobg"
                        : active
                          ? "border-indigo/30 bg-indigobg"
                          : "border-line bg-white"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        done
                          ? "bg-indigo text-white"
                          : active
                            ? "bg-indigo text-white"
                            : "bg-line text-muted"
                      }`}
                      aria-hidden
                    >
                      {done ? (
                        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none">
                          <path
                            d="M4 10.5l3.5 3.5L16 6"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : active ? (
                        <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
                          done ? "text-indigo-dark" : active ? "text-indigo" : "text-muted"
                        }`}
                      >
                        {s.label}
                      </div>
                      <div
                        className={`mt-0.5 truncate text-sm font-semibold ${
                          s.value ? "text-ink" : "text-muted"
                        }`}
                      >
                        {s.value ?? (active || done ? "Not mentioned" : "…")}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}

      {qrOpen && sentCustomerId && proId && pro && (
        <ClaimQRModal
          customerId={sentCustomerId}
          proId={proId}
          recordId={sentRecordId ?? undefined}
          proBusiness={pro.business}
          proLogo={pro.logo ?? null}
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}
