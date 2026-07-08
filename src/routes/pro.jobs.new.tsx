import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Btn,
  Card,
  Field,
  Input,
  KV,
  Pill,
  StepBar,
  Textarea,
  Toast,
  
} from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { useProGuard } from "@/components/pro-shell";
import {
  buildRecordUrl,
  checkRecall,
  formatDate,
  geocodeHome,
  logEvent,
  mockSend,
  normalizeAddress,
  tradeLabel,
} from "@/lib/hb";
import { reverseGeocode, type ResolvedAddress } from "@/lib/geo";
import { AddressField } from "@/components/address-field";
import { scanNameplate, useDictation } from "@/lib/capture";
import { CameraIcon, CheckBurst, Logo, MicIcon, ShieldCheck, UserPlusIcon } from "@/components/svg";

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
  homes: { address: string; lat: number | null; lng: number | null } | null;
};
type ApplianceOpt = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
  last_job_at: string | null;
  job_count: number;
};
type JobHistoryRow = { id: string; what_done: string; created_at: string };

const STAGES: Stage[] = ["customer", "location", "work", "review"];
const STAGE_LABELS = ["Customer", "Location", "The work", "Send"];

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

  // Nameplate scan
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Voice note
  const dictation = useDictation((text) => {
    setWhatDone((prev) => (prev ? `${prev.replace(/\s+$/, "")} ` : "") + text);
  });

  // Review
  const [sendRecord, setSendRecord] = useState(true);
  const [askReview, setAskReview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recordUrl, setRecordUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!proId) return;
    (async () => {
      const { data: c } = await supabase
        .from("customers")
        .select("id,name,phone,email,home_id,homes(address,lat,lng)")

        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setExisting((c ?? []) as unknown as CustomerOpt[]);
    })();
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
        .select("id,type,make,model,warranty_until,jobs(created_at)")
        .eq("home_id", homeId)
        .order("created_at", { ascending: false });
      const rows = (eq ?? []).map((r) => {
        const jobs = (r as { jobs?: { created_at: string }[] }).jobs ?? [];
        const last =
          jobs
            .map((j) => j.created_at)
            .sort()
            .at(-1) ?? null;
        return {
          id: r.id as string,
          type: (r.type as string | null) ?? null,
          make: (r.make as string | null) ?? null,
          model: (r.model as string | null) ?? null,
          warranty_until: (r.warranty_until as string | null) ?? null,
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

  const recall = checkRecall(eqMake, eqModel);
  const selectedCustomer = existing.find((x) => x.id === selectedCustomerId);
  const previewName = selectedCustomer?.name || newCustomer.name;
  const previewAddress = selectedCustomerId
    ? locAddress || selectedCustomer?.homes?.address || ""
    : newCustomer.address;

  // Slide-1 combobox: filter existing by name/address, offer create-new inline.
  const q = query.trim().toLowerCase();
  const filteredCustomers = q
    ? existing.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.homes?.address?.toLowerCase().includes(q),
      )
    : existing;
  const hasExactMatch = existing.some((c) => c.name?.trim().toLowerCase() === q);

  // Existing customer whose home address matches the pro's current GPS location.
  // Used to prefill the name at the top of the customer step ("At your current
  // location: Jane Doe"), so the pro just taps to confirm.
  const locationMatch =
    loc.status === "ready"
      ? existing.find(
          (c) =>
            c.homes?.address &&
            normalizeAddress(c.homes.address) === normalizeAddress(loc.address),
        )
      : undefined;


  function pickExisting(c: CustomerOpt) {
    setSelectedCustomerId(c.id);
    const onFile = c.homes?.address ?? "";
    addressTouched.current = false;
    if (onFile) {
      setLocAddress(onFile);
      // On-file address has no fresh coords unless the pro edits + picks a place.
      setResolved(null);
    } else if (loc.status === "ready") {
      // No address on file: prefill from GPS so the pro just approves or edits.
      setLocAddress(loc.address);
      setResolved({ address: loc.address, lat: gps?.lat ?? null, lng: gps?.lng ?? null });
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
    if (selectedEquipmentId) {
      equipmentId = selectedEquipmentId;
      if (editDetails) {
        await supabase
          .from("equipment")
          .update({
            type: eqType || null,
            make: eqMake || null,
            model: eqModel || null,
            warranty_until: warrantyUntil || null,
            recall_status: recall.status,
            recall_checked_at: recall.checked_at,
          })
          .eq("id", selectedEquipmentId);
      }
    } else if (eqType || eqMake || eqModel) {
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
        })
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

    // Record
    const tempUrl = buildRecordUrl("pending");
    const { data: rec } = await supabase
      .from("records")
      .insert({
        job_id: job!.id,
        public_url: tempUrl,
        sent_sms_at: sendRecord ? new Date().toISOString() : null,
        sent_email_at: sendRecord ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    const finalUrl = buildRecordUrl(rec!.id);
    await supabase.from("records").update({ public_url: finalUrl }).eq("id", rec!.id);
    setRecordUrl(finalUrl);

    if (sendRecord && toContact) {
      const body = `${proName}: Your service record is ready. ${finalUrl} (Reply STOP to opt out.)`;
      if (newCustomer.phone || existing.find((x) => x.id === customerId)?.phone) {
        await mockSend({ channel: "sms", to: toContact, body, kind: "record" });
      }
      const emailAddr = newCustomer.email || existing.find((x) => x.id === customerId)?.email || "";
      if (emailAddr) {
        const { data: sendResp, error: sendErr } = await supabase.functions.invoke("invite-claim", {
          body: { customer_id: customerId, pro_id: proId, origin: window.location.origin },
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
        .select("id,name,phone,email,home_id,homes(address)")
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
    if (scanPreview) URL.revokeObjectURL(scanPreview);
    setScanPreview(null);
    setScanState("idle");
    setScanError(null);
    dictation.stop();
    setSendRecord(true);
    setAskReview(true);
    setRecordUrl(null);
    setCopied(false);
    setStage("customer");
  }

  const canWork = whatDone.length > 0;
  const showPreview = stage === "work" || stage === "review";

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

      <div
        className={`mx-auto px-5 py-10 ${
          showPreview ? "max-w-5xl" : stage === "customer" ? "max-w-4xl" : "max-w-xl"
        }`}
      >
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

        <div className={showPreview ? "grid lg:grid-cols-[1fr_380px] gap-6 items-start" : ""}>
          <div key={stage} className="anim-fade-up">
            {stage === "customer" && (
              <Card className="space-y-3">
                {locationMatch && !q && (
                  <button
                    type="button"
                    onClick={() => pickExisting(locationMatch)}
                    className="pressable flex w-full items-center gap-3 rounded-2xl border border-indigo/40 bg-indigobg px-4 py-3.5 text-left transition-all duration-200 min-h-16 hover:bg-indigobg/80"
                  >
                    <Avatar name={locationMatch.name || "?"} accent="indigo" size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-indigo">
                        {locationMatch.name}
                      </div>
                      <div className="mt-0.5 truncate text-xs uppercase tracking-wider font-semibold text-indigo/70">
                        At your current location
                      </div>
                    </div>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-indigo"
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
                )}

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

                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickExisting(c)}
                        className="group pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3.5 text-left transition-all duration-200 min-h-16 hover:border-indigo/30 hover:bg-indigobg/40"
                      >
                        <Avatar name={c.name || "?"} accent="indigo" size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base font-semibold text-ink">{c.name}</div>
                          <div className="mt-0.5 truncate text-sm text-muted">
                            {c.homes?.address}
                          </div>
                        </div>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="shrink-0 text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-indigo"
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
                    ))}
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
                      <Input
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        placeholder="555-555-1234"
                        type="tel"
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
                {/* Big voice button - the main input */}
                <div>
                  {dictation.supported ? (
                    <button
                      type="button"
                      onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                      aria-pressed={dictation.listening}
                      aria-label={
                        dictation.listening ? "Stop recording" : "Tap and tell me what you did"
                      }
                      className={`pressable w-full rounded-2xl px-6 py-8 text-center transition-all duration-200 ${
                        dictation.listening
                          ? "bg-indigo text-white shadow-lg"
                          : "bg-indigobg text-indigo hover:bg-indigo hover:text-white"
                      }`}
                    >
                      <div
                        className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                          dictation.listening ? "bg-white/20 animate-pulse" : "bg-white/70"
                        }`}
                      >
                        <MicIcon size={36} />
                      </div>
                      <div className="mt-4 text-lg font-bold tracking-tight">
                        {dictation.listening
                          ? "Listening… tap to stop"
                          : "Tap and tell me what you did"}
                      </div>
                      <div className="mt-1 text-xs opacity-80">
                        {dictation.listening
                          ? "Talk through the job."
                          : "Your words fill in the record."}
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-soft px-4 py-4 text-center text-sm text-muted">
                      Voice input isn't supported in this browser. Type below instead.
                    </div>
                  )}
                  {dictation.listening && dictation.interim && (
                    <div className="mt-2 text-xs italic text-muted truncate text-center">
                      {dictation.interim}
                    </div>
                  )}
                </div>

                {/* Small text box - always visible, required */}
                <Field label="What was done">
                  <Textarea
                    value={whatDone}
                    onChange={(e) => setWhatDone(e.target.value)}
                    placeholder="Or type here…"
                    rows={3}
                  />
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

                {/* Recall check - always visible */}
                <div className="rounded-xl bg-indigobg px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-indigo font-semibold flex items-center gap-2">
                    <ShieldCheck size={16} animate={false} /> Recall check
                  </span>
                  <Pill accent="indigo">{recall.label}</Pill>
                </div>

                {/* Optional unit details - collapsed by default */}
                <div className="rounded-xl border border-line bg-paper">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen((v) => !v)}
                    aria-expanded={detailsOpen}
                    className="pressable w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm font-semibold text-ink">
                      Add unit details (optional)
                    </span>
                    <span
                      className={`text-muted transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                  {detailsOpen && (
                    <div className="border-t border-line px-4 py-4 space-y-4">
                      {homeAppliances.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-ink mb-2">Which unit?</div>
                          <div className="space-y-2">
                            {homeAppliances.map((a) => {
                              const label =
                                [a.type, a.make, a.model].filter(Boolean).join(" · ") ||
                                "Unnamed unit";
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
                                  className={`pressable w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                                    picked
                                      ? "border-indigo bg-indigobg shadow-sm"
                                      : "border-line bg-paper hover:bg-soft hover:border-ink/20"
                                  }`}
                                >
                                  <div className="font-semibold text-sm text-ink">{label}</div>
                                  <div className="text-xs text-muted mt-0.5 tnum">{meta}</div>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEquipmentId("");
                                setEditDetails(false);
                                setEqType("");
                                setEqMake("");
                                setEqModel("");
                                setWarrantyUntil("");
                              }}
                              aria-pressed={!selectedEquipmentId}
                              className={`pressable w-full text-left rounded-xl border border-dashed px-3 py-2.5 transition-all duration-200 ${
                                !selectedEquipmentId
                                  ? "border-indigo bg-indigobg/50 text-indigo"
                                  : "border-line bg-paper hover:bg-soft text-muted hover:text-ink"
                              }`}
                            >
                              <div className="font-semibold text-sm">+ Add a new unit</div>
                            </button>
                          </div>

                          {selectedEquipmentId && applianceHistory.length > 0 && (
                            <div className="mt-3 rounded-xl bg-soft px-3 py-2.5">
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
                              className="mt-3 text-xs font-semibold text-indigo hover:underline"
                            >
                              {editDetails ? "Hide details" : "Correct unit details"}
                            </button>
                          )}
                        </div>
                      )}

                      {(!selectedEquipmentId || editDetails) && (
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
                      )}

                      <Field label="Next service">
                        <Input
                          type="date"
                          value={nextService}
                          onChange={(e) => setNextService(e.target.value)}
                        />
                      </Field>
                    </div>
                  )}
                </div>

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
              <Card className="space-y-5">
                <label className="flex items-center justify-between rounded-xl bg-soft p-3 text-sm cursor-pointer hover:bg-line/50 transition-colors">
                  <span>Send branded record to customer</span>
                  <input
                    type="checkbox"
                    checked={sendRecord}
                    onChange={(e) => setSendRecord(e.target.checked)}
                    className="accent-[var(--indigo)] scale-125"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl bg-soft p-3 text-sm cursor-pointer hover:bg-line/50 transition-colors">
                  <span>Ask customer for a Google review</span>
                  <input
                    type="checkbox"
                    checked={askReview}
                    onChange={(e) => setAskReview(e.target.checked)}
                    className="accent-[var(--indigo)] scale-125"
                  />
                </label>

                <div className="flex gap-2">
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
                <div className="text-xs text-muted">
                  {tradeLabel(proTrade)} · {proName}
                </div>
              </Card>
            )}

            {stage === "done" && (
              <Card className="anim-scale-in text-center py-12 max-w-xl mx-auto">
                <CheckBurst className="mx-auto" />
                <h2 className="mt-4 text-2xl tracking-tight">Record sent.</h2>
                <p className="mt-2 text-sm text-muted">
                  Your customer will see it in their inbox and texts.
                </p>
                {recordUrl && (
                  <button
                    onClick={copyUrl}
                    className="pressable mt-4 inline-flex items-center gap-2 rounded-xl bg-soft px-4 py-2 text-sm font-mono text-ink hover:bg-line transition-colors break-all"
                  >
                    {copied ? "Copied ✓" : recordUrl}
                  </button>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
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

          {/* Live record preview, updates as the pro types */}
          {showPreview && (
            <div className="anim-fade-up d-2 lg:sticky lg:top-24 hidden lg:block">
              <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2 text-center">
                Live preview · what your customer gets
              </div>
              <Card className="shadow-[0_24px_60px_-30px_rgba(22,22,15,0.3)]">
                <div className="flex items-center gap-3">
                  <Avatar name={proName || "?"} accent="indigo" size={40} />
                  <div>
                    <div className="font-extrabold text-ink text-sm">
                      {proName || "Your business"}
                    </div>
                    <div className="text-xs text-muted">{tradeLabel(proTrade)}</div>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight font-display">
                  Service record
                </h3>
                <div className="text-xs text-muted">{previewAddress || "Service address"}</div>
                <div className="mt-2">
                  <KV k="Customer" v={previewName || "-"} />
                  <KV k="Equipment" v={eqType || "-"} />
                  <KV k="Make / Model" v={[eqMake, eqModel].filter(Boolean).join(" · ") || "-"} />
                  <KV k="Work done" v={whatDone || "-"} />
                  <KV k="Next service" v={nextService || "-"} />
                  <KV
                    k="Recall status"
                    v={
                      <span className="inline-flex items-center gap-1.5 text-indigo font-semibold">
                        <ShieldCheck size={14} animate={false} /> None known
                      </span>
                    }
                  />
                </div>
                <div className="mt-4">
                  <div className="rounded-full bg-indigo text-white text-center text-sm font-semibold py-2.5 opacity-90">
                    Claim your home, free
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
    </div>
  );
}
