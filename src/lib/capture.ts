import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* Magic capture for log-a-job: nameplate photo → equipment fields, and live
   voice dictation → "what was done". */

export type NameplateScan = {
  type: string | null;
  make: string | null;
  model: string | null;
  serial: string | null;
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
      img.onerror = () => reject(new Error("Couldn't read that photo — try a JPEG."));
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
    throw new Error("Couldn't read the nameplate — try again.");
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
