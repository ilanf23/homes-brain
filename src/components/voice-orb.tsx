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

/* The listening bars: an equalizer reading live mic spectrum. Bars are the one
   voice-UI idiom nobody has to learn, and unlike the pulse dots this replaces
   (a fixed CSS timer) they look different when audio is arriving than when it
   is not, which is the whole point. `bandsRef` already arrives shaped for this
   from useMicLevel: log-spaced speech bands with fast-attack / slow-decay, so
   bars leap on a syllable and settle gently. Silence keeps a low time-driven
   shimmer so the row reads as waiting rather than dead.

   Each bar is a fixed-height span scaled with transform (never height), so a
   loud syllable never triggers layout. Reads the ref every frame and writes
   DOM directly, no per-frame React renders. */
const BAR_COUNT = 14;
const BAR_H = 26;
const BAR_MIN = 0.13;

function ListeningBars({ bandsRef }: { bandsRef: MutableRefObject<Float32Array> }) {
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const loop = () => {
      const t = performance.now() / 1000;
      const bands = bandsRef.current;
      // Sample BAR_COUNT bands evenly across the speech range. The source
      // bands are already log-spaced, so an even pick here stays perceptual.
      const step = bands.length / BAR_COUNT;
      for (let i = 0; i < BAR_COUNT; i++) {
        const el = barsRef.current[i];
        if (!el) continue;
        const v = bands[Math.min(bands.length - 1, Math.floor(i * step + step / 2))] ?? 0;
        // Idle shimmer is time-driven, not level-driven, so the row is alive
        // before the first sound and while the mic is still being granted.
        const idle = 0.04 + 0.03 * Math.sin(t * 2.1 + i * 0.5);
        el.style.transform = `scaleY(${BAR_MIN + idle + v * (1 - BAR_MIN)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bandsRef, reduced]);

  return (
    <div className="flex items-center gap-[3px]" style={{ height: BAR_H }} aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="w-[3px] rounded-full bg-indigo/70"
          style={{
            height: BAR_H,
            transform: `scaleY(${BAR_MIN})`,
            willChange: "transform",
          }}
        />
      ))}
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
  bandsRef,
  text,
  onDone,
  prompt = "Listening. Talk through the job.",
}: {
  levelRef: MutableRefObject<number>;
  bandsRef: MutableRefObject<Float32Array>;
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

        {/* Stays up for the whole session, transcript or not: the bars are how
            the pro knows the mic is still open, so they must never disappear
            the moment words land. */}
        <ListeningBars bandsRef={bandsRef} />

        <div className="min-h-28 w-full max-w-lg">
          {text ? (
            <TranscriptViewport text={text} />
          ) : (
            <p className="text-[22px] font-semibold leading-snug tracking-tight text-muted">
              {prompt}
            </p>
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
