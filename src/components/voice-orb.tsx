import { useEffect, useRef, type MutableRefObject } from "react";
import { MicIcon } from "@/components/svg";
import { MIC_BAND_COUNT } from "@/lib/capture";

/* The reactive voice orb: an indigo mic core wrapped in a live radial
   spectrum. Every frame it reads `bandsRef` (per-frequency-band loudness from
   useMicLevel) and draws ~72 bars around the core on a canvas: low
   frequencies at the bottom, highs at the top, mirrored left/right, so speech
   makes visible waves that leap with every syllable. Loud peaks throw off
   expanding ripple rings; in silence a soft wave travels around the ring so
   it still feels alive. Pure visual: it writes to canvas + DOM transforms
   directly, no per-frame React renders. */
const BARS = 72;

export function VoiceOrb({
  levelRef,
  bandsRef,
  size = 300,
}: {
  levelRef: MutableRefObject<number>;
  bandsRef?: MutableRefObject<Float32Array>;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The canvas is bigger than the orb's layout box so loud bars can flare
    // well past it: waves, not a trim.
    const cSize = size * 1.5;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cSize * dpr;
    canvas.height = cSize * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";

    const cx = cSize / 2;
    const cy = cSize / 2;
    const r0 = size * 0.26; // bars start just outside the core's max swell
    const maxLen = cSize / 2 - r0 - 4;
    const barW = size * 0.016;

    // One radial gradient for all bars: brand indigo at the root, lifting
    // toward a lighter tone at the tips.
    const grad = ctx.createRadialGradient(cx, cy, r0, cx, cy, cSize / 2);
    grad.addColorStop(0, "#473fb0");
    grad.addColorStop(0.55, "#5b52c9");
    grad.addColorStop(1, "#9a93f0");

    // Peak ripples, spawned on rising loudness spikes.
    const ripples: { r: number; a: number }[] = [];
    let prevLvl = 0;
    let lastRipple = 0;
    let prevT = performance.now() / 1000;

    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const t = now / 1000;
      const dt = Math.min(0.05, t - prevT);
      prevT = t;
      const lvl = levelRef.current; // 0..1 loudness
      const bands = bandsRef?.current;
      // How "quiet" we are (1 = silence): scales the idle breathing wave out
      // as soon as real speech energy arrives.
      const quiet = Math.max(0, 1 - lvl * 4);

      ctx.clearRect(0, 0, cSize, cSize);

      // Ripple rings behind the bars.
      if (!reduce) {
        if (lvl > 0.5 && lvl - prevLvl > 0.02 && now - lastRipple > 300) {
          ripples.push({ r: r0 + maxLen * 0.25, a: 0.45 });
          lastRipple = now;
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.r += cSize * 0.7 * dt;
          rp.a *= Math.exp(-dt * 2.6);
          if (rp.a < 0.02) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(cx, cy, rp.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(71,63,176,${rp.a})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      prevLvl = lvl;

      // The spectrum ring.
      ctx.strokeStyle = grad;
      ctx.lineWidth = barW;
      for (let i = 0; i < BARS; i++) {
        const theta = -Math.PI / 2 + (i / BARS) * Math.PI * 2;
        // Angular distance from the bottom of the circle, 0..1, symmetric
        // left/right: lows live at the bottom, highs at the top.
        const d =
          Math.abs(((theta - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / Math.PI;

        let v = 0;
        if (bands) {
          // The curve stretches the energetic low bands across most of the
          // ring (speech energy is bottom-heavy in the spectrum).
          const f = Math.pow(d, 1.6) * (MIC_BAND_COUNT - 1);
          const i0 = Math.floor(f);
          const frac = f - i0;
          v = bands[i0] * (1 - frac) + bands[Math.min(MIC_BAND_COUNT - 1, i0 + 1)] * frac;
          v = Math.min(1, v * 1.25);
        } else {
          // No spectrum available (mic denied / old caller): shimmer from the
          // scalar level so the ring still responds.
          v = lvl * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + t * 9)));
        }

        // Idle breath: a soft wave travels around the ring in silence.
        const idle = reduce ? 0.03 : quiet * (0.035 + 0.035 * Math.sin(t * 2.4 + i * 0.45));
        v = Math.max(v, idle);

        const len = 2.5 + maxLen * Math.pow(v, 0.7);
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        ctx.globalAlpha = 0.5 + v * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + cos * r0, cy + sin * r0);
        ctx.lineTo(cx + cos * (r0 + len), cy + sin * (r0 + len));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Core sphere: gentle breath baseline, swell on voice. Glow brightens
      // with loudness.
      const breathe = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.3);
      const core = 1 + breathe * 0.04 + lvl * 0.22;
      if (coreRef.current) coreRef.current.style.transform = `scale(${core})`;
      if (glowRef.current) glowRef.current.style.opacity = String(0.18 + lvl * 0.7);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // levelRef/bandsRef identities are stable; size is fixed per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coreSize = size * 0.42;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* Spectrum + ripples, oversized so loud bars flare past the layout box */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute"
        style={{
          width: size * 1.5,
          height: size * 1.5,
          left: -size * 0.25,
          top: -size * 0.25,
        }}
      />

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
   + spectrum refs, live transcript, and a done handler. Everything on the work
   step stays mounted underneath and is revealed again on close. */
export function VoiceCaptureOverlay({
  levelRef,
  bandsRef,
  text,
  onDone,
}: {
  levelRef: MutableRefObject<number>;
  bandsRef?: MutableRefObject<Float32Array>;
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
        <VoiceOrb levelRef={levelRef} bandsRef={bandsRef} />

        <div className="min-h-24 max-w-lg">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo">
            HomesBrain AI
          </div>
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
