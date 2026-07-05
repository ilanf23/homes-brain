# States, speed & onboarding

Perceived speed and well-designed states are where an app feels "done" vs. "prototype."

## Response-time limits (Jakob Nielsen - unchanged since 1993)

- **0.1s** = feels instantaneous / caused by the user → no feedback needed.
- **1s** = keeps flow of thought unbroken → user notices but stays oriented.
- **10s** = limit of attention → past this, users disengage.
- **Doherty Threshold ~400ms** = the loop where users feel productive. Target **<100ms** for the premium tier.

## Loading - pick the right indicator

- **Under 1s: show nothing.** A skeleton/spinner that flashes makes users feel they can't keep up.
- **1–10s, single module or blocking action** (submit, auth, save, payment): **spinner**.
- **1–10s, full-page content** (feed, dashboard, list): **skeleton screen** matching the real layout - builds a mental model, cuts perceived wait.
- **Over 10s: percent-done progress bar** (only these set duration expectations).
- Deciding question: _is the user waiting for an ACTION to complete, or for CONTENT to appear?_ Action → spinner/progress. Content → skeleton.
- Avoid "frame-only" skeletons (header/footer, no content placeholders) - they read as broken.
- Contested: "skeleton feels 2× faster / 30–50% gain" is overstated; the controlled study (Mejtoft 2018) found modest, context-dependent benefit. Skeletons are an _illusion aid_, not a guaranteed speed win.

## Optimistic UI

Update the UI instantly, then reconcile with the server (click → UI updates → request → confirm or roll back). This is the main lever for "feels instant."

- **USE for** low-risk, high-frequency actions: toggles, likes, add-to-list, reorder, mark-done, delete-comment.
- **DON'T use for** payments, destructive/high-stakes/validation-heavy actions, or where failures are common (constant reversions confuse users).
- **Requirements:** save prior state for rollback; server is source of truth on conflict; idempotent endpoints; always show feedback when a rollback happens.

## Empty states - three distinct types, each designed

1. **First-use (onboarding):** a blank canvas that MUST drive action - a single primary CTA and a one-line "what this is / do this next." Never a dead end.
2. **User-cleared** (inbox zero, all tasks done): affirm the accomplishment, offer the next action.
3. **Error / no-results:** answer three things - what went wrong, why (to prevent recurrence), what to do next. For search, reflect the query back + suggest next steps so it doesn't feel broken.

Rules: 1–2 CTAs max (Hick's Law). CTA copy = imperative verbs ("Create," "Add," "Try"), never "OK." Design-system references: Atlassian, Carbon (IBM).

## Onboarding & activation

- **Reduce fields ruthlessly** - excess form fields are the top abandonment driver. Collect the minimum; enrich later.
- **Defer registration / payment** ("gradual engagement," Luke Wroblewski) - show value first, ask for info only when a step requires it. Move payment to _after_ value delivery.
- **Engineer the "aha moment"** - the first meaningful outcome, fast and visible (Loom's first video, Stripe's first test payment). Aim for first value in **2–5 min**, **3–7** core steps.
- **"Do it for them"** - pre-fill sample data, templates, smart defaults; kill the blank slate.
- **Progress indicator through onboarding** - visible progress drives completion.
- **Ask 2–3 segmentation questions** to personalize by role/use-case.
- Note: the specific activation percentages (+30–50%, "doubles conversion," "70% of abandonment") come from vendor/growth blogs - **directional, not hard data. Don't cite as fact.**

## Feedback - toasts, errors, success, haptics

- **Toasts:** auto-dismiss 2–6s (short 2–3s; with action 5–6s); 1–2 lines; consistent position; subtle slide-in; always a manual dismiss (×) and pause-on-hover. For low-priority transient confirmations only - never for critical errors or decisions.
- **Form errors (NN/g):** inline, next to the field, plain language, say what's wrong AND how to fix it.
- **Haptics (Apple HIG):** intentional and sparing; match the system pattern to meaning (Success/Warning/Error notification, Selection tick, Impact). Test: _if you can't say in one sentence what the haptic confirms, don't fire it._ Pair with visual + audio so it isn't the only signal.

Sources: nngroup.com (response-times-3-important-limits, progress-indicators, skeleton-screens, errors-forms-design-guidelines); toptal.com/designers/ux/empty-state-ux; atlassian.design & carbondesignsystem.com (empty states); cxl.com/blog/saas-signup-flows & Luke Wroblewski (gradual engagement); appcues.com & saasfactor.co (activation - directional); developer.apple.com/design/human-interface-guidelines/playing-haptics; logrocket.com/ux-design/toast-notifications.
