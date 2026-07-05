# Benchmarks & UX laws

What the best products actually do, and the laws that explain why it feels good. Use these as the quality bar and the vocabulary for audits.

## Product teardowns

**Linear - craft as differentiator, speed as architecture.**
"At feature parity, the product that feels better wins." Opinionated defaults over endless flexibility ("the best design is opinionated"). No design→dev handoff; decisions by intuition, not A/B tests. Speed is architectural: local-first sync engine (data in the browser via IndexedDB, mutations apply locally then sync over WebSocket, ⌘K searches the local pool) → no spinners, "nothing to wait for." Independent test: ~47ms ops. Dimmed/recessed chrome so content leads.

**Superhuman - speed IS the product.**
Public "100ms rule" (Buchheit's instantaneous threshold) but internally targets **50ms**, newest renderer <32ms (1–2 frames). Local DB + caching (offline), preloads likely-next threads, minimal animation ("no time wasted rendering it"), keyboard-first with a ⌘K palette that shows the shortcut next to each command so it teaches itself. Applied _game design_ to productivity.

**Stripe - clarity for a messy domain.**
"Beautiful visual design for a not-so-pretty process" (payments). Writing-heavy culture (design docs before code) → rigor shows up as best-in-class API/docs DX. Gradients + calm visuals + meticulous docs reduce cognitive load. Motion only where it explains.

**Raycast - "the best interface is no interface."**
Keyboard-first: hotkey → type → done, before you reach for the mouse. Native (not Electron) → instant launch, low memory, used dozens of times/hour. Fast core engine + extensions that don't bloat the launch path.

**Notion - LEGO blocks + calm minimalism.**
Composable bricks (pages, databases, embeds). System-first restraint: "if adding a feature requires adding explanatory text, we've failed." Minimalism as feeling - software should fade into the background (even an imperceptible warm tint in the white).

**Vercel - design engineering + Geist.**
Design engineers design/build/ship autonomously ("iterate to greatness," avoid the perfection trap). Geist: restrained type, monospaced numerals, generous whitespace, monochrome + single accent - the dominant modern dev-tool aesthetic.

**Framer - motion as a first-class tool.**
Animation is core, not an afterthought; used with intention for clarity, rhythm, energy. "Premium" reads as fluidity, not static polish.

### The through-line (steal these six)

1. A **performance budget is a design decision** (100ms → 50ms). Instant response is the substrate.
2. **Keyboard-first + ⌘K command palette** (Linear, Superhuman, Raycast) - teaches itself, collapses Fitts distance, leverages Jakob's Law.
3. **Optimistic UI / no spinners** - show the change immediately, sync in the background.
4. **Opinionated restraint** - strong defaults, reduced scope, fewer choices.
5. **Craft as culture, not a coat of paint** - no handoff, writing rigor, design engineering, intuition over A/B tests.
6. **Aesthetic minimalism that fades into the background** - earns trust via the aesthetic-usability effect.

## UX laws (the vocabulary of "feel")

- **Doherty Threshold (~400ms):** feedback within ~400ms keeps users engaged and feeling productive. The bar for "premium" is well under it.
- **Jakob's Law:** users expect your product to work like the others they already use → adopt learned patterns (⌘K, standard shortcuts, bottom nav) instead of inventing.
- **Fitts's Law:** time-to-target depends on size + distance → big hit targets, edge/corner placement, and keyboard shortcuts (distance → 0).
- **Hick's Law:** more choices = slower decisions → opinionated defaults, 1–2 CTAs per state, hide breadth behind a search/command box.
- **Miller's Law (7±2):** chunk information; manage density with whitespace and progressive disclosure.
- **Aesthetic-Usability Effect:** people perceive beautiful UI as more usable and forgive minor flaws → polish literally buys trust and tolerance.
- **Peak–End Rule:** experiences are judged by their emotional peak and their end → spend delight on the signature confirmation/success moment and clean endings, not on decorating everything.

## How to apply in an audit or build

- Name the law you're invoking ("primary CTA in a top corner violates Fitts + thumb-zone; move it to the bottom bar").
- Benchmark against the teardown ("this list re-fetches on every keystroke - Linear-style local filtering would make it instant").
- Use the peak–end rule to decide _where_ to spend motion/delight budget: the moment a job is logged, a record is claimed, a payment clears.

Sources: figma.com/blog/karri-saarinens-10-rules; performance.dev/how-is-linear-so-fast; blog.superhuman.com/superhuman-is-built-for-speed; acquired.fm (Superhuman/Vohra); uwux.medium.com behind-the-gradient (Stripe); raycast.com/blog technical-deep-dive; designerfounders.substack.com (Notion/Zhao); vercel.com/blog/design-engineering-at-vercel & geist; framer.com/dictionary; uxdesigninstitute.com/blog/laws-of-ux & Laws of UX (Jon Yablonski).
