# Touch, trust & field use

For products used on a phone — especially at a job site — and for anything involving money or a record the user must trust.

## Touch targets & thumb zones

- **Minimum target size: 44×44pt (Apple HIG) / 48×48dp (Material, ~9mm).** WCAG 2.5.5 (AAA) = 44px; WCAG 2.5.8 (AA) = 24px. Design toward **48px+ for gloved/field use.**
- The *visual* control can be smaller, but the *tappable* area must hit the minimum — expand hit area with padding.
- **Minimum 8dp gap between targets** (Material).
- **Thumb zones (Hoober, 1,300+ users): ~49% hold one-handed; thumbs drive ~75% of interactions.**
  - **Green (easy) = bottom-center** → put primary actions here (bottom nav, bottom-sheet CTA, reachable confirm/back).
  - Yellow (stretch) = mid-screen sides. **Red (hard) = top corners** → never put primary or frequent actions there.
  - Circulating accuracy stats ("96% vs 61%," "267% faster") are unsourced blog claims — illustrative only.
- **Tap feedback latency: target the 0.1s "instant" limit** — visual/haptic response must feel immediate.

## Field-usable (gloves, sun, offline)

- **Minimal typing.** Prefer: swipe pass/fail, tap-to-select tiered options, voice-to-text notes, photo capture, auto-GPS. Every keystroke at a job site is friction.
- **Sunlight = a contrast problem, not a color one.** High contrast, large bold type; don't rely on the device's anti-glare.
- **Offline must allow create/edit, not just view.** View-only offline is a top field-service complaint (Housecall Pro). Auto-sync on reconnect.
- **Reliability > features.** Crashes and data loss (Workiz) and instability (ServiceTitan) do more damage than any missing feature. Sync integrity and crash-freedom are table stakes.
- **Tap-count is load-bearing.** The anti-pattern to avoid: ServiceTitan's "42 taps to create and email an estimate." Keep each core action (clock-in, address, photo, invoice, collect) within ~3 taps.
- **Support both** glanceable big-button lists (older/gloved techs) and denser cards (younger techs).
- **Prefer undo over confirmation nags;** confirm only before serious/irreversible actions; keep confirm and destructive buttons far apart.

## Trust — receiving a record / paying (fintech patterns)

- **In money flows, purposeful friction IS the trust signal.** A processing beat, a confirm, a receipt. "Speed can register as carelessness." Don't make a charge feel accidental.
- **The payment "done moment" (Apple Pay / Square model), make it invariant and multi-sensory:**
  1. **User-initiated, gated confirm** (biometric / double-press) so it never happens by accident.
  2. **Visible "authorizing" state** (beep + spinner) — never silent.
  3. **Invariant success state everywhere:** checkmark + "Done/Approved" + network logo + haptic + short sound. Identical every time — repetition builds trust.
  4. **Unambiguous failure** ("Payment failed" screen, no silent retry).
  5. **Distinct receipt step** — the confirmation IS the receipt; log card type + last 4.
- **Trust through data, not badges:** show the exact amount + who's charging + for what, *before* the tap.
- **NN/g's 4 credibility factors:** (1) design quality — typos/broken links destroy credibility fast; (2) disclose cost/fees/contact up front, before asking for billing; (3) comprehensive, current content; (4) connection to the wider web (external reviews > self-published testimonials).
- **Hierarchy of trust:** don't ask for sensitive info before earning lower-commitment steps. ~18% abandon checkout over security concerns (Baymard); place a recognizable security signal *next to* card fields, not just the footer.
- **A visible, reachable dispute/support path is part of "money-grade."** (Cash App's CFPB $175M order: polished animations couldn't offset an unreachable support line.)
- **Verified-over-vague for badges:** precise, transparent criteria (Thumbtack "Top Pro": background check + 4.8★ + reply rate) build durable trust; vague seals ("Certified Pro") drew an FTC/AG action. Don't over-promise what a badge covers.
- **Don't auto-blast a homeowner's contact info to multiple pros** — Angi's 2025 forced reversal to "homeowner choice" proves it's a broken pattern.

## Dark patterns — avoid (legitimacy + regulatory)

- Cancellation must be ≤ the clicks it took to sign up. Never pre-select paid add-ons. No confirmshaming ("No thanks, I hate saving money"). FTC actively enforces (Amazon $1.6B "roach motel" case).

Sources: developer.apple.com/design/human-interface-guidelines (accessibility, tap-to-pay, playing-haptics); m3.material.io & support.google.com/accessibility/android; w3.org/WAI/WCAG22 target-size; smashingmagazine.com/2016/09/the-thumb-zone (Hoober); support.apple.com/en-us/102626 & 101554 (Apple Pay); squareup.com/help tap-to-pay; consumerfinance.gov (Cash App order); nngroup.com (trustworthy-design, commitment-levels, confirmation-dialog, deceptive-patterns); ftc.gov (HomeAdvisor $7.2M, dark patterns); getjobber.com, housecallpro.com, servicetitan.com (field-service features); angi.com & thumbtack help (marketplace trust).
