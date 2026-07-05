---
name: saas-feel
description: >-
  World-class SaaS UI/UX craft - the "feel" of premium products. Use in TWO modes.
  BUILD mode when creating or improving any screen, component, flow, animation, empty
  state, onboarding, loading, or payment experience and it should feel premium, fast,
  and trustworthy - triggers include "make this feel like Linear/Stripe," "design the X
  screen," "add motion/animation," "improve this UI," "make it feel premium/polished,"
  "the app feels cheap/off/unfinished." AUDIT mode when reviewing existing UI against
  best-practice heuristics - triggers include "critique this screen," "UX review," "why
  does this feel off," "does this feel done," "score this UI." Grounded in primary
  sources (Emil Kowalski, Refactoring UI, NN/g, Apple HIG, Material 3, and teardowns of
  Linear/Stripe/Superhuman/Vercel/Raycast/Notion) with concrete, copyable numbers.
  Especially strong for mobile-first products with a field/pro side, a consumer side,
  and payments. NOT for brand voice/copywriting (use a brand-voice skill) or backend logic.
---

# SaaS Feel - the craft of premium product UI/UX

This skill makes interfaces _feel_ the way the best software feels: instant, calm, considered, and trustworthy. It runs in two modes - **BUILD** (design/improve UI) and **AUDIT** (critique existing UI) - both grounded in the same principles and numbers.

> The through-line from every top product: **the best-feeling SaaS usually animates _less_, responds _faster_, and shows _fewer_ choices than you'd expect. "Feel" is mostly restraint plus speed plus one or two moments of delight - not decoration.**

## The six laws of feel (memorize these)

1. **Instant is the substrate.** Every interaction should respond within the Doherty Threshold (~400ms); the best target 50–100ms. Under 100ms feels _caused by the user_. Speed is a design decision, not an engineering afterthought. (Superhuman 50ms, Linear ~47ms ops.)
2. **Motion must explain a state change, or it shouldn't exist.** Stripe's test: "if animations are disabled, the flow should feel broken; otherwise the animation is superfluous."
3. **Restraint reads as confidence.** Near-monochrome + one accent used for _meaning_; a tight spacing/type scale; opinionated defaults. Emphasize by _de-emphasizing_ everything else.
4. **Every interactive element has six states** - default, hover, focus (keyboard ring), active/pressed, disabled, loading. Miss one and it "isn't done."
5. **In money and destructive moments, purposeful friction IS the trust signal.** A confirm, a haptic, a receipt. Speed can register as carelessness.
6. **Delight lives at the peak and the end** (Peak–End Rule). Spend your one signature moment on the confirmation/success state, not on decoration everywhere.

---

## BUILD mode - how to design or improve a screen

Work in this order. Load the reference file noted at each step for exact specs.

1. **Purpose & hierarchy first.** What is the ONE thing this screen is for? Make that element biggest / boldest / most-spaced; quiet everything else. Max ~3 text sizes on a screen. → `references/visual-craft.md`
2. **Lay out on the scale.** Use a 4px spacing base and a fixed type scale. Start with _too much_ whitespace, then tighten. Group by proximity. → `references/visual-craft.md`
3. **Color with restraint.** 60/30/10: 60% background, 30% surface, 10% accent. The accent appears only on the primary action and key status. Hit WCAG AA (4.5:1 body, 3:1 large/UI). → `references/visual-craft.md`
4. **Design all six states** for every button/input/row, including the empty, loading, and error states of the whole screen. → `references/states-speed.md`
5. **Make it feel instant.** Optimistic UI for low-risk actions; skeletons for full-page content loads; spinners for single actions 1–10s; nothing under 1s. → `references/states-speed.md`
6. **Add motion last, sparingly.** Only `transform`/`opacity`, `ease-out`, ≤300ms, `scale(0.97)` on press. Kill motion on repeated/keyboard actions. Degrade under `prefers-reduced-motion`. → `references/motion.md`
7. **If touch / field / payment:** 44–48px targets, primary actions in the bottom thumb zone, minimal typing, invariant multi-sensory "done" moment. → `references/touch-trust-field.md`
8. **Self-audit** against the rubric below before calling it done.

**Output when building:** concrete specs a coding agent can apply - exact px/ms/hex/easing, component states, and the reasoning. When writing code, prefer CSS transitions on `transform`/`opacity`, design tokens for spacing/type/color, and real empty/loading/error states. Never ship a screen missing its loading or empty state.

---

## AUDIT mode - how to critique a screen

1. Ask for the screen (screenshot, URL, or code). If a live URL and browser tools exist, view it at desktop _and_ mobile width.
2. Score each of the **8 rubric dimensions** below 0–3.
3. Report **prioritized fixes** (P1 breaks the feel, P2 noticeable, P3 polish), each with the specific before→after and the number/rule it violates.
4. Lead with the 3 highest-leverage fixes. Be specific ("muted text is #9a9a9a on #f7f6f1 = 2.1:1, fails AA; use #6b6b6b for 4.6:1"), never vague ("needs more polish").

### The audit rubric (score 0–3 each; 24 = "done")

| #   | Dimension                       | 3 = premium                                                     | 0 = broken                                                                |
| --- | ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | **Speed & feedback**            | <100ms feedback, optimistic UI, no gratuitous spinners          | actions feel laggy, spinners <1s, no feedback on tap                      |
| 2   | **Hierarchy**                   | one clear focal point, ≤3 sizes, labels de-emphasized           | everything competes, primary CTA at weight 400                            |
| 3   | **Spacing**                     | consistent scale, generous, proximity groups                    | ambiguous/arbitrary spacing, cramped                                      |
| 4   | **Type**                        | tight scale, weight/color for hierarchy, 45–75 char lines       | many sizes, grey-on-color, walls of text                                  |
| 5   | **Color**                       | restrained, one meaningful accent, AA contrast                  | multiple competing accents, low contrast                                  |
| 6   | **States**                      | all 6 interactive states + empty/loading/error designed         | missing hover/focus, "No data," raw spinner                               |
| 7   | **Motion**                      | purposeful, ease-out, ≤300ms, transform/opacity, reduced-motion | animates layout, ease-in, >400ms, decorative, on repeated actions         |
| 8   | **Touch/Trust** (if applicable) | 44–48px targets, thumb-zone CTAs, clear payment "done"/receipt  | tiny targets, top-corner primary actions, silent/ambiguous payment result |

Contested claims are flagged in the reference files - don't cite shaky percentages as fact. Prefer the primary-source numbers.

---

## Reference files (load on demand)

- `references/motion.md` - durations, easings (with copyable cubic-beziers + spring configs), micro-interactions, the reduced-motion pattern, when NOT to animate.
- `references/visual-craft.md` - spacing scale, type scale, color/60-30-10, contrast numbers, hierarchy levers, the "premium tells" (borders, shadows, radius, six states).
- `references/states-speed.md` - onboarding, the three empty-state types, loading (skeleton vs spinner vs progress), optimistic UI rules, Nielsen's 0.1/1/10s limits, toasts.
- `references/touch-trust-field.md` - touch targets, thumb zones, field-usable (gloves/sun/offline), fintech trust patterns, the payment "done moment," dark-pattern avoidance.
- `references/benchmarks-and-laws.md` - what Linear/Stripe/Superhuman/Vercel/Raycast/Notion/Framer actually do, plus the UX laws (Doherty, Jakob, Fitts, Hick, Miller, Aesthetic-Usability, Peak–End) and how to apply them.

## Quick cheat sheet (the load-bearing numbers)

```
SPEED     0.1s instant · 1s flow · 10s attention · target <100ms feedback, <400ms Doherty
MOTION    ≤300ms ceiling · 150ms state · 200ms popover · 300ms modal · ease-out · scale(0.97) press
          animate transform+opacity only · kill on repeated/keyboard actions
LOADING   none <1s · spinner 1–10s (module) · skeleton (full page) · progress bar >10s
SPACING   4px base; scale 4·8·12·16·24·32·48·64·96·128
TYPE      ~8–12 sizes; body line-height ~1.5, headings ~1.1; line length 45–75 chars; weight>size for hierarchy
COLOR     60/30/10; one accent for meaning; AA = 4.5:1 body / 3:1 large & UI
TOUCH     44pt (Apple) / 48dp (Material) min; 8dp gap; primary actions in bottom thumb zone
STATES    default·hover·focus·active·disabled·loading + screen empty/loading/error
PAYMENT   biometric/confirm gate · visible "authorizing" · invariant checkmark+"Done/Approved"+haptic · receipt step
```
