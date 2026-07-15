import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Locale } from "@/lib/i18n";

/* Magic capture for log-a-job: nameplate photo → equipment fields, and live
   voice dictation → "what was done". */

/* BCP-47 tags for the browser speech recognizer, keyed by the pro's UI locale
   so dictation listens in the language the pro chose to work in. es-US suits
   the US home-services market. */
const SPEECH_LANG: Record<Locale, string> = {
  en: "en-US",
  es: "es-US",
  ru: "ru-RU",
  uk: "uk-UA",
};

export type NameplateScan = {
  type: string | null;
  make: string | null;
  model: string | null;
  warranty_until: string | null;
};

/* Phone camera shots run 5–12 MB; the model reads a 1400px JPEG just as well. */
const MAX_EDGE = 1400;

async function decodeImage(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    // Some formats (e.g. HEIC in older Safari paths) fail createImageBitmap but decode via <img>.
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't read that photo. Try a JPEG."));
      img.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  }
}

async function drawToCanvas(file: File): Promise<HTMLCanvasElement> {
  const { source, width, height, release } = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    release();
  }
}

async function toJpegDataUri(file: File): Promise<string> {
  return (await drawToCanvas(file)).toDataURL("image/jpeg", 0.85);
}

/* Resized JPEG as a Blob, for uploading the unit photo to storage. */
export async function toJpegBlob(file: File): Promise<Blob> {
  const canvas = await drawToCanvas(file);
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo. Try a JPEG."))),
      "image/jpeg",
      0.85,
    ),
  );
}

export async function scanNameplate(file: File): Promise<NameplateScan> {
  const image = await toJpegDataUri(file);
  const { data, error } = await supabase.functions.invoke("scan-nameplate", { body: { image } });
  if (error) {
    // Non-2xx responses surface as FunctionsHttpError; the useful message is in the body.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      if (body?.error) throw new Error(body.error);
    }
    throw new Error("Couldn't read the nameplate. Try again.");
  }
  if (data?.error) throw new Error(data.error);
  return data as NameplateScan;
}

/* ---------- Extract equipment fields from a free-text note ---------- */

/* Which unit on the home the note is about. Only ever returned when the caller
   supplied a roster, and matched_id is always one of the ids it supplied.
   "low" means the model could not narrow it down: do not auto-attach, ask. */
export type EquipmentRef = {
  matched_id: string | null;
  confidence: "high" | "low";
  reason: string | null;
};

/* The shape the AI needs to recognise a unit. Deliberately thin: identity only,
   never another pro's notes. */
export type UnitHint = {
  id: string;
  type: string | null;
  make: string | null;
  model: string | null;
};

export type JobExtract = {
  type: string | null;
  make: string | null;
  model: string | null;
  next_service_date: string | null;
  charge_amount: number | null;
  what_done_clean: string | null;
  equipment_ref: EquipmentRef | null;
};

export async function extractFromNotes(
  note: string,
  trade?: string,
  units?: UnitHint[],
  locale?: Locale,
): Promise<JobExtract> {
  const { data, error } = await supabase.functions.invoke("extract-job", {
    body: { note, trade, units, locale },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      if (body?.error) throw new Error(body.error);
    }
    throw new Error("Couldn't read the note. Try again.");
  }
  if (data?.error) throw new Error(data.error);
  return data as JobExtract;
}

/* "Speak the whole job" flow: one note → customer + address + equipment +
   what-was-done + next-service. Any field the pro didn't mention comes back
   null; the caller fills only the blanks it has room for. */
export type FullJobExtract = JobExtract & {
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
};

export async function extractFullJob(
  note: string,
  trade?: string,
  locale?: Locale,
): Promise<FullJobExtract> {
  const { data, error } = await supabase.functions.invoke("extract-job", {
    body: { note, trade, mode: "full", locale },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      if (body?.error) throw new Error(body.error);
    }
    throw new Error("Couldn't read the note. Try again.");
  }
  if (data?.error) throw new Error(data.error);
  return data as FullJobExtract;
}

/* ---------- Server-side transcription ---------- */

/* Read a recorded clip as base64 (no data: prefix) for JSON transport. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the recording."));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

/* Transcribe a recorded voice clip on the server. Far more accurate than the
   browser Web Speech API, and it handles mixed-language speech (e.g. an English
   customer name inside a Russian sentence), which the browser recognizer cannot.
   The pro's locale is passed for an optional hint; the caller keeps the Web
   Speech text as a fallback if this throws. */
export async function transcribeAudio(blob: Blob, locale?: Locale): Promise<string> {
  const audio = await blobToBase64(blob);
  const { data, error } = await supabase.functions.invoke("transcribe", {
    body: { audio, mime: blob.type || "audio/webm", locale },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      if (body?.error) throw new Error(body.error);
    }
    throw new Error("Couldn't transcribe the recording.");
  }
  if (data?.error) throw new Error(data.error);
  return typeof data?.text === "string" ? data.text : "";
}

/* ---------- Voice dictation (Web Speech API) ---------- */

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function recognitionCtor(): (new () => Recognition) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
}

export function useDictation(onText: (finalText: string) => void, locale?: Locale) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const supported = !!recognitionCtor();

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor || recRef.current) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    // Listen in the pro's chosen UI language. "en" is the app default rather
    // than a choice the pro necessarily made, so it defers to the device
    // language: a Spanish-language phone dictates in Spanish even when the pro
    // never opened the language setting.
    rec.lang =
      (locale && locale !== "en" && SPEECH_LANG[locale]) || navigator.language || "en-US";
    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onTextRef.current(r[0].transcript.trim());
        else pending += r[0].transcript;
      }
      setInterim(pending);
    };
    rec.onerror = null;
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function stop() {
    recRef.current?.stop();
  }

  useEffect(() => () => recRef.current?.stop(), []);

  return { supported, listening, interim, start, stop };
}

/* ---------- Mic amplitude + spectrum (Web Audio) ----------
   Runs alongside useDictation to give the immersive voice UI live audio
   signals the transcript can't provide. Exposes two mutable refs that visual
   code reads every frame - no per-frame React state, so the orb can animate
   without re-rendering the tree:
   - `levelRef`: overall loudness 0..1, smoothed.
   - `bandsRef`: Float32Array(MIC_BAND_COUNT) of log-spaced frequency bands
     0..1 covering the speech range (~90Hz-6kHz), each with fast-attack /
     slow-decay smoothing so bars leap on syllables and settle gracefully.

   IMPORTANT lifecycle: start() must be called from a user gesture (the tap that
   opens the voice UI) so the AudioContext can resume under the autoplay policy;
   stop() tears down the stream + context + rAF so the mic never stays hot. */
export const MIC_BAND_COUNT = 48;

/* Container/codec for the recorded clip. We prefer Opus in WebM (Chrome/Firefox)
   and fall back to MP4/AAC (Safari); both are accepted by the transcription
   model, which infers the format from the blob's MIME type. */
function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

export function useMicLevel() {
  const levelRef = useRef(0);
  const bandsRef = useRef(new Float32Array(MIC_BAND_COUNT));
  const [active, setActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  // Recording rides the same getUserMedia stream as the level meter so we never
  // open a second microphone (a third acquisition alongside Web Speech is what
  // breaks on mobile Safari). Chunks accrue in `ondataavailable`; the finished
  // Blob is only assembled in `onstop`, after the final chunk lands.
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingSupported = typeof MediaRecorder !== "undefined";
  const supported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.AudioContext;

  async function start() {
    if (ctxRef.current || !supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Start recording off the same stream for server-side transcription.
      if (recordingSupported) {
        try {
          chunksRef.current = [];
          const mime = pickRecorderMime();
          const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          rec.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
          };
          rec.start();
          recorderRef.current = rec;
        } catch {
          // Recording unavailable: the level meter and Web Speech still work.
          recorderRef.current = null;
        }
      }
      const ctx = new AudioContext();
      // Resume in case the context started suspended (autoplay policy).
      if (ctx.state === "suspended") await ctx.resume();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      // Light built-in smoothing; the per-band attack/decay below does the
      // real shaping, and 0.8 here made the bars feel sluggish.
      analyser.smoothingTimeConstant = 0.55;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const freq = new Uint8Array(analyser.frequencyBinCount);
      // Log-spaced band edges over the speech range, precomputed as bin indexes.
      const binHz = ctx.sampleRate / analyser.fftSize;
      const F_LO = 90;
      const F_HI = 6000;
      const edges: number[] = [];
      for (let k = 0; k <= MIC_BAND_COUNT; k++) {
        const f = F_LO * Math.pow(F_HI / F_LO, k / MIC_BAND_COUNT);
        edges.push(Math.min(freq.length - 1, Math.round(f / binHz)));
      }
      setActive(true);
      const tick = () => {
        // Overall loudness from the time domain (unaffected by smoothing).
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length); // 0..~1, speech usually 0..0.3
        const target = Math.min(1, rms * 3.4); // map speech range into a full 0..1
        // Ease toward the target so the orb glides instead of jittering.
        levelRef.current += (target - levelRef.current) * 0.35;

        // Per-band energy from the frequency domain.
        analyser.getByteFrequencyData(freq);
        const bands = bandsRef.current;
        for (let b = 0; b < MIC_BAND_COUNT; b++) {
          const lo = edges[b];
          const hi = Math.max(lo + 1, edges[b + 1]);
          let acc = 0;
          for (let i = lo; i < hi; i++) acc += freq[i];
          let v = acc / (hi - lo) / 255;
          // Subtract the noise floor, then boost so quiet speech still reads.
          v = Math.max(0, v - 0.09) / 0.91;
          v = Math.min(1, v * 1.7);
          // Fast attack, slow decay: bars leap on a syllable, fall gently.
          const cur = bands[b];
          bands[b] = cur + (v - cur) * (v > cur ? 0.55 : 0.12);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Mic denied or unavailable: leave level at 0, the UI still works via text.
      stop();
    }
  }

  /* Stop the recorder and resolve with the finished clip. Resolves from the
     `onstop` event (fired after the final `dataavailable`), never synchronously
     from `.stop()` - resolving early would ship a truncated or empty blob.
     Resolves null when nothing was recorded or recording is unsupported. Call
     this BEFORE stop(), while the stream is still live. */
  function stopRecording(): Promise<Blob | null> {
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (!chunks.length) return resolve(null);
        resolve(new Blob(chunks, { type: rec.mimeType || chunks[0].type || "audio/webm" }));
      };
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });
  }

  function stop() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    // Discard any in-progress recording (finish handlers call stopRecording()
    // first to keep the blob; a bare stop() is a cancel/teardown).
    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch {
        /* already inactive */
      }
      recorderRef.current = null;
    }
    chunksRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    levelRef.current = 0;
    bandsRef.current.fill(0);
    setActive(false);
  }

  useEffect(() => () => stop(), []);

  return { levelRef, bandsRef, active, supported, recordingSupported, start, stop, stopRecording };
}
