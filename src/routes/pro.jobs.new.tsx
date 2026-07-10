import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Btn, Card, Field, Input, PhoneInput, Pill, StepBar, Textarea, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { useProGuard } from "@/components/pro-shell";
import { ClaimQRModal } from "@/components/claim-qr-modal";
import { QrCode } from "lucide-react";
import {
  buildRecordUrl,
  checkRecall,
  formatDate,
  geocodeHome,
  haversineMeters,
  logEvent,
  mockSend,
  normalizeAddress,
  tradeLabel,
} from "@/lib/hb";
import { createInvoice, formatMoney } from "@/lib/invoices";

import { reverseGeocode, type ResolvedAddress } from "@/lib/geo";
import { AddressField } from "@/components/address-field";
import { extractFromNotes, extractFullJob, scanNameplate, useDictation, useMicLevel } from "@/lib/capture";
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

/* One row of the live record. Tapping toggles whether the customer sees it;
   excluded rows dim and strike through so the pro sees exactly what is left off. */
function RecordRow({
  label,
  value,
  included,
  onToggle,
}: {
  label: string;
  value: ReactNode;
  included: boolean;
  onToggle?: () => void;
}) {
  const dim = !included;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={included}
      className="pressable flex w-full items-start justify-between gap-3 border-b border-line py-3 text-left last:border-b-0"
    >
      <div className="flex items-center gap-2.5 shrink-0">
        <CheckSquare on={included} />
        <span className={`text-sm text-muted ${dim ? "opacity-50" : ""}`}>{label}</span>
      </div>
      <span
        className={`text-sm font-semibold text-ink text-right font-mono text-[13px] tnum min-w-0 ${
          dim ? "opacity-50 line-through" : ""
        }`}
      >
        {value}
      </span>
    </button>
  );
}

function NewJob() {
  const navigate = useNavigate();
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
  const [submitting, setSubmitting] = useState(false);
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  // Captured on submit so the "Show claim QR" button on the done screen can
  // open ClaimQRModal for the same customer + record we just sent.
  const [sentCustomerId, setSentCustomerId] = useState<string | null>(null);
  const [sentRecordId, setSentRecordId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  // Optional "bill this customer" amount entered on the review slide. String so
  // the input can be empty; parsed to a number at submit time. When >0 we also
  // create an open invoice so the homeowner can pay it via the existing flow.
  const [chargeAmount, setChargeAmount] = useState("");
  const [billedAmount, setBilledAmount] = useState<number | null>(null);
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
        .select("id,name,phone,email,home_id,homes(address,lat,lng,geocoded_at)")
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

  /* Prefill the location field once GPS resolves, even if it arrives after
     the pro reached the location slide (high-accuracy GPS can take 5-15s).
     Fills a new customer's address, or an existing customer's address when
     nothing is on file. Only fires while the field is still empty and
     untouched, so it never overwrites a typed or picked address. */
  useEffect(() => {
    if (stage !== "location") return;
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
            attrs && typeof attrs === "object"
              ? (attrs as Record<string, string | boolean>)
              : null,
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
      if (
        r.next_service_date &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.next_service_date) &&
        !nextService
      ) {
        setNextService(r.next_service_date);
        filled.push("next service");
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



  const recall = checkRecall(eqMake, eqModel);
  const selectedCustomer = existing.find((x) => x.id === selectedCustomerId);
  const previewName = selectedCustomer?.name || newCustomer.name;
  const previewAddress = selectedCustomerId
    ? locAddress || selectedCustomer?.homes?.address || ""
    : newCustomer.address;

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
    const onFile = c.homes?.address ?? "";
    addressTouched.current = false;
    // Prefer the pro's current GPS location as the editable prefill: most jobs
    // happen where the truck is parked. Fall back to the on-file address, then
    // empty. The pro can always edit or pick a different place.
    if (loc.status === "ready") {
      setLocAddress(loc.address);
      setResolved({ address: loc.address, lat: gps?.lat ?? null, lng: gps?.lng ?? null });
    } else if (onFile) {
      setLocAddress(onFile);
      setResolved(null);
    } else {
      setLocAddress("");
      setResolved(null);
    }
    setStage("location");
  }

  function startNewCustomer(name: string) {
    setSelectedCustomerId("");
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
    const note = fullNote.trim();
    if (!note) {
      closeVoice();
      return;
    }
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
    // Stop mic/dictation now that we have the transcript in hand.
    closeVoice();
    setFullBusy(false);

    // Match by name against existing customers (case-insensitive, whole-string).
    const nm = (extract.customer_name ?? "").trim().toLowerCase();
    const match = nm ? existing.find((c) => c.name.trim().toLowerCase() === nm) : undefined;

    if (match) {
      setSelectedCustomerId(match.id);
      const onFile = match.homes?.address ?? "";
      const addr = extract.address?.trim() || onFile;
      setLocAddress(addr);
      addressTouched.current = true;
      setResolved(null);
    } else {
      setSelectedCustomerId("");
      setNewCustomer({
        name: extract.customer_name ?? "",
        address: extract.address ?? "",
        phone: extract.customer_phone ?? "",
        email: extract.customer_email ?? "",
      });
      if (extract.address) {
        setLocAddress(extract.address);
        addressTouched.current = true;
        setResolved(null);
      }
    }

    // Work fields — only fill blanks, but here they always start blank on a
    // fresh flow. what_done_clean is the tidy version; fall back to the raw
    // transcript so the pro still has their words if the AI returned nothing.
    if (extract.type) setEqType(extract.type);
    if (extract.make) setEqMake(extract.make);
    if (extract.model) setEqModel(extract.model);
    setWhatDone(extract.what_done_clean ?? note);
    if (extract.next_service_date) setNextService(extract.next_service_date);

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
      ].filter(Boolean),
      matched_existing: !!match,
    });

    setStage("review");
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

  async function submit() {
    if (!proId) return;
    setSubmitting(true);

    let customerId = selectedCustomerId;
    let homeId: string | undefined;
    let toName = "";
    let toContact = "";

    if (customerId) {
      const c = existing.find((x) => x.id === customerId)!;
      homeId = c.home_id;
      toName = c.name;
      toContact = c.phone || c.email || "";
      // Pro confirmed the address on the location slide; if they changed it
      // (moved, corrected a typo), update the home in place.
      const onFile = c.homes?.address ?? "";
      const confirmed = locAddress.trim();
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
        { p_address: newCustomer.address },
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
      void geocodeHome(homeId, newCustomer.address, coordsFor(newCustomer.address));

      const { data: newC } = await supabase
        .from("customers")
        .insert({
          pro_id: proId,
          home_id: homeId,
          name: newCustomer.name,
          phone: newCustomer.phone || null,
          email: newCustomer.email || null,
          consent_at: new Date().toISOString(),
          consent_ref: `web_form_${Date.now()}`,
        })
        .select("id")
        .single();
      customerId = newC!.id;
      toName = newCustomer.name;
      toContact = newCustomer.phone || newCustomer.email || "";
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
        await supabase
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
      }
    } else if (eqType || eqMake || eqModel || hasAttrs) {
      const { data: eq } = await supabase
        .from("equipment")
        .insert({
          home_id: homeId!,
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
      equipmentId = eq?.id;
    }

    // Job
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        pro_id: proId,
        home_id: homeId!,
        customer_id: customerId,
        equipment_id: equipmentId,
        what_done: whatDone,
        next_service_date: nextService || null,
      })
      .select("id")
      .single();

    // Optional invoice: if the pro entered a charge amount, create an open
    // invoice tied to this job so the homeowner can pay through /home.
    const chargeNum = parseFloat(chargeAmount);
    setBilledAmount(null);
    if (job?.id && customerId && homeId && Number.isFinite(chargeNum) && chargeNum > 0) {
      const inv = await createInvoice({
        proId,
        customerId,
        homeId,
        jobId: job.id,
        items: [{ description: whatDone.trim() || "Service", amount: chargeNum }],
      });
      if (inv) setBilledAmount(chargeNum);
    }

    // Record. Persist which record rows the pro excluded, scoped to rows that
    // actually have a value, so the public record can hide exactly those.
    const presentKeys = new Set<string>([FIELD_CUSTOMER, FIELD_WORK_DONE, FIELD_RECALL]);
    if (eqType) presentKeys.add(FIELD_EQUIPMENT);
    if (eqMake || eqModel) presentKeys.add(FIELD_MAKE_MODEL);
    if (nextService) presentKeys.add(FIELD_NEXT_SERVICE);
    const hidden = Array.from(hiddenFields).filter((k) => presentKeys.has(k));

    const tempUrl = buildRecordUrl("pending");
    // Only reference hidden_fields when the pro actually excluded a row, so a
    // normal send never touches the new column before the migration syncs.
    const recordPayload = {
      job_id: job!.id,
      public_url: tempUrl,
      sent_sms_at: new Date().toISOString(),
      sent_email_at: new Date().toISOString(),
      ...(hidden.length ? { hidden_fields: hidden } : {}),
    };
    const { data: rec } = await supabase
      .from("records")
      // hidden_fields added in migration 20260708120000_record_hidden_fields;
      // cast until Lovable regenerates supabase types.ts from the migration.
      .insert(recordPayload as never)
      .select("id")
      .single();
    const finalUrl = buildRecordUrl(rec!.id);
    await supabase.from("records").update({ public_url: finalUrl }).eq("id", rec!.id);
    setRecordUrl(finalUrl);
    setSentCustomerId(customerId);
    setSentRecordId(rec!.id);

    if (toContact) {
      const body = `${proName}: Your service record is ready. ${finalUrl} (Reply STOP to opt out.)`;
      if (newCustomer.phone || existing.find((x) => x.id === customerId)?.phone) {
        await mockSend({ channel: "sms", to: toContact, body, kind: "record" });
      }
      const emailAddr = newCustomer.email || existing.find((x) => x.id === customerId)?.email || "";
      if (emailAddr) {
        const { data: sendResp, error: sendErr } = await supabase.functions.invoke("invite-claim", {
          body: {
            customer_id: customerId,
            pro_id: proId,
            origin: window.location.origin,
            record_id: rec!.id,
          },
        });
        if (sendErr || (sendResp && sendResp.ok === false)) {
          const code = (sendResp && sendResp.code) || sendErr?.message || "send_failed";
          await mockSend({
            channel: "email",
            to: emailAddr,
            body: `Subject: Your service record from ${proName}\n\n(Fallback preview. Real send failed: ${code})\n\nHi ${toName},\n\nYour service record is ready: ${finalUrl}\n\nThanks,\n${proName}`,
            kind: "record",
          });
          setToast(`Email preview saved (${code})`);
          setTimeout(() => setToast(null), 3500);
        }
      }
      await logEvent(`pro:${proId}`, "record_sent", { record_id: rec!.id });
    }

    if (askReview && toContact) {
      const body = `${proName}: Thanks for choosing us! Mind leaving a Google review? It really helps. (Reply STOP to opt out.)`;
      await mockSend({ channel: "sms", to: toContact, body, kind: "review_request" });
      await logEvent(`pro:${proId}`, "review_requested", { customer_id: customerId });
    }

    if (existing.length === 0) {
      await logEvent(`pro:${proId}`, "pro_activated", {});
    }

    setSubmitting(false);
    setStage("done");
    setToast("Record sent");
    setTimeout(() => setToast(null), 3500);
  }

  async function copyUrl() {
    if (!recordUrl) return;
    await navigator.clipboard.writeText(recordUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* Reset in place for "Log another", no page reload. Refetch customers so the
     one just added is selectable on the next pass. */
  async function logAnother() {
    if (proId) {
      const { data: c } = await supabase
        .from("customers")
        .select("id,name,phone,email,home_id,homes(address,lat,lng)")
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
    setHiddenFields(new Set());
    setRecordUrl(null);
    setSentCustomerId(null);
    setSentRecordId(null);
    setQrOpen(false);
    setCopied(false);
    setChargeAmount("");
    setBilledAmount(null);
    setStage("customer");
  }

  const canWork = whatDone.length > 0;

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
        Loading…
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
          <Pill accent="indigo">Log a job</Pill>
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
              Back to dashboard
            </Link>
            <StepBar steps={STAGE_LABELS} current={STAGES.indexOf(stage)} accent="indigo" />
            <h1 className="mt-6 text-2xl tracking-tight text-center">
              {stage === "customer"
                ? "Who is this for?"
                : stage === "location"
                  ? "Where's the job?"
                  : stage === "work"
                    ? "What did you do?"
                    : "Review and send"}
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
                    aria-label="Speak the whole job and I'll fill it in"
                    className="pressable group w-full rounded-3xl bg-indigo px-6 py-6 text-left text-white shadow-[0_18px_40px_-18px_rgba(71,63,176,0.7)] transition-all duration-200 hover:bg-indigodark"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <MicIcon size={26} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-extrabold tracking-tight">
                          Just tell me about the job
                        </div>
                        <div className="mt-0.5 text-sm opacity-90">
                          Who it's for, where, when, what you did. I'll fill everything in.
                        </div>
                      </div>
                    </div>
                  </button>
                )}
                {fullBusy && (
                  <div className="rounded-2xl border border-indigo/20 bg-indigobg px-4 py-3 text-sm font-semibold text-indigo">
                    Reading what you said…
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

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Phone (optional)">
                      <PhoneInput
                        value={newCustomer.phone}
                        onChange={(v) => setNewCustomer({ ...newCustomer, phone: v })}
                      />
                    </Field>
                    <Field label="Email (optional)">
                      <Input
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        placeholder="jane@email.com"
                        type="email"
                      />
                    </Field>
                  </div>

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
                      <div className="mt-4 text-lg font-bold tracking-tight">
                        Tap and tell me what you did
                      </div>
                      <div className="mt-1 text-xs opacity-80">Your words fill in the record.</div>
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
                      Reading your note…
                    </div>
                  )}
                  {extractState === "done" && extractFilled.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo">
                      <ShieldCheck size={13} animate={false} />
                      Auto-filled {extractFilled.join(", ")} below
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
                        We'll fill in make, model, and warranty for you.
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
                              Reading the photo…
                            </div>
                          )}
                          {scanState === "done" && (
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo">
                              <ShieldCheck size={16} animate={false} /> Auto-filled unit details
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
                  <Btn variant="secondary" onClick={() => setStage("location")}>
                    Back
                  </Btn>
                  <Btn
                    variant="indigo"
                    size="lg"
                    className="flex-1"
                    disabled={!canWork}
                    onClick={() => setStage("review")}
                  >
                    Review
                  </Btn>
                </div>
              </Card>
            )}

            {stage === "review" && (
              <div className="space-y-4">
                <p className="px-2 text-center text-sm text-muted">
                  This is your customer's live record. Check what to include, uncheck what to leave
                  off.
                </p>

                {/* One box: the live record IS the control surface. Every row is a
                    checkmark, and the Google review ask lives inside the same box. */}
                <Card className="shadow-[0_24px_60px_-30px_rgba(22,22,15,0.18)]">
                  <div className="flex items-center gap-3">
                    <Avatar name={proName || "?"} accent="indigo" size={44} />
                    <div className="min-w-0">
                      <div className="truncate font-extrabold text-ink">
                        {proName || "Your business"}
                      </div>
                      <div className="text-xs text-muted">{tradeLabel(proTrade)}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-semibold tracking-tight">Service record</h3>
                    <div className="text-xs text-muted">{previewAddress || "Service address"}</div>
                  </div>

                  <div className="mt-3">
                    <RecordRow
                      label="Customer"
                      value={previewName || "-"}
                      included={!hiddenFields.has(FIELD_CUSTOMER)}
                      onToggle={() => toggleField(FIELD_CUSTOMER)}
                    />
                    {eqType && (
                      <RecordRow
                        label="Equipment"
                        value={eqType}
                        included={!hiddenFields.has(FIELD_EQUIPMENT)}
                        onToggle={() => toggleField(FIELD_EQUIPMENT)}
                      />
                    )}
                    {(eqMake || eqModel) && (
                      <RecordRow
                        label="Make / Model"
                        value={[eqMake, eqModel].filter(Boolean).join(" · ")}
                        included={!hiddenFields.has(FIELD_MAKE_MODEL)}
                        onToggle={() => toggleField(FIELD_MAKE_MODEL)}
                      />
                    )}
                    <RecordRow
                      label="Work done"
                      value={whatDone || "-"}
                      included={!hiddenFields.has(FIELD_WORK_DONE)}
                      onToggle={() => toggleField(FIELD_WORK_DONE)}
                    />
                    {nextService && (
                      <RecordRow
                        label="Next service"
                        value={formatDate(nextService)}
                        included={!hiddenFields.has(FIELD_NEXT_SERVICE)}
                        onToggle={() => toggleField(FIELD_NEXT_SERVICE)}
                      />
                    )}
                  </div>

                  {/* Optional "bill this customer" amount. Leave blank to skip;
                      any positive number creates an open invoice tied to the job
                      so the homeowner can pay it from /home. */}
                  <div className="mt-5 border-t border-line pt-4">
                    <label htmlFor="charge-amount" className="block text-sm font-semibold text-ink">
                      Charge for this job (optional)
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
                    <p className="mt-1.5 text-xs text-muted">
                      Leave blank if you're not billing through the app.
                    </p>
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
                        Ask customer for a Google review after sending
                      </span>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <Btn variant="secondary" onClick={() => setStage("work")}>
                        Back
                      </Btn>
                      <Btn
                        variant="indigo"
                        size="lg"
                        className="flex-1"
                        loading={submitting}
                        onClick={submit}
                      >
                        Send record
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
                <CheckBurst className="mx-auto" />
                <h2 className="mt-4 text-2xl tracking-tight">Record sent.</h2>
                <p className="mt-2 text-sm text-muted">
                  Your customer will see it in their inbox and texts.
                </p>
                {billedAmount != null && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigobg px-4 py-2 text-sm font-semibold text-indigo">
                    Billed {formatMoney(billedAmount)} · they can pay it from their home page
                  </div>
                )}
                {recordUrl && (
                  <button
                    onClick={copyUrl}
                    className="pressable mt-4 inline-flex items-center gap-2 rounded-xl bg-soft px-4 py-2 text-sm font-mono text-ink hover:bg-line transition-colors break-all"
                  >
                    {copied ? "Copied ✓" : recordUrl}
                  </button>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {sentCustomerId && (
                    <Btn variant="secondary" onClick={() => setQrOpen(true)}>
                      <QrCode size={15} /> Show claim QR
                    </Btn>
                  )}
                  <Btn variant="indigo" onClick={logAnother}>
                    Log another
                  </Btn>
                  <Link to="/pro">
                    <Btn variant="secondary">Back to dashboard</Btn>
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
          text={liveWhatDone}
          onDone={closeVoice}
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
    </div>
  );
}
