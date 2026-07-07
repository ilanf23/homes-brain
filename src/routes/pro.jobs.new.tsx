import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Avatar, Btn, Card, Field, Input, KV, Pill, StepBar, Textarea, Toast } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { useProGuard } from "@/components/pro-shell";
import { buildRecordUrl, checkRecall, geocodeHome, logEvent, mockSend, tradeLabel } from "@/lib/hb";
import { scanNameplate, useDictation } from "@/lib/capture";
import { CameraIcon, CheckBurst, Logo, MicIcon, ShieldCheck } from "@/components/svg";

export const Route = createFileRoute("/pro/jobs/new")({
  head: () => ({ meta: [{ title: "Log a job - HomesBrain" }] }),
  component: NewJob,
});

type Stage = "customer" | "work" | "review" | "done";
type CustomerOpt = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  home_id: string;
  homes: { address: string } | null;
};

const STAGES: Stage[] = ["customer", "work", "review"];
const STAGE_LABELS = ["Customer", "The work", "Send"];

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
  const [consent, setConsent] = useState(false);

  // Work
  const [eqType, setEqType] = useState("");
  const [eqMake, setEqMake] = useState("");
  const [eqModel, setEqModel] = useState("");
  const [eqSerial, setEqSerial] = useState("");
  const [warrantyUntil, setWarrantyUntil] = useState("");
  const [whatDone, setWhatDone] = useState("");
  const [nextService, setNextService] = useState("");

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
        .select("id,name,phone,email,home_id,homes(address)")
        .eq("pro_id", proId)
        .order("created_at", { ascending: false });
      setExisting((c ?? []) as unknown as CustomerOpt[]);
    })();
  }, [proId]);

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
      if (r.serial && !eqSerial) {
        setEqSerial(r.serial);
        filled.push("serial");
      }
      if (r.warranty_until && /^\d{4}-\d{2}-\d{2}$/.test(r.warranty_until) && !warrantyUntil) {
        setWarrantyUntil(r.warranty_until);
        filled.push("warranty");
      }
      const detectedNothing = !r.type && !r.make && !r.model && !r.serial && !r.warranty_until;
      if (detectedNothing) {
        setScanState("error");
        setScanError("Couldn't read the nameplate. Type the details in below.");
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
  const previewAddress = selectedCustomer?.homes?.address || newCustomer.address;

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
      // Fire-and-forget geocode; safe to call even if home already existed
      // (geocoded_at gate prevents double work).
      void geocodeHome(homeId, newCustomer.address);

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

    // Equipment
    let equipmentId: string | undefined;
    if (eqType || eqMake || eqModel) {
      const { data: eq } = await supabase
        .from("equipment")
        .insert({
          home_id: homeId!,
          type: eqType || null,
          make: eqMake || null,
          model: eqModel || null,
          serial: eqSerial || null,
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
    setConsent(false);
    setEqType("");
    setEqMake("");
    setEqModel("");
    setEqSerial("");
    setWarrantyUntil("");
    setWhatDone("");
    setNextService("");
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

  const canCustomer = selectedCustomerId || (newCustomer.name && newCustomer.address && consent);
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

      <div className={`mx-auto px-5 py-10 ${showPreview ? "max-w-5xl" : "max-w-xl"}`}>
        {stage !== "done" && (
          <div className="anim-fade-up max-w-xl mx-auto mb-8">
            <StepBar steps={STAGE_LABELS} current={STAGES.indexOf(stage)} accent="indigo" />
            <h1 className="mt-6 text-2xl tracking-tight text-center">
              {stage === "customer"
                ? "Who is this for?"
                : stage === "work"
                  ? "What did you do?"
                  : "Review and send"}
            </h1>
          </div>
        )}

        <div className={showPreview ? "grid lg:grid-cols-[1fr_380px] gap-6 items-start" : ""}>
          <div key={stage} className="anim-fade-up">
            {stage === "customer" && (
              <Card className="space-y-5">
                {existing.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-ink mb-2">Existing customer</div>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {existing.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setSelectedCustomerId(c.id === selectedCustomerId ? "" : c.id)
                          }
                          aria-pressed={selectedCustomerId === c.id}
                          className={`pressable w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                            selectedCustomerId === c.id
                              ? "border-indigo bg-indigobg shadow-sm"
                              : "border-line bg-paper hover:bg-soft hover:border-ink/20"
                          }`}
                        >
                          <div className="font-semibold text-sm">{c.name}</div>
                          <div className="text-xs text-muted">{c.homes?.address}</div>
                        </button>
                      ))}
                    </div>
                    <div className="text-center text-xs text-muted my-3">- or add new -</div>
                  </div>
                )}

                <Field label="Customer name">
                  <Input
                    value={newCustomer.name}
                    disabled={!!selectedCustomerId}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </Field>
                <Field label="Service address">
                  <Input
                    value={newCustomer.address}
                    disabled={!!selectedCustomerId}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    placeholder="123 Maple St, Austin TX"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone">
                    <Input
                      value={newCustomer.phone}
                      disabled={!!selectedCustomerId}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="555-555-1234"
                      type="tel"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={newCustomer.email}
                      disabled={!!selectedCustomerId}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      placeholder="jane@email.com"
                      type="email"
                    />
                  </Field>
                </div>

                {!selectedCustomerId && (
                  <label className="flex items-start gap-2 text-sm text-ink rounded-xl bg-soft p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 accent-[var(--indigo)]"
                    />
                    <span>
                      By adding this customer you confirm they agreed to receive a service record
                      and updates by text.
                    </span>
                  </label>
                )}

                <Btn
                  variant="indigo"
                  size="lg"
                  className="w-full"
                  disabled={!canCustomer}
                  onClick={() => setStage("work")}
                >
                  Continue
                </Btn>
              </Card>
            )}

            {stage === "work" && (
              <Card className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-ink mb-1.5">Nameplate</div>
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
                      className="pressable w-full rounded-xl border-2 border-dashed border-indigo/40 bg-indigobg/50 px-4 py-6 text-center hover:border-indigo transition-colors"
                    >
                      <CameraIcon size={26} className="mx-auto text-indigo" />
                      <div className="mt-2 text-sm font-semibold text-indigo">
                        Snap the nameplate
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        Make, model, serial and warranty fill in for you.
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-line bg-paper p-3">
                      <div className="flex items-center gap-3">
                        {scanPreview && (
                          <img
                            src={scanPreview}
                            alt="Nameplate photo"
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {scanState === "scanning" && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-indigo">
                              <span className="h-4 w-4 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
                              Reading nameplate…
                            </div>
                          )}
                          {scanState === "done" && (
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo">
                              <ShieldCheck size={16} animate={false} /> Auto-detected. Check the
                              fields below
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
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Equipment type">
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
                  <Field label="Serial (optional)">
                    <Input value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} />
                  </Field>
                  <Field label="Warranty until">
                    <Input
                      type="date"
                      value={warrantyUntil}
                      onChange={(e) => setWarrantyUntil(e.target.value)}
                    />
                  </Field>
                  <Field label="Next service">
                    <Input
                      type="date"
                      value={nextService}
                      onChange={(e) => setNextService(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="What was done">
                  <div className="relative">
                    <Textarea
                      value={whatDone}
                      onChange={(e) => setWhatDone(e.target.value)}
                      placeholder="Annual service, resin check, replaced pre-filter."
                      className={dictation.supported ? "pr-12" : ""}
                    />
                    {dictation.supported && (
                      <button
                        type="button"
                        onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                        aria-label={
                          dictation.listening ? "Stop dictation" : "Dictate what was done"
                        }
                        aria-pressed={dictation.listening}
                        className={`pressable absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                          dictation.listening
                            ? "bg-indigo text-white"
                            : "bg-soft text-muted hover:bg-indigobg hover:text-indigo"
                        }`}
                      >
                        <MicIcon size={17} />
                      </button>
                    )}
                  </div>
                  {dictation.listening && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-indigo">
                      <span className="h-2 w-2 rounded-full bg-indigo animate-pulse" />
                      <span className="font-semibold">Listening. Talk through the job.</span>
                      {dictation.interim && (
                        <span className="truncate italic text-muted">{dictation.interim}</span>
                      )}
                    </div>
                  )}
                </Field>

                <div className="rounded-xl bg-indigobg px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-indigo font-semibold flex items-center gap-2">
                    <ShieldCheck size={16} animate={false} /> Recall check
                  </span>
                  <Pill accent="indigo">{recall.label}</Pill>
                </div>

                <div className="flex gap-2">
                  <Btn variant="secondary" onClick={() => setStage("customer")}>
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
