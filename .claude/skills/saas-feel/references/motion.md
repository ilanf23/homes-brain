# Motion & micro-interactions

The paradox: premium products animate **less**, not more. Motion is a tool to explain a state change - not decoration. Stripe's litmus test: _if animations are disabled, the flow should feel broken; otherwise the animation is superfluous._

## Durations

| Interaction                            | Duration                              |
| -------------------------------------- | ------------------------------------- |
| Hard ceiling for ALL UI motion         | **≤300ms** (Emil Kowalski)            |
| State change (toggle, small change)    | **150ms** (Vercel/Geist)              |
| Popover / tooltip / dropdown enter     | **~125–200ms**                        |
| Modal / dialog / overlay               | **300ms**                             |
| Toast display time (not the animation) | 2–3s simple, 5–6s with action         |
| Button press feedback                  | **~0ms / instant** - snap, don't ease |

Material 3 tokens: short 50–200ms (small utility), medium 250–400ms (standard), long 450ms+ (large/expressive). Apple sweet spot 100–500ms, biased short.

Proof point: the same dropdown at 180ms feels responsive; at 400ms feels sluggish. **When in doubt, go shorter - or 0ms.** Vercel: "a duration of `0ms` is often the snappiest and best choice."

## Easings

- **Enter/exit → `ease-out`** (fast start, decelerate). This is the default. **Never `ease-in` for UI** - it's slow-at-start and feels laggy.
- Built-in CSS curves are weak. Prefer a custom curve:
  - **Copyable default (Vercel/Geist):** `cubic-bezier(0.175, 0.885, 0.32, 1.1)` - the `1.1` gives a subtle overshoot "pop." Use one curve system-wide for coherence.
  - Material 3 emphasized-decelerate (enter): `cubic-bezier(0.05, 0.7, 0.1, 1)`; emphasized-accelerate (exit): `cubic-bezier(0.3, 0, 0.8, 0.15)`.
- **Springs** (react-spring default `{ mass:1, tension:170, friction:26 }`): higher tension = snappier, higher friction = less bounce. Use springs for _movement_, not for color/opacity.
- Contested: Sonner deliberately uses plain `ease` + slightly slower timing to feel "elegant" over "snappy." Match the curve to the product's vibe - snappy for tools, softer for consumer moments.

## Micro-interactions

- **`transform: scale(0.97)` on `:active`** - the single highest-ROI micro-interaction. Makes any UI feel like it's "listening." (0.98 is a gentler variant.)
- **Never animate from `scale(0)`** - start at `0.9+`; `scale(0)` looks like it appears from nowhere.
- **Origin-aware popovers:** set `transform-origin` to the trigger (Radix/Base UI expose `--radix-*-transform-origin`) so the menu grows _out of_ the button.
- **Immediate feedback on every action:** submit → loading state; copy → checkmark; the response should appear as soon as possible.
- **Blur fixer:** if a crossfade still feels off, add `~2px filter: blur()` during the transition to bridge states.
- **The signature confirmation:** success = green + an animated checkmark (Apple Pay / Sonner `toast.success()` pattern). Spend your delight budget here.

## Rules - performance, when-not, accessibility

- **Animate `transform` and `opacity` ONLY.** They hit only the composite step; animating width/margin/padding/height forces layout+paint = jank. This is the #1 60fps rule.
- Prefer hardware-accelerated CSS/WAAPI over JS `requestAnimationFrame`; JS animations drop frames when the main thread is busy.
- **Animations must be interruptible** (CSS transitions reverse smoothly; long keyframes don't).
- **Do NOT animate high-frequency / keyboard-initiated actions** - repeated 100×/day, motion makes them feel slow. "Raycast has no animations and it feels right."
- **`prefers-reduced-motion`: don't kill everything - swap movement for an opacity fade.**
  ```css
  @media (prefers-reduced-motion: reduce) {
    .el {
      animation: fade 0.2s;
    } /* was: slide/bounce */
  }
  ```
- Never communicate critical info by motion alone (some users disable it).
- "You don't need animations" is a valid stance. Motion is a tool, not a default.

Sources: emilkowal.ski/ui (great-animations, 7-practical-animation-tips, you-dont-need-animations); vercel.com/design.md (Geist); m3.material.io/styles/motion; developer.apple.com/design/human-interface-guidelines/motion; stripe.com/blog/connect-front-end-experience; joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics; blog.superhuman.com/superhuman-is-built-for-speed.
