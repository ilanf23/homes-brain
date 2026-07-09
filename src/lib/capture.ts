import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* Magic capture for log-a-job: nameplate photo → equipment fields, and live
   voice dictation → "what was done". */

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

async function toJpegDataUri(file: File): Promise<string> {
  const { source, width, height, release } = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    release();
  }
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

export function useDictation(onText: (finalText: string) => void) {
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
    rec.lang = navigator.language || "en-US";
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

/* ---------- Mic amplitude (Web Audio) ----------
   Runs alongside useDictation to give the immersive voice UI a live loudness
   signal the transcript can't provide. Exposes a mutable `levelRef` (0..1,
   smoothed) that visual code reads every frame - no per-frame React state, so
   the orb can animate without re-rendering the tree.

   IMPORTANT lifecycle: start() must be called from a user gesture (the tap that
   opens the voice UI) so the AudioContext can resume under the autoplay policy;
   stop() tears down the stream + context + rAF so the mic never stays hot. */
export function useMicLevel() {
  const levelRef = useRef(0);
  const [active, setActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const supported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.AudioContext;

  async function start() {
    if (ctxRef.current || !supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      // Resume in case the context started suspended (autoplay policy).
      if (ctx.state === "suspended") await ctx.resume();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      setActive(true);
      const tick = () => {
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
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Mic denied or unavailable: leave level at 0, the UI still works via text.
      stop();
    }
  }

  function stop() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    levelRef.current = 0;
    setActive(false);
  }

  useEffect(() => () => stop(), []);

  return { levelRef, active, supported, start, stop };
}
