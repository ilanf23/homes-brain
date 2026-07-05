# Magic capture on log-a-job — design

2026-07-04 · Closes the Step 3 gap from the core-loop journey PDF: "snap the nameplate,
everything auto-fills, voice note, no typing."

## Decisions (user-approved)

- **Nameplate OCR**: Supabase edge function `scan-nameplate` calling the **Lovable AI
  gateway** (`google/gemini-2.5-flash`, vision). `LOVABLE_API_KEY` is auto-provisioned in
  Lovable-managed projects — no key setup. Function ships in the repo and deploys via
  Lovable's git sync, consistent with how migrations ship.
- **Voice note**: **Web Speech API** live dictation into "What was done". Client-only,
  free, works in Chrome and iOS Safari. Hidden when unsupported.

## Components

1. `supabase/functions/scan-nameplate/index.ts` — accepts `{ image: dataUri }`, returns
   `{ type, make, model, serial, warranty_until }` (all `string | null`). Extracts only
   what is printed; `warranty_until` only if an explicit date appears. Maps gateway 429 →
   "try again", 402 → "add credits". CORS open; `verify_jwt = false` (page already
   gates on pro session).
2. `src/lib/capture.ts` — `scanNameplate(file)`: downscales the photo to ≤1400px JPEG on a
   canvas (phone photos are 5–12 MB; the model reads 1400px fine), invokes the function,
   throws user-readable errors. `useDictation(onText)`: wraps
   `SpeechRecognition`/`webkitSpeechRecognition`, continuous + interim results; returns
   `{ supported, listening, interim, start, stop }`.
3. `src/components/svg.tsx` — `CameraIcon`, `MicIcon` in the house stroke style.
4. `src/routes/pro.jobs.new.tsx` (work stage):
   - The decorative "Photo (optional)" input becomes a **Snap the nameplate** capture zone
     (dashed teal card, `capture="environment"`). States: idle → scanning (thumbnail +
     spinner) → done ("Auto-detected — check the fields below") or error (red note,
     retake, manual entry always available).
   - Auto-fill only fills **blank** fields — never clobbers what the pro typed.
     `warranty_until` only applied if `YYYY-MM-DD`. All-null result is treated as a
     miss, not success. Logs `nameplate_scanned` with the filled field list.
   - Mic button inside the "What was done" textarea: teal while listening with a pulse
     dot + live interim transcript below; final phrases append to the field.

## Error handling

Scan failure or gateway error never blocks the flow — the form stays fully manual.
Dictation errors just end the session; typing keeps working.

## Out of scope

Photo upload to storage (`jobs.photo_url`), transcript cleanup via AI, recall lookup
from scanned model numbers (parking-lot ideas).
