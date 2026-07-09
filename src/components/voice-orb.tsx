import { useEffect, useRef, type MutableRefObject } from "react";
import { MicIcon } from "@/components/svg";

/* The reactive voice orb: a soft indigo sphere that breathes when idle and
   swells + throws off rings as you talk. Pure visual - it reads a `levelRef`
   (0..1 loudness, see useMicLevel) every frame and writes transforms straight
   to the DOM, so louder speech animates it without re-rendering React. */
export function VoiceOrb({
  levelRef,
  size = 300,
}: {
  levelRef: MutableRefObject<number>;
  size?: number;
}) {
  const coreRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const ringRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const loop = () => {
      const t = performance.now() / 1000;
      // Slow idle "breath" so the orb feels alive in silence (0..1).
      const breathe = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.3);
      const lvl = levelRef.current; // 0..1 loudness

      // Core sphere: gentle breath baseline, big swell on voice.
      const core = 1 + breathe * 0.05 + lvl * 0.4;
      if (coreRef.current) coreRef.current.style.transform = `scale(${core})`;

      // Glow halo brightens with loudness.
      if (glowRef.current) glowRef.current.style.opacity = String(0.2 + lvl * 0.7);

      // Rings ripple outward - each pushed further and faded by loudness.
      ringRefs.forEach((r, i) => {
        const spread = 1 + lvl * (1 + i * 0.8) + breathe * 0.04 * (i + 1);
        const el = r.current;
        if (el) {
          el.style.transform = `scale(${spread})`;
          el.style.opacity = String(Math.max(0, (0.5 - i * 0.13) * (0.35 + lvl)));
        }
      });

      // Orbiting motes drift out as you get louder.
      if (orbitRef.current) orbitRef.current.style.transform = `scale(${1 + lvl * 0.5})`;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // levelRef identity is stable; refs are stable. Run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coreSize = size * 0.42;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* Ripple rings */}
      {ringRefs.map((r, i) => (
        <div
          key={i}
          ref={r}
          className="absolute rounded-full border border-indigo"
          style={{ width: coreSize, height: coreSize, willChange: "transform, opacity" }}
        />
      ))}

      {/* Orbiting motes: outer layer rotates slowly (CSS), inner layer drifts
          outward with loudness (rAF scale) - kept on separate elements so the
          two transforms never overwrite each other. */}
      <div className="spin-slow absolute" style={{ width: size * 0.82, height: size * 0.82 }}>
        <div ref={orbitRef} className="absolute inset-0" style={{ willChange: "transform" }}>
          {[0, 120, 240].map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-indigo/50"
              style={{ transform: `rotate(${deg}deg) translateX(${size * 0.41}px)` }}
            />
          ))}
        </div>
      </div>

      {/* Soft glow behind the core */}
      <div
        ref={glowRef}
        className="absolute rounded-full"
        style={{
          width: coreSize * 1.7,
          height: coreSize * 1.7,
          background: "radial-gradient(circle, var(--indigo) 0%, transparent 68%)",
          filter: "blur(22px)",
          willChange: "opacity",
        }}
      />

      {/* Core sphere with mic */}
      <div
        ref={coreRef}
        className="relative grid place-items-center rounded-full text-white"
        style={{
          width: coreSize,
          height: coreSize,
          background:
            "radial-gradient(circle at 34% 28%, #7a72e0 0%, var(--indigo) 58%, var(--indigo-dark) 100%)",
          boxShadow: "0 24px 70px -18px rgba(71,63,176,0.65)",
          willChange: "transform",
        }}
      >
        <MicIcon size={coreSize * 0.34} />
      </div>
    </div>
  );
}

/* Full-screen white voice-capture mode. Presentational: the parent owns the
   audio hooks (so start() fires inside the tap gesture) and passes the loudness
   ref, live transcript, and a done handler. Everything on the work step stays
   mounted underneath and is revealed again on close. */
export function VoiceCaptureOverlay({
  levelRef,
  text,
  onDone,
}: {
  levelRef: MutableRefObject<number>;
  text: string;
  onDone: () => void;
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
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background px-6 anim-fade-in">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <VoiceOrb levelRef={levelRef} />

        <div className="min-h-24 max-w-lg">
          {text ? (
            <p className="text-lg leading-relaxed text-ink">{text}</p>
          ) : (
            <p className="text-lg font-semibold tracking-tight text-muted">
              Listening. Talk through the job.
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
