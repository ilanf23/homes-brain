# Video in service records: design

Date: 2026-07-15
Status: approved by Ilan (conversation), pending spec review

## Summary

Pros can record a short walkthrough video when logging a job, and homeowners watch it on the service record. This is the first real media persistence in the product: today the log-a-job photo is only fed to the AI nameplate scan and never stored, and no Supabase Storage bucket exists. This feature builds the media pipeline (storage bucket + `job_media` table) and ships photos through it as well, fixing that gap.

## Product intent

The video is a walkthrough message: 30 to 60 seconds of the pro showing the homeowner what was done ("here's your new softener, here's the shutoff valve"). It is a trust and payoff moment on the record, not utilitarian evidence. The UX centers on a single prominent "Record a video for [customer name]" action, but the data model is general (multiple media rows per job) so documentation clips and multi-video need no future migration.

Validation metric: watch rate. `record_sent` and `record_viewed` events gain `has_video: boolean` in props, and a new `video_watched` event fires on first play of a video on the record page.

## Architecture

### Storage

- New Supabase Storage bucket `job-media`.
- Path convention: `job-media/{pro_id}/{job_id}/{uuid}.{ext}`.
- Policies: authenticated-context pros may upload only under their own `{pro_id}` prefix; public read (records are readable by anyone with the link, matching existing RLS philosophy).
- Bucket and policies ship as a migration in `supabase/migrations/` via the repo/Lovable sync. Never applied through the Supabase MCP.

### Schema

New table `job_media`:

```
job_media (
  id uuid pk,
  job_id uuid references jobs not null,
  kind text check (kind in ('photo','video')) not null,
  url text not null,
  thumbnail_url text,          -- poster frame for videos, null for photos
  duration_seconds numeric,    -- null for photos
  created_at timestamptz default now()
)
```

- RLS mirrors `jobs`: a pro reads/writes rows for their own jobs; public read via the record page path (same visibility as the record itself).
- `jobs.photo_url` stays as-is (unused legacy column); all new media goes through `job_media`.
- `url` is an abstract public URL. If we later move to Cloudflare Stream or Mux, only the upload path changes; readers are untouched.
- Until Lovable regenerates `src/integrations/supabase/types.ts`, inserts use the existing `as never` cast pattern (see `pro.jobs.new.tsx` records insert).

### Capture UX (log-a-job)

- One prominent "Record a video for [customer]" control in the work step, alongside the existing photo/nameplate capture. Copy pitches a 30 to 60 second walkthrough.
- Implementation: `<input type="file" accept="video/*" capture="environment">`. This opens the native camera in video mode on mobile (reliable everywhere), and also allows picking an existing video from the library. No in-app MediaRecorder UI: it is the flaky path on mobile Safari and adds nothing here.
- On selection:
  1. Client-side validation: duration <= 3 minutes and size <= 200MB (hard limits; read duration from a detached `<video>` element's metadata). 60 seconds is guidance in copy only.
  2. Generate a poster thumbnail client-side: seek the detached video element, draw a frame to a canvas, export JPEG.
  3. Start the upload to `job-media` immediately in the background with a visible progress state; the pro keeps filling the form. Video and thumbnail upload as separate objects.
  4. On job submit, insert the `job_media` row(s). If the upload is still in flight at submit time, the submit waits for it with the progress state visible. A failed upload never blocks the submit: the pro can retry or remove the video, or send the record without it.
- The existing unit photo gets persisted through the same pipeline: after the nameplate scan flow, the photo file also uploads to `job-media` and gets a `kind='photo'` row. Scan behavior is unchanged.
- Retake/remove supported before submit. Replacing a video deletes the previously uploaded object (best effort).

### Playback (record surfaces)

- Homeowner-facing record page and the claim flow: the video renders as a media block above the KV rows, poster thumbnail, `<video controls playsInline preload="metadata">`. This is a payoff moment; coral accent rules apply.
- Pro record detail (`/pro/records/:recordId`): same player, indigo context.
- Photos render in a small media strip in the same block.
- Playback error fallback (the HEVC case, see Risks): if the `<video>` element fires an error, swap to the poster thumbnail with a "Download video" link to the raw file instead of a black box.
- `video_watched` event logs on first `play` per page view.

### Privacy controls

- Video joins the review step's hidden-fields system as a new key `FIELD_VIDEO = "video"` (alongside `customer`, `equipment`, `make_model`, `work_done`, `next_service`, `recall` in `pro.jobs.new.tsx`). Present only when a video was attached; when hidden, the record page omits the media block for the video (photos have their own key `FIELD_PHOTOS = "photos"`).

## Approaches considered

1. **Supabase Storage, raw files (chosen).** No new vendors, fits v0 where SMS/email are still mocked. Accepts the HEVC codec risk with a graceful fallback.
2. **Cloudflare Stream or Mux.** Solves HEVC transcoding, real streaming, server-side thumbnails. Right upgrade once video proves out; rejected for v0 because it adds a paid dependency before the feature has usage. The `job_media.url` abstraction keeps the swap contained.
3. **Client-side transcoding (WebCodecs).** Free codec fix, but immature on Safari. Rejected.

## Risks and mitigations

- **HEVC playback**: iPhones default to High Efficiency capture; Chrome and many Android browsers cannot play HEVC. Mitigation: poster + download fallback on playback error, `video_watched` vs `record_viewed` ratio will show how often it bites, and Cloudflare Stream is the planned fix if it does.
- **Storage cost**: video eats the Supabase storage quota quickly. v0 accepts this; the 200MB cap bounds the worst case. Plan gating (via the existing `pros.plan` column) is explicitly deferred, noted for the Notion roadmap.
- **Upload on cell service**: background upload with progress starts at selection to hide most of the wait; submit waits visibly if needed; job save never fails because of media.

## Out of scope

- Transcoding/streaming service (upgrade path documented above).
- Plan gating of video.
- In-app recording UI.
- Video in messages/SMS (sends are mocked pending A2P 10DLC).

## Verification

No test suite exists. Verify by running `bun dev` and exercising: log a job with a video on a phone-sized viewport, confirm upload progress, confirm the record page plays it (and the pro record detail), confirm hidden-field toggle removes it, confirm a photo also persists and renders, confirm events land in the `events` table with `has_video`.
