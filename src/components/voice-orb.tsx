import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { MicIcon } from "@/components/svg";

/* The HomesBrain AI glyph with a voice-reactive halo: the brand icon sits
   still while a single soft indigo glow behind it breathes on its own and
   swells with loudness. Reads `levelRef` every frame and writes DOM styles
   directly, no per-frame React renders. Replaces the old canvas orb
   (aurora + wave ring + sparks): one quiet reactive element instead of many. */
function AiGlyph({ levelRef }: { levelRef: MutableRefObject<number> }) {
  const glowRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      const t = performance.now() / 1000;
      // Ease toward the live level so the halo swells instead of jittering.
      smooth += (levelRef.current - smooth) * 0.16;
      const breathe = 0.5 + 0.5 * Math.sin(t * 1.3);
      if (glowRef.current) {
        glowRef.current.style.transform = `scale(${1 + breathe * 0.08 + smooth * 0.6})`;
        glowRef.current.style.opacity = String(0.38 + breathe * 0.12 + smooth * 0.5);
      }
      if (iconRef.current) iconRef.current.style.transform = `scale(${1 + smooth * 0.07})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  return (
    <div className="relative grid h-36 w-36 place-items-center">
      <div
        ref={glowRef}
        className="absolute h-28 w-28 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(71,63,176,0.5) 0%, rgba(122,114,224,0.28) 45%, rgba(122,114,224,0) 72%)",
          filter: "blur(16px)",
          opacity: 0.45,
          willChange: "transform, opacity",
        }}
      />
      <div ref={iconRef} className="relative" style={{ willChange: "transform" }}>
        {imgOk ? (
          <img
            src="/images/homesbrain-ai-mic.png"
            alt=""
            aria-hidden="true"
            onError={() => setImgOk(false)}
            className="h-24 w-24 rounded-3xl shadow-[0_18px_40px_-16px_rgba(71,63,176,0.55)] ring-1 ring-black/5"
          />
        ) : (
          <span className="grid h-24 w-24 place-items-center rounded-3xl bg-indigo text-white shadow-[0_18px_40px_-16px_rgba(71,63,176,0.55)]">
            <MicIcon size={36} />
          </span>
        )}
      </div>
    </div>
  );
}

/* Live transcript where each word materializes as it is spoken: blur-lift in,
   then settles. Spans are keyed by word index, so words already on screen
   keep their DOM node and only newly appended words animate. When the
   recognizer revises an interim word, the text swaps in place with no
   re-animation, which reads as the AI correcting itself. */
function TranscriptWords({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <p className="text-[22px] font-semibold leading-snug tracking-tight text-ink">
      {words.map((w, i) => (
        <span key={i} className="anim-word-in inline-block">
          {w}&nbsp;
        </span>
      ))}
    </p>
  );
}

/* Caps the transcript's height with the latest words pinned to the bottom.
   The top fade-out mask only turns on once the text is actually taller than
   the cap; a short transcript renders at full strength, no washed-out first
   words. */
function TranscriptViewport({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (el) setClipped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  const mask = clipped ? "linear-gradient(to bottom, transparent 0, black 3.5rem)" : undefined;

  return (
    <div
      ref={boxRef}
      className="flex max-h-56 flex-col justify-end overflow-hidden"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <TranscriptWords text={text} />
    </div>
  );
}

/* Full-screen white voice-capture mode. Presentational: the parent owns the
   audio hooks (so start() fires inside the tap gesture) and passes the
   loudness ref, live transcript, and a done handler. Everything on the work
   step stays mounted underneath and is revealed again on close. */
export function VoiceCaptureOverlay({
  levelRef,
  text,
  onDone,
  prompt = "Listening. Talk through the job.",
}: {
  levelRef: MutableRefObject<number>;
  text: string;
  onDone: () => void;
  /* Shown until the first words land; each voice mode brings its own ask. */
  prompt?: string;
}) {
  // Lock body scroll while the immersive view is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center bg-background px-6 anim-fade-in">
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 text-center">
        <AiGlyph levelRef={levelRef} />

        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo">
          HomesBrain AI
        </div>

        <div className="min-h-28 w-full max-w-lg">
          {text ? (
            <TranscriptViewport text={text} />
          ) : (
            <div>
              <p className="text-[22px] font-semibold leading-snug tracking-tight text-muted">
                {prompt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5" aria-hidden="true">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-indigo/70" />
                <span className="pulse-dot d-3 h-1.5 w-1.5 rounded-full bg-indigo/70" />
                <span className="pulse-dot d-6 h-1.5 w-1.5 rounded-full bg-indigo/70" />
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-sm pb-10">
        <button
          type="button"
          onClick={onDone}
          className="pressable w-full rounded-full bg-indigo py-4 text-base font-bold tracking-tight text-white shadow-lg transition-colors hover:bg-indigodark"
        >
          Done
        </button>
        <p className="mt-3 text-center text-xs text-muted">Tap done when you have finished.</p>
      </div>
    </div>
  );
}
