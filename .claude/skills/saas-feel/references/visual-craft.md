# Visual craft — spacing, type, color, hierarchy

Restraint reads as confidence. The premium look is near-monochrome, tightly scaled, and generously spaced, with every element fully finished.

## Spacing

- **4px base unit; every value is a multiple.** (Tailwind: `0.25rem` = 4px.)
- **Fixed non-linear scale, growing jumps:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192 · 256`. Small steps low, doubling-ish high. Never arbitrary values.
- **Start with too much whitespace, then remove.** Space = attention; an element with more space around it gets more of it. Whitespace reads as premium.
- **Spacing encodes grouping (proximity):** less space between related items, more between unrelated. Avoid ambiguous spacing (equal gaps between things that belong to different groups).
- Don't force everything into a 12-col grid or proportional sizing — give each element only the space it needs; use a `max-width` container.

## Typography

- **Fixed type scale, ~8–12 sizes:** e.g. `12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48 · 60 · 72`.
- **Line length 45–75 characters (66 ideal).** Enforce with `max-width` in `em` (~20–35em). Headings shorter (20–40).
- **Line-height scales inversely with size:** body ~1.5, headings/display ~1.1–1.25.
- **Use weight and color for hierarchy before size.** Two weights usually suffice: 400–500 body, 600–700 emphasis. Never below 400 for UI text.
- **Anti-pattern to flag:** primary CTA or key value set at weight 400. At small sizes, signal "primary" with accent color + heavier weight rather than bumping font-size.
- Letter-spacing: tighten large headings (−0.02 to −0.05em); widen small uppercase labels (+0.05em). Right-align numbers in tables (tabular figures). Don't center text over 2 lines.
- **One typeface family is the brand anchor** (Linear=Inter, Vercel=Geist, Stripe=Söhne). One family + a mono for numbers/IDs. No display-font mixing in product UI.

## Color

- **Restraint = confidence:** near-monochrome neutrals + ONE accent used for *meaning* (primary action, active state), not decoration.
- **60/30/10 split:** 60% dominant/background, 30% secondary surface, 10% accent. The accent is the most saturated color and appears rarely — "contrast through scarcity."
- **Build shade scales, not single colors:** ~8–9 greys + 5–10 shades per semantic color (success/warning/danger/info). Build in HSL (pick mid → derive dark/light).
- **WCAG AA contrast: 4.5:1 body text · 3:1 large text (≥18pt or ≥14pt bold) · 3:1 for UI components/borders.** (AAA body = 7:1.)
- **Never use plain grey text on a colored background** — lower the text's opacity or pick a color in the background's hue family instead.
- Perceived brightness varies by hue (yellow/green look lighter than blue/purple at equal HSL lightness) — adjust by eye. Flip the lightness scale for dark mode.
- **Contested (don't state as law):** "never pure #000/#FFF, always tint neutrals with the brand hue" is a real *tendency* in Stripe/Linear/Vercel but not a stated rule. The actual principle is *deliberate choice of neutral over defaults*, matched to brand temperature.

## Hierarchy

- **Three levers, layered: size, weight, color.** Primary = larger / 600–700 / dark. Secondary = medium / 500 / mid-grey. Tertiary = smaller / 400 / light-grey.
- **Emphasize by de-emphasizing** the surroundings rather than shouting louder.
- **Max 3 text sizes per screen.** Make the single most important element biggest and give it the most space.
- **Contrast (value/saturation difference), not absolute color, creates hierarchy.**
- **Labels are secondary to values** — de-emphasize the label ("Warranty"), emphasize the data ("to 2031"). This is the KV-row pattern.
- Style for role, not tag (an `h2` needn't be large).
- Concrete card example: name 24px/700/dark → price 20px/600/dark → description 15px/400/#6b7280 → label 12px/500/uppercase/light.

## The "premium tells" (what makes Linear/Stripe/Vercel look expensive)

- **Interaction density > visual density.** Visually sparse, but every element has all its microstates.
- **Six states per interactive element:** default, hover, focus (a real keyboard ring, not the browser default), active/pressed, disabled, loading. Missing one = "not done."
- **Fewer borders.** Replace hairline borders with spacing, a background-color shift, or a subtle shadow. When you do use lines, hairline (~0.5–1px) at low alpha, placed deliberately.
- **Two-layer shadows** for realistic depth (one large diffuse + one tight), low alpha, on a 5-level elevation scale. e.g. `sm = 0 1px 3px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.06)`.
- **Consistent radius scale:** containers ~12px, pills `9999px`.
- **Designed empty/loading states** (skeletons matching real layout, not "No data" / raw spinner).
- **Tabular figures** for money/data tables; **monospace** for IDs/codes.

Sources: Refactoring UI (Schoger/Wathan); tailwindcss.com/docs/theme; m3.material.io/styles/typography; w3.org/WAI/WCAG21 & webaim.org/articles/contrast; nngroup.com (visual hierarchy, principles of visual design); mantlr.com/blog/stripe-linear-vercel-premium-ui; rauno.me/craft & devouringdetails.com; figma.com/blog/karri-saarinens-10-rules.
