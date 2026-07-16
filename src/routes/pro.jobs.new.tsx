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
import { ProShell, useProGuard } from "@/components/pro-shell";
import { ClaimQRModal } from "@/components/claim-qr-modal";
import { Celebration } from "@/components/celebration";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Pencil,
  QrCode,
  Video as VideoIcon,
} from "lucide-react";
import {
  matchVoiceCustomer,
  normalizedName,
  normalizedPhone,
  suggestCloseCustomers,
} from "@/lib/customer-match";
import {
  buildRecordUrl,
  checkRecall,
  fetchHomeUnits,
  fetchHomeUnitsByHomeId,
  formatDate,
  geocodeHome,
  haversineMeters,
  logEvent,
  normalizeAddress,
  tradeLabel,
} from "@/lib/hb";
import { createInvoice, formatMoney } from "@/lib/invoices";

import { forwardGeocodeCapped, reverseGeocode, type ResolvedAddress } from "@/lib/geo";
import { AddressField } from "@/components/address-field";
import {
  extractFromNotes,
  extractFullJob,
  toJpegBlob,
  transcribeAudio,
  useDictation,
  useMicLevel,
} from "@/lib/capture";
import {
  probeVideo,
  uploadJobMedia,
  removeJobMediaObject,
  insertJobMedia,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_SECONDS,
} from "@/lib/media";
import { CheckBurst, Logo, MicIcon, ShieldCheck, UserPlusIcon } from "@/components/svg";
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
import { LOCALES, isLocale, useI18n, useT, type Locale } from "@/lib/i18n";
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

type ReviewEdit = "customer" | "address" | "equipment" | "work" | "next_service" | null;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function deliveryErrorMessage(code: string | null) {
  if (code === "opted_out") return "This customer has opted out of email.";
  if (code === "daily_limit") return "Your daily email limit has been reached.";
  if (code === "not_configured") return "Email delivery is temporarily unavailable.";
  if (code === "no_email") return "Add the customer's email before sending.";
  if (code === "bad_request")
    return "The email couldn't be sent: the record is missing details. Try again.";
  if (code === "forbidden") return "You don't have access to send for this customer.";
  if (code === "unauthorized") return "Your session expired. Sign in again and retry.";
  if (code === "send_failed") return "The email service rejected the send. Try again in a moment.";
  return "Check your connection and try the email again.";
}

/* Bound a network call so a busy overlay can never trap the pro: a stalled
   connection becomes a normal error instead of an endless spinner. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const STAGES: Stage[] = ["customer", "location", "work", "review"];
const STAGE_LABELS = ["Customer", "Location", "The work", "Send"];

/* Rows of the "Building the record" modal, in reveal order. Also used to seed
   the modal in its loading state the moment the voice overlay closes, so the
   pro never lands back on the customer list wondering if the AI heard them.
   skeletonWidth is the loading placeholder's width (%), roughly matching how
   long each row's real value tends to be. */
const FULL_REVEAL_ROWS = [
  { key: "customer", label: "Customer", skeletonWidth: 72 },
  { key: "address", label: "Location", skeletonWidth: 58 },
  { key: "contact", label: "Contact", skeletonWidth: 66 },
  { key: "equipment", label: "Equipment", skeletonWidth: 48 },
  { key: "work", label: "What was done", skeletonWidth: 86 },
  { key: "next", label: "Next service", skeletonWidth: 40 },
] as const;

/* Canonical keys for the optional record rows the pro can hide from the
   customer. Stored on records.hidden_fields; the homeowner-side dashboard
   uses these to hide the corresponding rows in the equipment/job view. */
const FIELD_CUSTOMER = "customer";
const FIELD_EQUIPMENT = "equipment";
const FIELD_MAKE_MODEL = "make_model";
const FIELD_WORK_DONE = "work_done";
const FIELD_NEXT_SERVICE = "next_service";
const FIELD_RECALL = "recall";
const FIELD_VIDEO = "video";
const FIELD_PHOTOS = "photos";

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

/* One row of the live record: label on the left, value on the right. Tap the
   value to open its editor. */
function RecordRow({
  label,
  value,
  included,
  onToggle,
  onEdit,
  flash = false,
}: {
  label: string;
  value: ReactNode;
  included: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  /* Briefly true after HomesBrain AI edits this row; fades back via the
     color transition when it clears. */
  flash?: boolean;
}) {
  const dim = !included;
  return (
    <div
      className={`flex w-full items-start justify-between gap-3 border-b border-line py-3 transition-colors duration-700 last:border-b-0 ${
        flash ? "rounded-xl bg-indigobg" : ""
      }`}
    >
      {onToggle ? (
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
      ) : (
        <span
          className={`flex min-h-11 shrink-0 items-center text-sm text-muted ${
            dim ? "opacity-50" : ""
          }`}
        >
          {label}
        </span>
      )}
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

/* Two or more customers answer to the spoken name. The pro is standing in the
   home, so they know which one: show the address that tells them apart, and let
   them start a fresh customer when this really is a different person. */
function SameNameChooser({
  candidates,
  onPick,
}: {
  candidates: CustomerOpt[];
  onPick: (picked: CustomerOpt | undefined) => void;
}) {
  const spokenName = candidates[0]?.name ?? "";
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 backdrop-blur-sm anim-fade-up sm:items-center">
      <div className="w-full rounded-t-3xl border border-line bg-paper p-5 shadow-xl sm:max-w-md sm:rounded-3xl sm:p-6">
        <div className="mb-1 text-lg font-semibold text-ink">Which {spokenName}?</div>
        <div className="mb-4 text-sm text-muted">More than one customer matches that name.</div>

        <div className="space-y-2">
          {candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left transition-colors hover:bg-soft"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-ink">{c.name}</span>
                <span className="block truncate text-sm text-muted">
                  {c.homes?.address || c.phone || c.email || "No address on file"}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
          ))}
        </div>

        <Btn variant="ghost" size="lg" className="mt-3 w-full" onClick={() => onPick(undefined)}>
          None of these, add a new customer
        </Btn>
      </div>
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
  // Open "which one did you mean?" prompt. Held as a promise resolver so the
  // voice flow can await the pro's pick and then carry on building the record.
  const [nameChoice, setNameChoice] = useState<{
    candidates: CustomerOpt[];
    resolve: (picked: CustomerOpt | undefined) => void;
  } | null>(null);
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
  /* Set when the AI bound the note to a unit on file. Drives the "Matched to
     your Kinetico K5" banner, which must always be undoable in one tap. */
  const [aiMatch, setAiMatch] = useState<{ id: string; label: string } | null>(null);
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

  // Walkthrough video (optional). The upload starts the moment the pro picks
  // it so the end of the form is never a long network wait. `videoFinal` is a
  // ref, not state: submit reads it after awaiting the busy promise and must
  // not see a stale closure.
  type VideoUploadState = {
    status: "uploading" | "done" | "error";
    progress: number; // 0..1
    error?: string;
  };
  const videoRef = useRef<HTMLInputElement>(null);
  const [videoUpload, setVideoUpload] = useState<VideoUploadState | null>(null);
  const videoBusy = useRef<Promise<void> | null>(null);
  const videoFinal = useRef<{
    path: string;
    posterPath: string | null;
    duration: number | null;
  } | null>(null);

  // Job photos (optional, up to 6). Each upload starts the moment the pro
  // picks it, same as the video above. `photoPaths` is a ref, not state: submit
  // reads it after awaiting the pending uploads and must not see a stale
  // closure. `photoItems` is what the UI renders (previews + status).
  const MAX_PHOTOS = 6;
  type PhotoItem = {
    id: string;
    status: "uploading" | "done" | "error";
    previewUrl: string;
    path: string | null;
  };
  const photosRef = useRef<HTMLInputElement>(null);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const photosBusy = useRef<Set<Promise<void>>>(new Set());
  const photoPaths = useRef<string[]>([]);
  // Ids removed while their upload is still in flight: the upload task checks
  // this before pushing to photoPaths so a pro's removal always wins the race.
  const removedPhotoIds = useRef<Set<string>>(new Set());

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
  }, uiLocale);
  const micLevel = useMicLevel();
  const [voiceOpen, setVoiceOpen] = useState(false);
  // True while the server transcribes the recorded clip after the pro taps Done
  // (work mode only; the full/amend flows have their own busy modals).
  const [transcribing, setTranscribing] = useState(false);
  // "work" mode = classic dictation into the "what was done" note on the work
  // step. "full" mode = the pro talks through the whole job on the customer
  // step; on Done we run one AI extract and pre-fill every downstream field.
  const [voiceMode, setVoiceMode] = useState<"work" | "full" | "amend">("work");
  const [fullNote, setFullNote] = useState("");
  const [fullBusy, setFullBusy] = useState(false);
  type RevealStep = {
    key: string;
    label: string;
    skeletonWidth: number;
    value: string | null;
    status: "pending" | "active" | "done";
  };
  const [fullReveal, setFullReveal] = useState<RevealStep[] | null>(null);
  const fullDictation = useDictation((text) => {
    setFullNote((prev) => (prev ? `${prev.replace(/\s+$/, "")} ` : "") + text);
  }, uiLocale);

  // "amend" mode = the floating AI button on Review. The pro speaks a
  // correction ("it's a Kinetico K5, add that I flushed the tank") and
  // edit-record applies it to the record's fields in place.
  const [amendBusy, setAmendBusy] = useState(false);
  const [amendNote, setAmendNote] = useState("");
  const amendDictation = useDictation((text) => {
    setAmendNote((prev) => (prev ? `${prev.replace(/\s+$/, "")} ` : "") + text);
  }, uiLocale);
  /* The HomesBrain AI mark is a bundled PNG; if it ever fails to load, the
     voice buttons fall back to the vector mic so the flagship CTA never
     renders as a broken-image slot. */
  const [micImgOk, setMicImgOk] = useState(true);

  /* Monotonic id for the busy voice flows (full capture, review amend).
     Cancelling or starting a new run bumps it, so a stale in-flight request
     that later resolves can no longer touch state. */
  const voiceRunRef = useRef(0);
  function cancelVoiceBusy() {
    voiceRunRef.current++;
    setFullBusy(false);
    setAmendBusy(false);
    setFullReveal(null);
  }

  // Review rows the AI just changed, flashed indigo so the edit is visible.
  const [aiFlash, setAiFlash] = useState<Set<string>>(new Set());
  const aiFlashTimer = useRef<number | null>(null);
  function flashAiChanges(keys: Set<string>) {
    setAiFlash(keys);
    if (aiFlashTimer.current) window.clearTimeout(aiFlashTimer.current);
    aiFlashTimer.current = window.setTimeout(() => setAiFlash(new Set()), 2600);
  }

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
  function openVoiceAmend() {
    setVoiceMode("amend");
    setAmendNote("");
    micLevel.start();
    amendDictation.start();
    setVoiceOpen(true);
  }
  /* Turn what the pro just said into text. The recorded clip transcribed on the
     server is the source of truth (accurate, handles mixed-language speech); the
     live Web Speech text is only the fallback if there's no clip or the call
     fails, so a transcription outage never loses the note. Stops the recorder
     (keeping its blob) then tears the mic down. */
  async function settleSpoken(fallback: string): Promise<string> {
    const clip = await micLevel.stopRecording();
    micLevel.stop();
    const fb = fallback.trim();
    if (!clip) return fb;
    try {
      const text = (
        await withTimeout(transcribeAudio(clip, uiLocale), 20_000, "transcription timed out")
      ).trim();
      return text || fb;
    } catch {
      return fb;
    }
  }

  /* Work-mode Done: the live Web Speech text is already in `whatDone`, so show a
     "transcribing" hint and upgrade it in place with the accurate transcript. */
  async function finishWorkVoice() {
    const combined = `${whatDone} ${dictation.interim ?? ""}`.replace(/\s+/g, " ").trim();
    dictation.stop();
    setVoiceOpen(false);
    setTranscribing(true);
    const text = await settleSpoken(combined);
    if (text) setWhatDone(text);
    setTranscribing(false);
  }

  // Review. The record always sends (no branded-record toggle in v0); only the
  // Google review ask is optional.
  const [askReview, setAskReview] = useState(true);
  const [reviewEdit, setReviewEdit] = useState<ReviewEdit>(null);
  const [reviewName, setReviewName] = useState<string | null>(null);
  /* Normalized name the pro said "no, new customer" to on the Review slide, so
     the "did you mean...?" card does not nag unless the name changes. */
  const [dismissedSuggestionName, setDismissedSuggestionName] = useState("");
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
  // Review screen keeps optional decisions collapsed by default so the send
  // step reads as "confirm and send," not "configure and send."
  const [langOpen, setLangOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
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

  /* Load the units already on file at this ADDRESS, so the pro can attach this
     visit to the same physical unit instead of creating a duplicate.

     Keyed on the address, not on the picked customer: a home is shared across
     pros. The plumber a homeowner just invited types the address as a brand-new
     customer, and must still see the softener the water-treatment pro logged.
     Keying this off selectedCustomerId hid exactly that case, which is the
     second_pro_added moment. */
  useEffect(() => {
    const address = (selectedCustomerId ? locAddress : newCustomer.address).trim();
    // A picked customer's home is known outright, so it can answer even when the
    // address string is not usable yet.
    const homeId = existing.find((x) => x.id === selectedCustomerId)?.home_id;
    if (!address && !homeId) {
      setHomeAppliances([]);
      setSelectedEquipmentId("");
      setAiMatch(null);
      setEditDetails(false);
      return;
    }
    let cancelled = false;
    // Debounced: the address is typed, so this fires on every keystroke.
    const t = setTimeout(() => {
      void (async () => {
        // null means the address RPC could not answer (it ships through Lovable
        // and may not be deployed yet). Fall back to the RLS table read for
        // homes this pro already serves, so a repeat customer never loses the
        // picker they have today.
        let rows = address ? await fetchHomeUnits(address) : null;
        if (!rows && homeId) rows = await fetchHomeUnitsByHomeId(homeId);
        if (cancelled) return;
        setHomeAppliances(rows ?? []);
        setSelectedEquipmentId("");
        setAiMatch(null);
        setEditDetails(false);
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selectedCustomerId, locAddress, newCustomer.address, existing]);

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

  async function onPickVideo(file: File) {
    if (!proId) return;
    if (file.size > VIDEO_MAX_BYTES) {
      setToast("That video is too big. Keep it under 200MB.");
      setTimeout(() => setToast(null), 4500);
      return;
    }
    // Keep the old video attached until the replacement actually succeeds: a
    // failed retake (too long, network error) must not destroy a previously-
    // good video. It's only cleaned up once the new one is safely in place.
    const old = videoFinal.current;
    setVideoUpload({ status: "uploading", progress: 0 });
    const task = (async () => {
      const probe = await probeVideo(file);
      if (probe.duration && probe.duration > VIDEO_MAX_SECONDS) {
        if (old) {
          videoFinal.current = old;
          setVideoUpload({ status: "done", progress: 1 });
          setToast("Keep it under 3 minutes. Your earlier video is still attached.");
          setTimeout(() => setToast(null), 4500);
        } else {
          setVideoUpload({ status: "error", progress: 0, error: "Keep it under 3 minutes." });
        }
        return;
      }
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const video = await uploadJobMedia({
        proId,
        file,
        ext,
        contentType: file.type || "video/mp4",
        onProgress: (f) =>
          setVideoUpload((v) => (v && v.status === "uploading" ? { ...v, progress: f } : v)),
      });
      let poster: { path: string } | null = null;
      if (probe.poster) {
        poster = await uploadJobMedia({
          proId,
          file: probe.poster,
          ext: "jpg",
          contentType: "image/jpeg",
        }).catch(() => null);
      }
      videoFinal.current = {
        path: video.path,
        posterPath: poster?.path ?? null,
        duration: probe.duration,
      };
      setVideoUpload({ status: "done", progress: 1 });
      // Replacing a video: the old objects are orphans now, clean them up.
      if (old) {
        void removeJobMediaObject(old.path);
        if (old.posterPath) void removeJobMediaObject(old.posterPath);
      }
      await logEvent(`pro:${proId}`, "video_recorded", { duration: probe.duration });
    })().catch((e) => {
      if (old) {
        videoFinal.current = old;
        setVideoUpload({ status: "done", progress: 1 });
        setToast("That video didn't upload. Your earlier video is still attached.");
        setTimeout(() => setToast(null), 4500);
      } else {
        setVideoUpload({
          status: "error",
          progress: 0,
          error: e instanceof Error ? e.message : "Upload failed. Try again.",
        });
      }
    });
    videoBusy.current = task;
    await task;
  }

  function removeVideo() {
    const old = videoFinal.current;
    videoFinal.current = null;
    videoBusy.current = null;
    setVideoUpload(null);
    if (old) {
      void removeJobMediaObject(old.path);
      if (old.posterPath) void removeJobMediaObject(old.posterPath);
    }
  }

  function onPickPhotos(files: FileList) {
    if (!proId) return;
    const room = MAX_PHOTOS - photoItems.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > picked.length) {
      setToast("Up to 6 photos per job.");
      setTimeout(() => setToast(null), 4500);
    }
    for (const file of picked) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPhotoItems((prev) => [...prev, { id, status: "uploading", previewUrl, path: null }]);
      const task = (async () => {
        const blob = await toJpegBlob(file);
        const up = await uploadJobMedia({
          proId,
          file: blob,
          ext: "jpg",
          contentType: "image/jpeg",
        });
        if (removedPhotoIds.current.has(id)) {
          void removeJobMediaObject(up.path);
          return;
        }
        photoPaths.current = [...photoPaths.current, up.path];
        setPhotoItems((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "done", path: up.path } : p)),
        );
      })()
        .catch(() => {
          setPhotoItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)));
        })
        .finally(() => {
          photosBusy.current.delete(task);
        });
      photosBusy.current.add(task);
    }
  }

  function removePhoto(id: string) {
    const item = photoItems.find((p) => p.id === id);
    setPhotoItems((prev) => prev.filter((p) => p.id !== id));
    removedPhotoIds.current.add(id);
    if (!item) return;
    URL.revokeObjectURL(item.previewUrl);
    if (item.path) {
      photoPaths.current = photoPaths.current.filter((p) => p !== item.path);
      void removeJobMediaObject(item.path);
    }
  }

  /* Ask the AI to pull equipment + next-service out of the note. Fills blanks
     only, never clobbers what the pro already typed or picked from history.

     When the home has units on file we hand the AI that roster, so "serviced the
     softener" can bind to the softener already on the record instead of minting
     a second one. It only ever proposes: a wrong silent bind corrupts the home's
     service history, which is the whole asset, so anything short of an
     unambiguous match leaves the choice to the pro. */
  async function runExtract(note: string) {
    const trimmed = note.trim();
    if (trimmed.length < 6) return;
    if (trimmed === lastExtractedNote.current) return;
    lastExtractedNote.current = trimmed;
    setExtractState("working");
    try {
      const hints = homeAppliances.map((a) => ({
        id: a.id,
        type: a.type,
        make: a.make,
        model: a.model,
      }));
      const r = await extractFromNotes(
        trimmed,
        proTrade,
        hints.length ? hints : undefined,
        uiLocale,
      );

      /* The pro's tap is ground truth. If they already picked a unit, the AI
         does not get to second-guess it, so resolution is skipped entirely. */
      const ref = selectedEquipmentId ? null : r.equipment_ref;
      const matched =
        ref?.matched_id && ref.confidence === "high"
          ? homeAppliances.find((a) => a.id === ref.matched_id)
          : undefined;

      if (matched) {
        // Attach to the unit on file and tell the pro, reversibly. The unit's
        // own details are truth, so we do NOT let the note's type/make/model
        // overwrite them here: a genuine correction goes through "Correct unit
        // details", where the pro confirms it.
        setSelectedEquipmentId(matched.id);
        setEditDetails(false);
        setAiMatch({
          id: matched.id,
          label:
            [matched.type, matched.make, matched.model].filter(Boolean).join(" ") || "the unit",
        });
        await logEvent(proId ? `pro:${proId}` : null, "equipment_matched", {
          confidence: ref?.confidence,
          source: "ai",
          reason: ref?.reason,
        });
      }

      const filled: string[] = [];
      if (!matched) {
        // No confident match: this is a new unit (or the pro will pick one), so
        // fill the blanks from the note exactly as before.
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
      setExtractState(filled.length || matched ? "done" : "idle");
      if (filled.length) {
        // Reveal the equipment drawer on first-visit homes so the pro can see
        // what got filled in without having to expand it.
        setDetailsOpen(true);
      }
      if (filled.length || matched) {
        await logEvent(proId ? `pro:${proId}` : null, "notes_extracted", {
          filled,
          matched: Boolean(matched),
        });
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
     send function so the delivered email matches what the pro reviewed.
     The record narrative is authored in the pro's UI language (dictation,
     extract-job, and typed notes all follow it), so translation is skipped
     only when the customer reads that same language. English is a translation
     target like any other: an English-speaking customer of a Russian-locale
     pro still needs the pass. */
  useEffect(() => {
    if (stage !== "review") return;
    if (customerLocale === uiLocale) {
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
  }, [customerLocale, eqType, stage, uiLocale, whatDone]);

  const recall = checkRecall(eqMake, eqModel);
  const selectedCustomer = existing.find((x) => x.id === selectedCustomerId);
  const previewName = reviewName ?? selectedCustomer?.name ?? newCustomer.name;
  const previewAddress = selectedCustomerId ? locAddress : newCustomer.address;
  const trimmedReviewEmail = reviewEmail.trim();
  const reviewEmailInvalid = !!trimmedReviewEmail && !isEmail(trimmedReviewEmail);
  const missingReviewAddress = !previewAddress.trim();
  const missingReviewEmail = !trimmedReviewEmail;
  const reviewEmailValid = !missingReviewEmail && !reviewEmailInvalid;
  const reviewRequiredComplete =
    !missingReviewAddress && !missingReviewEmail && !reviewEmailInvalid;
  // Once the email is valid on the Review step, glide the Send button into
  // view so the pro can't miss what to do next. Fires only on the transition
  // to valid, and only while on Review, so we never yank focus later.
  const sendBtnRef = useRef<HTMLDivElement>(null);
  const prevEmailValid = useRef(false);
  useEffect(() => {
    if (stage === "review" && reviewEmailValid && !prevEmailValid.current) {
      sendBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    prevEmailValid.current = reviewEmailValid;
  }, [reviewEmailValid, stage]);
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

  /* "Did you mean...?" on Review: the record is about to create a NEW customer,
     but someone on file has a close name. The voice transcription mishears
     names ("Kristen" arrives as "Christian"), and silently saving would file
     this home under a duplicate person. Never auto-link; the pro confirms. */
  const closeMatch = (() => {
    if (selectedCustomerId) return undefined;
    const name = previewName.trim();
    if (!name || normalizedName(name) === dismissedSuggestionName) return undefined;
    return suggestCloseCustomers(existing, name)[0]?.customer;
  })();

  /* Inside the Review name editor: existing customers the pro can link to
     instead of renaming, substring matches first, then sounds-alike. Until the
     pro actually types (the input opens prefilled with the record's current
     name), show the list as-is: "press edit, see your customers". */
  const reviewCustomerOptions = (() => {
    if (reviewEdit !== "customer") return [];
    const pool = existing.filter((c) => c.id !== selectedCustomerId);
    const typed = (reviewName ?? previewName).trim();
    const untouched =
      !typed ||
      (!!selectedCustomer && normalizedName(typed) === normalizedName(selectedCustomer.name));
    if (untouched) return pool.slice(0, 5);
    const needle = typed.toLowerCase();
    const substring = pool.filter(
      (c) =>
        c.name?.toLowerCase().includes(needle) || c.homes?.address?.toLowerCase().includes(needle),
    );
    const close = suggestCloseCustomers(pool, typed, 5)
      .map((s) => s.customer)
      .filter((c) => !substring.some((s) => s.id === c.id));
    return [...substring, ...close].slice(0, 5);
  })();

  /* Link the Review record to a customer already on file (the "did you
     mean...?" card or a pick inside the name editor). The name on file beats
     the transcription; the address the pro captured for THIS job beats the one
     on file, except when it is just the previously linked customer's saved
     address; anything the pro actually spoke (email) still wins. */
  function linkExistingCustomer(c: CustomerOpt) {
    const prev = existing.find((x) => x.id === selectedCustomerId);
    const current = (selectedCustomerId ? locAddress : newCustomer.address).trim();
    const cameFromFile =
      !!prev?.homes?.address &&
      !!current &&
      normalizeAddress(prev.homes.address) === normalizeAddress(current);
    setSelectedCustomerId(c.id);
    setReviewName(c.name);
    setQuery(c.name);
    if (!reviewEmail.trim() && c.email) setReviewEmail(c.email);
    setCustomerLocale(isLocale(c.preferred_locale) ? c.preferred_locale : "en");
    setLocAddress(!current || cameFromFile ? (c.homes?.address ?? "") : current);
    addressTouched.current = true;
    setNewCustomer({ name: "", address: "", phone: "", email: "" });
    setDismissedSuggestionName("");
    setReviewEdit(null);
  }

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

  /* Ask the pro which same-name customer they meant. Resolves to the pick, or
     to undefined when they choose to start a new customer with that name. */
  function askWhichCustomer(candidates: CustomerOpt[]): Promise<CustomerOpt | undefined> {
    return new Promise((resolve) => setNameChoice({ candidates, resolve }));
  }

  /* "Speak the whole job" done handler: one AI extract fills the customer,
     address, and work fields, then jumps straight to Review so the pro only
     has to eyeball it and send. */
  async function finishFullVoice() {
    // Web Speech keeps the last utterance in `interim` (never fires `isFinal`)
    // until stop; combine it with `fullNote` as the fallback transcript.
    const combined = `${fullNote} ${fullDictation.interim ?? ""}`.replace(/\s+/g, " ").trim();
    fullDictation.stop();
    const run = ++voiceRunRef.current;
    // Close the overlay and open the "Building the record" modal right away in
    // its loading state - it also covers the transcription wait. Dropping the
    // pro back on the customer list while we read the note looks like a failure.
    setVoiceOpen(false);
    setFullBusy(true);
    setFullReveal(FULL_REVEAL_ROWS.map((row) => ({ ...row, value: null, status: "pending" })));
    // Accurate server transcript is the note; Web Speech text is the fallback.
    const note = await settleSpoken(combined);
    if (run !== voiceRunRef.current) return;
    if (note.length < 3) {
      setFullBusy(false);
      setFullReveal(null);
      setToast("Didn't catch that. Tap the AI card and try again.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    let extract;
    try {
      extract = await withTimeout(
        extractFullJob(note, proTrade, uiLocale),
        30_000,
        "That took too long. Check your connection and try again.",
      );
    } catch (e) {
      if (run !== voiceRunRef.current) return;
      const msg = e instanceof Error ? e.message : "Couldn't read that. Try again.";
      setFullBusy(false);
      setFullReveal(null);
      // The dictation survives the failure: park the transcript in the work
      // note so the pro finishes the job by hand instead of re-saying it all.
      setWhatDone((prev) => (prev.trim() ? prev : note));
      setToast(`${msg} Your note is saved under "What did you do?".`);
      setTimeout(() => setToast(null), 5000);
      return;
    }
    if (run !== voiceRunRef.current) return;
    setFullBusy(false);

    // Reuse the customer on file when the voice note points at exactly one,
    // including close-but-not-exact names (transcription mishears, short
    // forms) via the auto-link threshold. When several match, ask rather
    // than guess: picking wrong would file a job under the wrong person's home.
    const decision = matchVoiceCustomer(existing, extract);
    let match: CustomerOpt | undefined;
    if (decision.kind === "linked") {
      match = decision.customer;
    } else if (decision.kind === "ambiguous") {
      match = await askWhichCustomer(decision.candidates);
    }
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

    const stepValues: Record<string, string | null> = {
      customer: customerLabel,
      address: addressLabel,
      contact: contactBits.length ? contactBits.join(" · ") : null,
      equipment: equipmentBits.length ? equipmentBits.join(" ") : null,
      work: extract.what_done_clean ?? note,
      next: extract.next_service_date ?? null,
    };
    const steps: RevealStep[] = FULL_REVEAL_ROWS.map((row) => ({
      ...row,
      value: stepValues[row.key] ?? null,
      status: "pending",
    }));

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

    playReveal(steps, applyStep, () => {
      setFullReveal(null);
      setReviewEdit(reviewAddress ? null : "address");
      setStage("review");
    });

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

  /* Animate the "Building the record" rows: each turns active then done (with
     onStep fired as it lands), then onFinish runs after a beat. Shared by the
     full voice flow and the Review amend flow. */
  function playReveal(
    steps: RevealStep[],
    onStep: ((key: string) => void) | null,
    onFinish: () => void,
  ) {
    const STEP_MS = 280;
    setFullReveal(steps);
    const run = (i: number) => {
      if (i >= steps.length) {
        setTimeout(onFinish, 240);
        return;
      }
      setFullReveal((cur) =>
        cur ? cur.map((s, idx) => (idx === i ? { ...s, status: "active" } : s)) : cur,
      );
      setTimeout(() => {
        onStep?.(steps[i].key);
        setFullReveal((cur) =>
          cur ? cur.map((s, idx) => (idx === i ? { ...s, status: "done" } : s)) : cur,
        );
        run(i + 1);
      }, STEP_MS);
    };
    run(0);
  }

  /* Floating-AI done handler on Review: send the record's current fields plus
     the spoken instruction to edit-record, apply what came back, then replay
     the "Building the record" modal with the updated values so the pro sees
     the record repopulate. Null never clears a field here (only next-service,
     where the model clears on an explicit ask): edits apply instantly, so a
     value the model dropped must not wipe good data. */
  async function finishAmendVoice() {
    const combined = `${amendNote} ${amendDictation.interim ?? ""}`.replace(/\s+/g, " ").trim();
    amendDictation.stop();
    const run = ++voiceRunRef.current;
    setVoiceOpen(false);
    setAmendBusy(true);
    // Open the modal in its loading state right away, exactly like the full
    // voice flow: the pro should watch the record update, not wonder.
    setFullBusy(true);
    setFullReveal(FULL_REVEAL_ROWS.map((row) => ({ ...row, value: null, status: "pending" })));
    // Accurate server transcript is the instruction; Web Speech is the fallback.
    const instruction = await settleSpoken(combined);
    if (run !== voiceRunRef.current) return;
    if (instruction.length < 3) {
      setAmendBusy(false);
      setFullBusy(false);
      setFullReveal(null);
      setToast("Didn't catch that. Tap the mic and try again.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const chargeNow = parseFloat(chargeAmount);
    const current = {
      what_done: whatDone.trim() || null,
      done_date: new Date().toISOString().slice(0, 10),
      next_service_date: nextService || null,
      equipment_type: eqType.trim() || null,
      equipment_make: eqMake.trim() || null,
      equipment_model: eqModel.trim() || null,
      customer_name: previewName.trim() || null,
      address: previewAddress.trim() || null,
      email: reviewEmail.trim() || null,
      charge_amount: Number.isFinite(chargeNow) && chargeNow > 0 ? chargeNow : null,
    };
    let data, error;
    try {
      ({ data, error } = await withTimeout(
        supabase.functions.invoke("edit-record", { body: { instruction, fields: current } }),
        30_000,
        "That took too long. Check your connection and try again.",
      ));
    } catch (e) {
      if (run !== voiceRunRef.current) return;
      setAmendBusy(false);
      setFullBusy(false);
      setFullReveal(null);
      setToast(e instanceof Error ? e.message : "Couldn't reach HomesBrain AI. Try again.");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (run !== voiceRunRef.current) return;
    setAmendBusy(false);
    setFullBusy(false);
    if (error || !data || data.error) {
      setFullReveal(null);
      setToast(data?.error ?? "HomesBrain AI isn't available right now. Tap a row to edit it.");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (data.understood === false) {
      setFullReveal(null);
      setToast(data.note ?? "Couldn't tell what to change. Try saying it a different way.");
      setTimeout(() => setToast(null), 4000);
      return;
    }

    const changed = new Set<string>();
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

    const nameNew = str(data.customer_name);
    if (nameNew && nameNew !== previewName.trim()) {
      setReviewName(nameNew);
      changed.add(FIELD_CUSTOMER);
    }
    const addressNew = str(data.address);
    if (addressNew && normalizeAddress(addressNew) !== normalizeAddress(previewAddress)) {
      addressTouched.current = true;
      if (selectedCustomerId) setLocAddress(addressNew);
      else setNewCustomer((n) => ({ ...n, address: addressNew }));
      changed.add("address");
    }
    const emailNew = str(data.email);
    if (emailNew && emailNew.toLowerCase() !== reviewEmail.trim().toLowerCase()) {
      setReviewEmail(emailNew);
      changed.add("email");
    }
    const workNew = str(data.what_done);
    if (workNew && workNew !== whatDone.trim()) {
      setWhatDone(workNew);
      changed.add(FIELD_WORK_DONE);
    }
    const nextNew =
      typeof data.next_service_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(data.next_service_date)
        ? data.next_service_date
        : null;
    if ((nextNew ?? "") !== nextService) {
      setNextService(nextNew ?? "");
      changed.add(FIELD_NEXT_SERVICE);
    }
    const typeNew = str(data.equipment_type);
    if (typeNew && typeNew !== eqType.trim()) {
      setEqType(typeNew);
      changed.add(FIELD_EQUIPMENT);
    }
    const makeNew = str(data.equipment_make);
    if (makeNew && makeNew !== eqMake.trim()) {
      setEqMake(makeNew);
      changed.add(FIELD_MAKE_MODEL);
    }
    const modelNew = str(data.equipment_model);
    if (modelNew && modelNew !== eqModel.trim()) {
      setEqModel(modelNew);
      changed.add(FIELD_MAKE_MODEL);
    }
    // A correction to a unit on file only persists at submit when the edit
    // toggle is on; the AI's correction counts as the pro asking for it.
    if (selectedEquipmentId && (changed.has(FIELD_EQUIPMENT) || changed.has(FIELD_MAKE_MODEL))) {
      setEditDetails(true);
    }
    const chargeNew =
      typeof data.charge_amount === "number" &&
      Number.isFinite(data.charge_amount) &&
      data.charge_amount > 0
        ? data.charge_amount
        : null;
    if (chargeNew != null && chargeNew !== (Number.isFinite(chargeNow) ? chargeNow : null)) {
      setChargeAmount(String(chargeNew));
      changed.add("charge");
    }

    if (changed.size === 0) {
      setFullReveal(null);
      setToast(data.note ?? "Nothing needed changing.");
      setTimeout(() => setToast(null), 3500);
      return;
    }

    // Replay the modal with the record's post-edit values, then land back on
    // Review with the changed rows flashed.
    const phoneVal = (selectedCustomer?.phone ?? newCustomer.phone ?? "").trim();
    const finalValues: Record<string, string | null> = {
      customer: (nameNew ?? previewName.trim()) || null,
      address: (addressNew ?? previewAddress.trim()) || null,
      contact:
        [phoneVal || null, (emailNew ?? reviewEmail.trim()) || null].filter(Boolean).join(" · ") ||
        null,
      equipment:
        [typeNew ?? eqType.trim(), makeNew ?? eqMake.trim(), modelNew ?? eqModel.trim()]
          .filter(Boolean)
          .join(" ") || null,
      work: (workNew ?? whatDone.trim()) || null,
      next: changed.has(FIELD_NEXT_SERVICE) ? nextNew : nextService || null,
    };
    playReveal(
      FULL_REVEAL_ROWS.map((row) => ({
        ...row,
        value: finalValues[row.key] ?? null,
        status: "pending",
      })),
      null,
      () => {
        setFullReveal(null);
        flashAiChanges(changed);
        if (data.note) {
          setToast(data.note);
          setTimeout(() => setToast(null), 4000);
        }
      },
    );
    void logEvent(`pro:${proId}`, "record_edited", {
      via: "voice_review",
      fields: Array.from(changed),
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

  /* The best identity we have for the home being saved. A Places pick made
     for THIS address carries its own placeId; a freehand-typed address gets
     one time-capped forward geocode to canonicalize it, so "72 Sunshine bass"
     lands on the same home as "72 Sunshine Bass Court". Geocoding trouble
     never blocks the save: the fallback is the typed string, exactly like
     before. */
  async function homeIdentityFor(addr: string): Promise<{
    address: string;
    placeId: string | null;
    lat: number | null;
    lng: number | null;
  }> {
    if (resolved?.placeId && normalizeAddress(resolved.address) === normalizeAddress(addr)) {
      return {
        address: resolved.address,
        placeId: resolved.placeId,
        lat: resolved.lat,
        lng: resolved.lng,
      };
    }
    const hit = await forwardGeocodeCapped(addr);
    if (hit?.address && hit.placeId) {
      return { address: hit.address, placeId: hit.placeId, lat: hit.lat, lng: hit.lng };
    }
    const coords = hit ?? coordsFor(addr);
    return { address: addr, placeId: null, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
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
            translationState === "ready" && translatedRecord
              ? {
                  what_done: translatedRecord.whatDone,
                  equipment_type: translatedRecord.equipmentType,
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
            /* body wasn't JSON: fall through to generic code */
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
    // The pro dictates in their own language; when they've picked a different
    // customer language on Review, translate-record already produced a
    // translated version for the preview. Persist THAT as the record so the
    // saved job matches what the customer will read forever.
    const useTranslated =
      customerLocale !== uiLocale && translationState === "ready" && !!translatedRecord?.whatDone;
    const work = (useTranslated ? translatedRecord!.whatDone! : whatDone).trim();
    const savedEqType = useTranslated ? (translatedRecord?.equipmentType ?? eqType) : eqType;
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

    // Silent dedupe: same pro, same email or same phone as a customer already on
    // file means it is the same person. The pro just typed a different display
    // name (nickname, typo, one-tap test) for someone we already know. Adopt the
    // existing record so we do not stack up "Bob / John / Customer" rows against
    // one homeowner inbox (breaks consent tracking, fragments the home's history,
    // and looks like spam to the homeowner and to A2P 10DLC carriers).
    let dedupeCustomer: CustomerOpt | undefined;
    if (!customerId) {
      const emailKey = finalEmail;
      const phoneKey = normalizedPhone(newCustomer.phone);
      dedupeCustomer = existing.find((c) => {
        const em = c.email?.trim().toLowerCase() ?? "";
        const ph = normalizedPhone(c.phone);
        return (!!emailKey && em === emailKey) || (!!phoneKey && ph === phoneKey);
      });
      if (dedupeCustomer) customerId = dedupeCustomer.id;
    }

    if (customerId) {
      const c = selected ?? dedupeCustomer!;
      homeId = c.home_id;
      toName = dedupeCustomer ? c.name : finalName;
      emailAddr = finalEmail;
      phoneAddr = c.phone?.trim() ?? "";
      const customerUpdates: { name?: string; email?: string; preferred_locale?: Locale } = {};
      // On dedupe we keep the name that is already on file (do not rename Ilan
      // to "Bob" just because the pro one-tapped a different label today).
      if (!dedupeCustomer && finalName !== c.name.trim()) customerUpdates.name = finalName;
      if (finalEmail !== (c.email?.trim().toLowerCase() ?? "")) {
        customerUpdates.email = finalEmail;
      }
      if (customerLocale !== (isLocale(c.preferred_locale) ? c.preferred_locale : "en")) {
        customerUpdates.preferred_locale = customerLocale;
      }
      // On dedupe, fill in a phone we did not have on file so future SMS works.
      if (dedupeCustomer && !phoneAddr && newCustomer.phone.trim()) {
        phoneAddr = newCustomer.phone.trim();
        (customerUpdates as { phone?: string }).phone = phoneAddr;
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
      // Pro confirmed the address on the location slide. A different address
      // is a SECOND PROPERTY for this customer, never an in-place edit of the
      // home on file: each home carries its own history, and "they moved /
      // fix a typo" is an explicit edit on the customer page. Upsert by
      // address so a home another pro already serves is reused, not
      // duplicated. The customer row keeps its original home as primary;
      // the job (and any new equipment) attaches to the confirmed home.
      const onFile = c.homes?.address ?? "";
      if (normalizeAddress(finalAddress) !== normalizeAddress(onFile)) {
        const identity = await homeIdentityFor(finalAddress);
        const { data: upsertedHomeId, error: homeErr } = await supabase.rpc(
          "upsert_home_by_address",
          // Extra identity args shipped in migration 2026-07-16; cast until
          // the Lovable-generated Database types refresh.
          {
            p_address: identity.address,
            p_place_id: identity.placeId,
            p_lat: identity.lat,
            p_lng: identity.lng,
          } as never,
        );
        if (homeErr || !upsertedHomeId) {
          setSubmitting(false);
          setToast(homeErr?.message ?? "Could not save home");
          setTimeout(() => setToast(null), 3500);
          return;
        }
        homeId = upsertedHomeId as string;
        // The RPC stored coords when we had them; otherwise geocode lazily.
        if (identity.lat == null) void geocodeHome(homeId, identity.address, null);
      }
    } else {
      // Upsert home by place identity (canonical address + placeId when we
      // have or can resolve one) so a second pro serving the same address,
      // or a retyped variant of it, reuses the same home record.
      const identity = await homeIdentityFor(finalAddress);
      const { data: upsertedHomeId, error: homeErr } = await supabase.rpc(
        "upsert_home_by_address",
        // Extra identity args shipped in migration 2026-07-16; cast until
        // the Lovable-generated Database types refresh.
        {
          p_address: identity.address,
          p_place_id: identity.placeId,
          p_lat: identity.lat,
          p_lng: identity.lng,
        } as never,
      );
      if (homeErr || !upsertedHomeId) {
        setSubmitting(false);
        setToast(homeErr?.message ?? "Could not save home");
        setTimeout(() => setToast(null), 3500);
        return;
      }
      homeId = upsertedHomeId as string;
      // The RPC stored coords when we had them; otherwise geocode lazily.
      if (identity.lat == null) void geocodeHome(homeId, identity.address, null);

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
      // Mirror what the RPC stored (canonical address and coords), so the
      // local state matches the database without a refetch.
      const savedCustomer: CustomerOpt = {
        id: newC.id,
        name: finalName,
        phone: phoneAddr || null,
        email: finalEmail,
        preferred_locale: customerLocale,
        home_id: homeId,
        homes: {
          address: identity.address,
          lat: identity.lat,
          lng: identity.lng,
          geocoded_at: identity.lat != null ? new Date().toISOString() : null,
        },
      };
      // If a later equipment/job write fails, the retry must reuse the customer
      // that already saved instead of inserting a duplicate.
      setExisting((prev) => [
        savedCustomer,
        ...prev.filter((item) => item.id !== savedCustomer.id),
      ]);
      setSelectedCustomerId(savedCustomer.id);
      setLocAddress(identity.address);
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
            type: savedEqType || null,

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
          type: savedEqType || null,

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

    // Attach media. Wait out in-flight uploads (progress stays visible);
    // a failed upload never blocks the job or the record.
    if (videoBusy.current) await videoBusy.current;
    try {
      await Promise.all([...photosBusy.current]);
    } catch {
      // A failed photo upload never blocks submit: it's simply not in photoPaths.
    }
    const mediaRows: Array<{
      job_id: string;
      kind: "photo" | "video";
      url: string;
      thumbnail_url: string | null;
      duration_seconds: number | null;
    }> = [];
    if (videoFinal.current) {
      mediaRows.push({
        job_id: job.id,
        kind: "video",
        url: videoFinal.current.path,
        thumbnail_url: videoFinal.current.posterPath,
        duration_seconds: videoFinal.current.duration,
      });
    }
    for (const path of photoPaths.current) {
      mediaRows.push({
        job_id: job.id,
        kind: "photo",
        url: path,
        thumbnail_url: null,
        duration_seconds: null,
      });
    }
    if (!(await insertJobMedia(mediaRows))) {
      setToast("The video or photos didn't attach. The record still sent without them.");
      setTimeout(() => setToast(null), 4500);
    }

    // Record. Persist which record rows the pro excluded, scoped to rows that
    // actually have a value, so the public record can hide exactly those.
    const presentKeys = new Set<string>([FIELD_CUSTOMER, FIELD_WORK_DONE, FIELD_RECALL]);
    if (eqType) presentKeys.add(FIELD_EQUIPMENT);
    if (eqMake || eqModel) presentKeys.add(FIELD_MAKE_MODEL);
    if (nextService) presentKeys.add(FIELD_NEXT_SERVICE);
    if (videoFinal.current) presentKeys.add(FIELD_VIDEO);
    if (photoPaths.current.length) presentKeys.add(FIELD_PHOTOS);
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
      // hidden_fields added in migration 20260715090000_job_media;
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
        has_video: !!videoFinal.current,
        photo_count: photoPaths.current.length,
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
      has_video: !!videoFinal.current,
      photo_count: photoPaths.current.length,
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
    setAiMatch(null);
    setEditDetails(false);
    setHomeAppliances([]);
    setApplianceHistory([]);
    setAttrValues({});
    setActiveTrade(proTrade);
    dictation.stop();
    amendDictation.stop();
    micLevel.stop();
    setVoiceOpen(false);
    setAmendBusy(false);
    setAmendNote("");
    setAiFlash(new Set());
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
  const liveAmendNote =
    amendDictation.listening && amendDictation.interim
      ? (amendNote ? amendNote.replace(/\s+$/, "") + " " : "") + amendDictation.interim
      : amendNote;

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
  const setNextServiceInMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const iso = d.toISOString().slice(0, 10);
    setNextService(iso);
  };
  const nextServiceField = (
    <Field
      label="Schedule a follow-up (optional)"
      hint="When should you check back in on this customer? Leave blank to decide later."
    >
      <div className="flex flex-wrap gap-2 mb-2">
        {[3, 6, 12].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setNextServiceInMonths(m)}
            className="pressable rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink hover:border-indigo hover:text-indigo transition-colors"
          >
            {m} months
          </button>
        ))}
        {nextService && (
          <button
            type="button"
            onClick={() => setNextService("")}
            className="pressable rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <Input type="date" value={nextService} onChange={(e) => setNextService(e.target.value)} />
    </Field>
  );

  /* Optional walkthrough video. Native camera via the file input (reliable on
     mobile Safari where an in-app recorder is not); also accepts a library
     pick. Upload runs in the background while the pro finishes the form. */
  const videoCapture = (
    <div>
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPickVideo(f);
          e.target.value = "";
        }}
      />
      {!videoUpload ? (
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          className="pressable w-full rounded-xl border-2 border-dashed border-indigo/40 bg-paper px-4 py-4 text-center hover:border-indigo hover:bg-indigobg/40 transition-colors"
        >
          <div className="flex items-center justify-center gap-2 text-indigo">
            <VideoIcon size={22} />
            <span className="text-sm font-semibold">Record a walkthrough video (optional)</span>
          </div>
          <div className="mt-1 text-xs text-muted">
            30 to 60 seconds showing what you did. It goes on their record.
          </div>
        </button>
      ) : (
        <div className="rounded-xl border border-line bg-paper p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {videoUpload.status === "uploading" && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo">
                    <span className="h-4 w-4 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
                    Uploading video... {Math.round(videoUpload.progress * 100)}%
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-indigobg">
                    <div
                      className="h-1.5 rounded-full bg-indigo transition-all"
                      style={{ width: `${Math.round(videoUpload.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {videoUpload.status === "done" && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo">
                  <ShieldCheck size={16} animate={false} /> Video added
                </div>
              )}
              {videoUpload.status === "error" && (
                <div className="text-sm text-red">{videoUpload.error}</div>
              )}
            </div>
            {videoUpload.status !== "uploading" && (
              <>
                <button
                  type="button"
                  onClick={() => videoRef.current?.click()}
                  className="pressable shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:border-ink/20 transition-colors"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="pressable shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:text-red hover:border-red/30 transition-colors"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* Optional job photos (up to 6). No `capture` attribute on the input: the
     picker offers both camera and library, unlike the video input which is
     locked to the camera. Uploads run in the background as each is picked. */
  const photoCapture = (
    <div>
      <input
        ref={photosRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length) onPickPhotos(files);
          e.target.value = "";
        }}
      />
      {photoItems.length === 0 ? (
        <button
          type="button"
          onClick={() => photosRef.current?.click()}
          className="pressable w-full rounded-xl border-2 border-dashed border-indigo/40 bg-paper px-4 py-4 text-center hover:border-indigo hover:bg-indigobg/40 transition-colors"
        >
          <div className="flex items-center justify-center gap-2 text-indigo">
            <ImageIcon size={22} />
            <span className="text-sm font-semibold">Add photos (optional)</span>
          </div>
          <div className="mt-1 text-xs text-muted">
            Before and after shots. They go on their record.
          </div>
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {photoItems.map((item) => (
            <div key={item.id} className="relative h-16 w-16 shrink-0">
              <img
                src={item.previewUrl}
                alt=""
                className="h-16 w-16 rounded-xl border border-line object-cover"
              />
              {item.status === "uploading" && (
                <div className="absolute inset-0 grid place-items-center rounded-xl bg-ink/40">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
              {item.status === "error" && (
                <div className="absolute inset-0 grid place-items-center rounded-xl bg-redbg/90">
                  <AlertTriangle size={16} className="text-red" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(item.id)}
                aria-label="Remove photo"
                className="pressable absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-paper text-muted hover:text-red hover:border-red/30 transition-colors"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
          {photoItems.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => photosRef.current?.click()}
              aria-label="Add more photos"
              className="pressable grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-indigo/40 bg-paper text-indigo hover:border-indigo hover:bg-indigobg/40 transition-colors"
            >
              <ImageIcon size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (!proId) {
    return (
      <div className="font-app min-h-dvh bg-soft grid place-items-center text-muted text-sm">
        {t("pro.loading")}…
      </div>
    );
  }

  return (
    <ProShell pro={pro} active="home" hideMobileCta>
      <div className={`mx-auto ${stage === "customer" ? "max-w-4xl" : "max-w-xl"}`}>
        {stage !== "done" && (
          <div className="anim-fade-up max-w-xl mx-auto mb-8">
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
                    className="pressable group w-full rounded-3xl bg-indigo px-5 py-5 text-left text-white shadow-[0_18px_40px_-18px_rgba(71,63,176,0.7)] transition-all duration-200 hover:bg-indigodark"
                  >
                    <div className="flex items-center gap-4">
                      {micImgOk ? (
                        <img
                          src="/images/homesbrain-ai-mic.png"
                          alt=""
                          aria-hidden="true"
                          onError={() => setMicImgOk(false)}
                          className="h-16 w-16 shrink-0 rounded-2xl shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] ring-1 ring-white/25 transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                          <MicIcon size={26} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-75">
                          HomesBrain AI
                        </div>
                        <div className="mt-0.5 text-xl font-extrabold tracking-tight">
                          {t("voice.justTalk")}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide">
                        {t("voice.tapToTalk")}
                      </span>
                    </div>
                  </button>
                )}
                {fullDictation.supported && (
                  <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                      or
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <Card className="space-y-3">
                  <div>
                    <div className="text-base font-semibold text-ink tracking-tight">
                      Search or add a customer
                    </div>
                    <div className="mt-0.5 text-sm text-muted">Type a name to add someone new.</div>
                  </div>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Name or address…"
                    autoFocus
                    aria-label="Search customers or type a new name to add one"
                  />

                  <div className="max-h-[560px] overflow-y-auto overflow-x-hidden -mx-1 px-1">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q && !hasExactMatch && (
                        <button
                          type="button"
                          onClick={() => startNewCustomer(query.trim())}
                          className="pressable flex w-full min-w-0 items-center gap-3 rounded-2xl border border-dashed border-indigo/40 bg-indigobg/30 px-4 py-3.5 text-left transition-all duration-200 min-h-16 hover:bg-indigobg/60 sm:col-span-2"
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
                            className={`group pressable flex w-full min-w-0 items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 min-h-16 ${
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
              <Card className="space-y-4">
                {/* Giant mic - the single, unmistakable primary action. The
                    manual textarea below is a de-emphasized fallback. */}
                <div>
                  {dictation.supported ? (
                    <>
                      <button
                        type="button"
                        onClick={openVoice}
                        aria-label="Tap and tell me what you did"
                        className="pressable group mx-auto flex h-56 w-56 sm:h-64 sm:w-64 flex-col items-center justify-center rounded-full bg-indigo text-white shadow-[0_24px_60px_-20px_rgba(71,63,176,0.55)] transition-transform duration-200 active:scale-95 hover:brightness-110"
                      >
                        <MicIcon size={72} />
                        <div className="mt-3 text-lg font-bold tracking-tight">Tap and talk</div>
                      </button>
                      <div className="mt-3 text-center text-xs text-muted">
                        Just tell HomesBrain AI about the job.
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-soft px-4 py-4 text-center text-sm text-muted">
                      Voice input isn't supported in this browser. Type below instead.
                    </div>
                  )}
                </div>

                {/* Fallback textarea - present but visually secondary. */}
                <details className="rounded-xl border border-line bg-paper">
                  <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink">
                    Or type it instead
                  </summary>
                  <div className="border-t border-line px-4 py-3">
                    <Textarea
                      value={liveWhatDone}
                      onChange={(e) => setWhatDone(e.target.value)}
                      readOnly={dictation.listening || transcribing}
                      placeholder="What was done…"
                      rows={2}
                    />
                    {transcribing && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                        <span className="h-3 w-3 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
                        HomesBrain AI improving the transcription…
                      </div>
                    )}
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
                  </div>
                </details>
                {/* When the pro has already dictated/typed, keep the transcript
                    visible outside the fallback so they can see the note. */}
                {!!liveWhatDone && !dictation.listening && !transcribing && (
                  <div className="rounded-xl bg-soft px-4 py-3 text-sm text-ink whitespace-pre-wrap">
                    {liveWhatDone}
                  </div>
                )}

                {videoCapture}

                {photoCapture}

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
                              // A tap overrides whatever the AI proposed.
                              setSelectedEquipmentId(picked ? "" : a.id);
                              setAiMatch(null);
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

                    {/* The AI bound the note to a unit on file. Say so plainly and
                        make it one tap to undo: the pro is standing at the unit
                        and is always the tiebreaker. */}
                    {aiMatch && selectedEquipmentId === aiMatch.id && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-indigobg px-3 py-2">
                        <span className="text-sm text-indigo-dark">
                          Matched to <span className="font-semibold">{aiMatch.label}</span> from
                          your note.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEquipmentId("");
                            setAiMatch(null);
                          }}
                          className="shrink-0 text-xs font-semibold text-indigo hover:underline"
                        >
                          Not this one
                        </button>
                      </div>
                    )}

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
                    Continue
                  </Btn>
                </div>
              </Card>
            )}

            {stage === "review" && (
              <div className="space-y-4">
                <p className="px-2 text-center text-sm text-muted">{t("pro.reviewAndSend")}.</p>

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
                    {langOpen ? (
                      <>
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
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted">
                          {uiCopy.language}:{" "}
                          <span className="font-semibold text-ink">
                            {LOCALES.find((l) => l.code === customerLocale)?.label ??
                              customerLocale}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setLangOpen(true)}
                          className="shrink-0 text-xs font-semibold text-indigo hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    )}
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
                    className={`mt-4 border-y px-1 py-3 transition-colors duration-700 ${
                      missingReviewAddress
                        ? "border-red/30 bg-redbg/50"
                        : aiFlash.has("address")
                          ? "border-line bg-indigobg"
                          : "border-line"
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
                      flash={aiFlash.has(FIELD_CUSTOMER)}
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
                        {reviewCustomerOptions.length > 0 && (
                          <div className="mt-2">
                            <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                              Your customers
                            </div>
                            <div className="max-h-56 space-y-1.5 overflow-auto">
                              {reviewCustomerOptions.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => linkExistingCustomer(c)}
                                  className="pressable flex w-full items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-indigo/30 hover:bg-indigobg/40"
                                >
                                  <Avatar name={c.name || "?"} accent="indigo" size={32} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">
                                      {c.name}
                                    </span>
                                    <span className="block truncate text-xs text-muted">
                                      {c.homes?.address ||
                                        c.phone ||
                                        c.email ||
                                        "No address on file"}
                                    </span>
                                  </span>
                                  <ChevronRight
                                    size={16}
                                    className="shrink-0 text-muted"
                                    aria-hidden="true"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </ReviewEditor>
                    )}
                    {closeMatch && reviewEdit !== "customer" && (
                      <div className="my-2 rounded-2xl border border-indigo/30 bg-indigobg/50 p-3 anim-fade-up">
                        <div className="text-sm text-ink">
                          This sounded like <span className="font-semibold">{closeMatch.name}</span>
                          {closeMatch.homes?.address ? (
                            <span className="text-muted"> · {closeMatch.homes.address}</span>
                          ) : null}
                          . Did you mean them?
                        </div>
                        <div className="mt-2.5 flex gap-2">
                          <Btn
                            variant="indigo"
                            size="sm"
                            onClick={() => linkExistingCustomer(closeMatch)}
                          >
                            Yes, it's them
                          </Btn>
                          <Btn
                            variant="ghost"
                            size="sm"
                            onClick={() => setDismissedSuggestionName(normalizedName(previewName))}
                          >
                            No, new customer
                          </Btn>
                        </div>
                      </div>
                    )}
                    {eqType && (
                      <RecordRow
                        label={customerCopy.equipment}
                        value={previewEquipmentType}
                        included={!hiddenFields.has(FIELD_EQUIPMENT)}
                        onToggle={() => toggleField(FIELD_EQUIPMENT)}
                        onEdit={() => setReviewEdit("equipment")}
                        flash={aiFlash.has(FIELD_EQUIPMENT)}
                      />
                    )}
                    {(eqMake || eqModel) && (
                      <RecordRow
                        label={customerCopy.makeModel}
                        value={[eqMake, eqModel].filter(Boolean).join(" · ")}
                        included={!hiddenFields.has(FIELD_MAKE_MODEL)}
                        onToggle={() => toggleField(FIELD_MAKE_MODEL)}
                        onEdit={() => setReviewEdit("equipment")}
                        flash={aiFlash.has(FIELD_MAKE_MODEL)}
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
                      flash={aiFlash.has(FIELD_WORK_DONE)}
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
                        flash={aiFlash.has(FIELD_NEXT_SERVICE)}
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
                    {videoUpload && (
                      <RecordRow
                        label={customerCopy.video}
                        value={
                          videoUpload.status === "uploading"
                            ? `Uploading ${Math.round(videoUpload.progress * 100)}%`
                            : videoUpload.status === "error"
                              ? "Upload failed"
                              : "Walkthrough video"
                        }
                        included={!hiddenFields.has(FIELD_VIDEO)}
                        onToggle={() => toggleField(FIELD_VIDEO)}
                      />
                    )}
                    {(() => {
                      const attachablePhotoCount = photoItems.filter(
                        (i) => i.status !== "error",
                      ).length;
                      return (
                        attachablePhotoCount > 0 && (
                          <RecordRow
                            label={customerCopy.photo}
                            value={`${attachablePhotoCount} photo${attachablePhotoCount === 1 ? "" : "s"}`}
                            included={!hiddenFields.has(FIELD_PHOTOS)}
                            onToggle={() => toggleField(FIELD_PHOTOS)}
                          />
                        )
                      );
                    })()}
                  </div>

                  {/* Optional walkthrough video for the AI voice flow, which
                      skips the work step and lands here. */}
                  <div className="mt-5 border-t border-line pt-4">{videoCapture}</div>

                  <div className="mt-4">{photoCapture}</div>

                  <div
                    className={`mt-5 border-t border-line pt-4 transition-colors duration-700 ${
                      aiFlash.has("email") ? "rounded-xl bg-indigobg" : ""
                    }`}
                  >
                    <label className="block">
                      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink">
                        <span>{uiCopy.email}</span>
                        {missingReviewEmail && (
                          <span className="rounded-full bg-redbg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red">
                            Needed to send
                          </span>
                        )}
                      </div>
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
                            : reviewEmailValid
                              ? "border-indigo bg-indigobg/30"
                              : ""
                        }
                      />
                      <div className="mt-1 text-xs text-muted">
                        {reviewEmailInvalid
                          ? uiCopy.emailInvalid
                          : missingReviewEmail
                            ? "Add the customer's email so we can send the record."
                            : uiCopy.emailHelp}
                      </div>
                      {reviewEmailValid && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo">
                          <Check size={14} aria-hidden="true" />
                          Ready to send. Tap {uiCopy.sendRecord} below.
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Optional "bill this customer" amount. Leave blank to skip;
                      any positive number creates an open invoice tied to the job
                      so the homeowner can pay it from /home. */}
                  <div
                    className={`mt-5 border-t border-line pt-4 transition-colors duration-700 ${
                      aiFlash.has("charge") ? "rounded-xl bg-indigobg" : ""
                    }`}
                  >
                    {chargeOpen || chargeAmount ? (
                      <>
                        <label
                          htmlFor="charge-amount"
                          className="block text-sm font-semibold text-ink"
                        >
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
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setChargeOpen(true)}
                        className="pressable flex w-full items-center gap-2 text-left text-sm font-semibold text-indigo hover:underline"
                      >
                        <span className="text-lg leading-none">+</span> {t("pro.chargeJob")}
                      </button>
                    )}
                  </div>

                  {/* Send action area. The Google review ask is always-on by
                      policy (no gating), so it is not a per-send toggle here. */}
                  <div
                    ref={sendBtnRef}
                    className={`mt-5 rounded-2xl border-t border-line pt-4 transition-all duration-500 ${
                      reviewEmailValid ? "shadow-[0_0_0_2px_var(--indigo)] shadow-indigo/20" : ""
                    }`}
                  >
                    <div className="flex gap-2">
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
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Floating HomesBrain AI button: on Review only, hovering over the
          record. Tap it and speak a correction or addition; edit-record
          applies it and the changed rows flash indigo. */}
      {stage === "review" && amendDictation.supported && !voiceOpen && (
        <button
          type="button"
          onClick={openVoiceAmend}
          disabled={amendBusy}
          aria-label="Tell HomesBrain AI what to change or add"
          title="Tell HomesBrain AI what to change or add"
          className="pressable fixed right-5 z-40 rounded-2xl shadow-[0_16px_34px_-12px_rgba(71,63,176,0.65)] transition-transform hover:scale-105"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
          {/* Same HomesBrain AI mark as the "Just talk" card on step one. */}
          {micImgOk ? (
            <img
              src="/images/homesbrain-ai-mic.png"
              alt=""
              aria-hidden="true"
              onError={() => setMicImgOk(false)}
              className="block h-14 w-14 rounded-2xl ring-1 ring-white/25"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo text-white ring-1 ring-white/25">
              <MicIcon size={24} />
            </span>
          )}
          {amendBusy && (
            <span className="absolute inset-0 grid place-items-center rounded-2xl bg-indigo/60">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </span>
          )}
        </button>
      )}

      {voiceOpen && (
        <VoiceCaptureOverlay
          levelRef={micLevel.levelRef}
          text={
            voiceMode === "full"
              ? liveFullNote
              : voiceMode === "amend"
                ? liveAmendNote
                : liveWhatDone
          }
          prompt={voiceMode === "amend" ? "Listening. What should I change or add?" : undefined}
          onDone={
            voiceMode === "full"
              ? finishFullVoice
              : voiceMode === "amend"
                ? finishAmendVoice
                : finishWorkVoice
          }
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
              {t("voice.building")}
            </div>
            {fullBusy && (
              <div
                className="mt-1 flex items-center gap-2 text-sm font-semibold text-indigo"
                role="status"
              >
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-indigo/25 border-t-indigo" />
                {t("voice.reading")}
              </div>
            )}
            <ul className="relative mt-4 space-y-2 overflow-hidden rounded-2xl">
              {/* While the AI reads the note, an indigo beam sweeps the ghost
                  rows (same beam as the nameplate scan) over shimmering
                  placeholders, so the wait reads as active work. */}
              {fullBusy && (
                <span
                  aria-hidden
                  className="scan-beam pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-gradient-to-r from-transparent via-indigo to-transparent shadow-[0_0_16px_3px_rgba(71,63,176,0.35)]"
                />
              )}
              {fullReveal.map((s, i) => {
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
                            : `bg-line text-muted ${fullBusy ? "pulse-dot" : ""}`
                      }`}
                      style={fullBusy ? { animationDelay: `${i * 0.15}s` } : undefined}
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
                      {fullBusy ? (
                        <span
                          className="skeleton mt-1.5 block h-3.5"
                          style={{
                            width: `${s.skeletonWidth}%`,
                            animationDelay: `${i * 0.12}s`,
                          }}
                        />
                      ) : (
                        <div
                          className={`mt-0.5 truncate text-sm font-semibold ${
                            s.value ? "text-ink" : "text-muted"
                          }`}
                        >
                          {s.value ?? (active || done ? t("voice.notMentioned") : "…")}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {/* While a request is in flight the pro can always bail out: a
                stalled connection must never wall them off from the form. */}
            {fullBusy && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={cancelVoiceBusy}
                  className="pressable rounded-full px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-soft hover:text-ink"
                >
                  {t("voice.cancel")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {nameChoice && (
        <SameNameChooser
          candidates={nameChoice.candidates}
          onPick={(picked) => {
            nameChoice.resolve(picked);
            setNameChoice(null);
          }}
        />
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
    </ProShell>
  );
}
