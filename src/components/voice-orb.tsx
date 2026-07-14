import { useEffect, useRef, type MutableRefObject } from "react";
import { MicIcon } from "@/components/svg";
import { MIC_BAND_COUNT } from "@/lib/capture";

/* The reactive voice orb, "aurora wave": an indigo mic core with a soft
   rotating aurora glow breathing behind it and the voice drawn as a smooth
   wave ring around it. Every frame it reads `bandsRef` (per-frequency-band
   loudness from useMicLevel) and traces a continuous closed curve: low
   frequencies at the bottom, highs at the top, mirrored left/right, so
   speech makes the ring flow with every syllable. Loud syllables throw tiny
   sparks off the wave; in silence a soft swell travels around the ring and
   the aurora keeps turning so it still feels alive. Pure visual: it writes
   to canvas + DOM transforms directly, no per-frame React renders. */
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
  const auraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The canvas is bigger than the orb's layout box so loud swells and
    // sparks can flare past it: waves, not a trim.
    const cSize = size * 1.3;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cSize * dpr;
    canvas.height = cSize * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";

    const cx = cSize / 2;
    const cy = cSize / 2;
    const baseR = size * 0.3; // wave ring rest radius, outside the core's max swell
    const maxAmp = size * 0.15; // how far a full-loudness swell reaches
    const PTS = 120;

    // One radial gradient for the wave: brand indigo at the base lifting
    // toward a lighter tone at the swells; a faint fill inside the curve.
    const strokeGrad = ctx.createRadialGradient(cx, cy, baseR, cx, cy, baseR + maxAmp + 12);
    strokeGrad.addColorStop(0, "#473fb0");
    strokeGrad.addColorStop(1, "#9a93f0");
    const fillGrad = ctx.createRadialGradient(cx, cy, baseR, cx, cy, baseR + maxAmp + 12);
    fillGrad.addColorStop(0, "rgba(71,63,176,0.14)");
    fillGrad.addColorStop(1, "rgba(154,147,240,0.02)");

    // Loudness at angle theta: samples the frequency bands with lows at the
    // bottom of the ring, highs at the top, mirrored left/right. The pow
    // curve stretches the energetic low bands across most of the ring
    // (speech energy is bottom-heavy in the spectrum).
    const sample = (theta: number, lvl: number, t: number) => {
      const bands = bandsRef?.current;
      const d = Math.abs(((theta - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / Math.PI;
      if (bands) {
        const f = Math.pow(d, 1.6) * (MIC_BAND_COUNT - 1);
        const i0 = Math.floor(f);
        const frac = f - i0;
        const v = bands[i0] * (1 - frac) + bands[Math.min(MIC_BAND_COUNT - 1, i0 + 1)] * frac;
        return Math.min(1, v * 1.25);
      }
      // No spectrum available (mic denied / old caller): shimmer from the
      // scalar level so the ring still responds.
      return lvl * (0.3 + 0.7 * Math.abs(Math.sin(d * 9 + t * 7)));
    };

    // Sparks thrown off the wave on rising loudness spikes.
    const sparks: { x: number; y: number; vx: number; vy: number; a: number }[] = [];
    let prevLvl = 0;
    let lastSpark = 0;
    let auraAngle = 0;
    let prevT = performance.now() / 1000;

    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const t = now / 1000;
      const dt = Math.min(0.05, t - prevT);
      prevT = t;
      const lvl = levelRef.current; // 0..1 loudness
      // How "quiet" we are (1 = silence): scales the idle traveling swell out
      // as soon as real speech energy arrives.
      const quiet = Math.max(0, 1 - lvl * 4);

      ctx.clearRect(0, 0, cSize, cSize);

      // The wave ring: an outer curve (filled + stroked) and a softer inner
      // echo, phase-shifted so they flow against each other.
      const trace = (mult: number, phase: number) => {
        ctx.beginPath();
        for (let i = 0; i <= PTS; i++) {
          const theta = -Math.PI / 2 + (i / PTS) * Math.PI * 2;
          const v = sample(theta + phase, lvl, t);
          const idle = reduce
            ? 0.05
            : 0.05 + quiet * (0.05 + 0.045 * Math.sin(t * 2.2 + theta * 3));
          const r = baseR + maxAmp * Math.max(Math.pow(v, 0.8) * mult, idle);
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      trace(1, 0);
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.strokeStyle = strokeGrad;
      ctx.lineWidth = size * 0.009;
      ctx.stroke();
      trace(0.7, 0.4);
      ctx.strokeStyle = "rgba(122,114,224,0.45)";
      ctx.lineWidth = size * 0.006;
      ctx.stroke();

      // Sparks on loud syllables.
      if (!reduce) {
        if (lvl > 0.5 && lvl - prevLvl > 0.015 && now - lastSpark > 160 && sparks.length < 24) {
          for (let n = 0; n < 3; n++) {
            const theta = Math.random() * Math.PI * 2;
            const r = baseR + maxAmp * sample(theta, lvl, t);
            sparks.push({
              x: cx + Math.cos(theta) * r,
              y: cy + Math.sin(theta) * r,
              vx: Math.cos(theta) * size * 0.1,
              vy: Math.sin(theta) * size * 0.1,
              a: 0.8,
            });
          }
          lastSpark = now;
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.a *= Math.exp(-dt * 2.4);
          if (p.a < 0.03) {
            sparks.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.007, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(122,114,224,${p.a})`;
          ctx.fill();
        }
      }
      prevLvl = lvl;

      // Aurora: slow rotation, swelling and brightening with loudness.
      if (auraRef.current) {
        if (!reduce) auraAngle += dt * 40;
        const scale = 1 + lvl * 0.24;
        auraRef.current.style.transform = `rotate(${auraAngle}deg) scale(${scale})`;
        auraRef.current.style.opacity = String(0.42 + lvl * 0.4);
      }

      // Core sphere: gentle breath baseline, swell on voice.
      const breathe = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.3);
      const core = 1 + breathe * 0.04 + lvl * 0.16;
      if (coreRef.current) coreRef.current.style.transform = `scale(${core})`;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // levelRef/bandsRef identities are stable; size is fixed per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coreSize = size * 0.42;
  const auraSize = size * 0.68;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* Aurora glow behind everything */}
      <div
        ref={auraRef}
        className="absolute rounded-full"
        style={{
          width: auraSize,
          height: auraSize,
          background: "conic-gradient(#473fb0, #7a72e0, #b7b1f5, #5b52c9, #8d85ea, #473fb0)",
          filter: `blur(${size * 0.075}px)`,
          opacity: 0.42,
          willChange: "transform, opacity",
        }}
      />

      {/* Wave ring + sparks, oversized so loud swells flare past the layout box */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute"
        style={{
          width: size * 1.3,
          height: size * 1.3,
          left: -size * 0.15,
          top: -size * 0.15,
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
          boxShadow:
            "0 24px 70px -18px rgba(71,63,176,0.65), inset 0 1px 8px rgba(255,255,255,0.25)",
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
