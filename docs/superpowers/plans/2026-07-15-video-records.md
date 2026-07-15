# Video Walkthroughs in Service Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pros attach a short walkthrough video (and, fixing an existing gap, the unit photo) when logging a job; homeowners watch it on the service record.

**Architecture:** A `job-media` Supabase Storage bucket plus a `job_media` table hold attachments per job. Upload starts in the background the moment the pro picks a video in log-a-job; the `job_media` rows are inserted at submit. Record surfaces (homeowner record page, pro record detail, claim preview) render a shared `RecordMedia` component with a poster, native `<video>` controls, and a download fallback for undecodable codecs (iPhone HEVC in Chrome).

**Tech Stack:** TanStack Start + React 19 + TypeScript + Tailwind v4, Supabase (Postgres, Storage, edge functions), Bun.

**Spec:** `docs/superpowers/specs/2026-07-15-video-records-design.md` - read it first.

## Global Constraints

- Never use em dashes (U+2014) anywhere: copy, comments, commit messages. Use period, comma, colon, parentheses, or hyphen.
- Package manager is Bun. There is NO test suite: every task verifies with `bun run lint` and `bun run build`, plus the manual dev-server checks in the final task.
- Never edit `src/routeTree.gen.ts` or anything in `src/integrations/supabase/` (all Lovable-generated). `job_media` is not in the generated `types.ts` yet; use the untyped-client pattern shown in Task 2, and the `as never` insert-cast pattern already used in `pro.jobs.new.tsx` (see its records insert around line 1580).
- Migrations are files in `supabase/migrations/`, shipped via the repo/Lovable sync. NEVER apply schema through the Supabase MCP or CLI against the remote.
- Build UI from `src/lib/ui.tsx` primitives (`Card`, `Btn`, `Field`, `Pill`, ...). Pro surfaces are indigo; the homeowner record media block is a payoff moment (coral allowed). Secondary text is exactly `text-muted`.
- Commit after each task. Never force-push or rewrite published history.
- Line numbers below are anchors from 2026-07-15; verify with grep before editing, the file may have drifted.

---

### Task 1: Migration - `job_media` table, storage bucket, policies

**Files:**
- Create: `supabase/migrations/20260715090000_job_media.sql`

**Interfaces:**
- Produces: table `public.job_media(id, job_id, kind, url, thumbnail_url, duration_seconds, created_at)`; public storage bucket `job-media`; `get_home_view()` records entries gain a `hidden_fields` key. Later tasks read/write these.

- [ ] **Step 1: Write the migration**

Note `public.my_pro_id()` already exists (maps `auth.uid()` to `pros.id` via `pros.auth_user_id`) and `records.hidden_fields` exists (migration `20260708120000_record_hidden_fields`). The `get_home_view()` body below is the current definition from `supabase/migrations/20260706211957_d394a61a-0ab3-4ea0-933c-b30ee1bfd967.sql` lines 89-121 with ONE change: the records `json_build_object` gains `'hidden_fields', r.hidden_fields`. Before writing, run `grep -rn "CREATE OR REPLACE FUNCTION public.get_home_view" supabase/migrations/` and if a migration newer than `20260706211957` redefines it, copy THAT body instead and apply the same one-line change.

```sql
-- Media attachments for jobs: the pro's walkthrough video and unit photos.
-- One row per object; the storage object lives in the job-media bucket.
CREATE TABLE public.job_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo','video')),
  url text NOT NULL,
  thumbnail_url text,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_media_job_id_idx ON public.job_media(job_id);
ALTER TABLE public.job_media ENABLE ROW LEVEL SECURITY;

-- Pros manage media on their own jobs.
CREATE POLICY job_media_pro_all ON public.job_media
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jobs j
                 WHERE j.id = job_media.job_id AND j.pro_id = public.my_pro_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j
                      WHERE j.id = job_media.job_id AND j.pro_id = public.my_pro_id()));

-- Records are readable by anyone with the link; media follows the record.
CREATE POLICY job_media_public_read ON public.job_media
  FOR SELECT USING (true);

-- Public bucket: objects are served by URL, matching link-public records.
-- 200MB server-side cap mirrors the client-side check.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('job-media', 'job-media', true, 209715200, ARRAY['video/*','image/*'])
ON CONFLICT (id) DO NOTHING;

-- Pros upload only under their own {pro_id}/ prefix. No update policy:
-- every upload takes a fresh uuid path, replace = upload new + delete old.
CREATE POLICY "job media pro insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-media'
              AND (storage.foldername(name))[1] = public.my_pro_id()::text);

CREATE POLICY "job media pro delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-media'
         AND (storage.foldername(name))[1] = public.my_pro_id()::text);

-- get_home_view: records entries gain hidden_fields so the homeowner record
-- page can hide exactly what the pro excluded (video/photos included).
CREATE OR REPLACE FUNCTION public.get_home_view()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ho_id uuid := public.my_homeowner_id();
BEGIN
  IF v_ho_id IS NULL THEN
    IF auth.uid() IS NOT NULL THEN v_ho_id := public.homeowner_ensure(NULL); END IF;
  END IF;
  IF v_ho_id IS NULL THEN RETURN NULL; END IF;

  RETURN (
    WITH h AS (SELECT * FROM public.homes WHERE claimed_by_homeowner = v_ho_id LIMIT 1)
    SELECT json_build_object(
      'homeowner', (SELECT row_to_json(ho) FROM public.homeowners ho WHERE ho.id = v_ho_id),
      'home',      (SELECT row_to_json(h) FROM h),
      'equipment', COALESCE((SELECT json_agg(row_to_json(e) ORDER BY e.created_at DESC)
                               FROM public.equipment e WHERE e.home_id = (SELECT id FROM h)), '[]'::json),
      'jobs',      COALESCE((SELECT json_agg(row_to_json(j) ORDER BY j.created_at DESC)
                               FROM public.jobs j WHERE j.home_id = (SELECT id FROM h)), '[]'::json),
      'pros',      COALESCE((SELECT json_agg(json_build_object('id',p.id,'business',p.business,'trade',p.trade,
                                                                'logo',p.logo,'google_rating',p.google_rating))
                               FROM public.pros p
                               WHERE p.id IN (SELECT DISTINCT pro_id FROM public.jobs WHERE home_id = (SELECT id FROM h))),
                            '[]'::json),
      'invites',   COALESCE((SELECT json_agg(row_to_json(i) ORDER BY i.created_at DESC)
                               FROM public.invites i WHERE i.home_id = (SELECT id FROM h)), '[]'::json),
      'records',   COALESCE((SELECT json_agg(json_build_object('id',r.id,'public_url',r.public_url,'viewed_at',r.viewed_at,'created_at',r.created_at,'job_id',r.job_id,'hidden_fields',r.hidden_fields))
                               FROM public.records r JOIN public.jobs j ON j.id = r.job_id WHERE j.home_id = (SELECT id FROM h)), '[]'::json)
    )
  );
END $$;
```

- [ ] **Step 2: Sanity-check the SQL reads clean**

Run: `bun run lint` (does not lint SQL but confirms nothing else broke) and reread the file for typos: table name `job_media`, bucket id `job-media`, policy prefix check uses index `[1]`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260715090000_job_media.sql
git commit -m "Add job_media table and job-media storage bucket for record videos"
```

---

### Task 2: `src/lib/media.ts` - probe, poster, upload with progress, list/insert

**Files:**
- Create: `src/lib/media.ts`
- Modify: `src/lib/capture.ts` (export a JPEG-blob helper next to the existing data-URI one)

**Interfaces:**
- Produces (used by Tasks 3-8):
  - `type JobMediaKind = "photo" | "video"`
  - `type JobMediaRow = { id: string; job_id: string; kind: JobMediaKind; url: string; thumbnail_url: string | null; duration_seconds: number | null; created_at: string }`
  - `VIDEO_MAX_SECONDS = 180`, `VIDEO_MAX_BYTES = 200 * 1024 * 1024`
  - `probeVideo(file: File): Promise<{ duration: number | null; poster: Blob | null }>`
  - `uploadJobMedia(opts: { proId: string; file: Blob; ext: string; contentType: string; onProgress?: (fraction: number) => void }): Promise<{ path: string; publicUrl: string }>`
  - `removeJobMediaObject(path: string): Promise<void>`
  - `listJobMedia(jobIds: string[]): Promise<JobMediaRow[]>`
  - `insertJobMedia(rows: Array<Omit<JobMediaRow, "id" | "created_at">>): Promise<boolean>`
  - from capture.ts: `toJpegBlob(file: File): Promise<Blob>`

- [ ] **Step 1: Refactor `src/lib/capture.ts` to expose a JPEG blob**

In `src/lib/capture.ts`, `toJpegDataUri` (lines 46-58) builds a canvas and calls `toDataURL`. Split the canvas work out and add a blob variant. Replace the existing `toJpegDataUri` function with:

```ts
async function drawToCanvas(file: File): Promise<HTMLCanvasElement> {
  const { source, width, height, release } = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    release();
  }
}

async function toJpegDataUri(file: File): Promise<string> {
  return (await drawToCanvas(file)).toDataURL("image/jpeg", 0.85);
}

/* Resized JPEG as a Blob, for uploading the unit photo to storage. */
export async function toJpegBlob(file: File): Promise<Blob> {
  const canvas = await drawToCanvas(file);
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo. Try a JPEG."))),
      "image/jpeg",
      0.85,
    ),
  );
}
```

- [ ] **Step 2: Create `src/lib/media.ts`**

```ts
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Job media: the pro's walkthrough video and unit photos, stored in the
   public job-media bucket with one job_media row per object.

   job_media is not in the Lovable-generated types.ts yet (it regenerates
   from migrations on the Lovable side), so this module goes through an
   untyped view of the client. Keep every job_media query in this file so
   the cast lives in one place. */
const db = supabase as unknown as SupabaseClient;

const BUCKET = "job-media";

export type JobMediaKind = "photo" | "video";

export type JobMediaRow = {
  id: string;
  job_id: string;
  kind: JobMediaKind;
  url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
};

/* 60 seconds is the guidance in copy; these are the hard stops. The bucket
   enforces the byte cap server-side too. */
export const VIDEO_MAX_SECONDS = 180;
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;

export function publicMediaUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/* Duration + poster frame off a detached <video>. iPhone HEVC often cannot
   decode in this browser: metadata may load but seeking never completes, so
   a timeout resolves with whatever we got. A null duration means "could not
   read it here": let the upload proceed, the homeowner's browser may differ. */
export function probeVideo(file: File): Promise<{ duration: number | null; poster: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (duration: number | null, poster: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve({ duration, poster });
    };
    const timer = setTimeout(() => {
      const d = Number.isFinite(video.duration) ? video.duration : null;
      finish(d, null);
    }, 4000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => {
      clearTimeout(timer);
      finish(null, null);
    };
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 720;
          canvas.height = video.videoHeight || 1280;
          canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (poster) => {
              clearTimeout(timer);
              finish(duration, poster);
            },
            "image/jpeg",
            0.8,
          );
        } catch {
          clearTimeout(timer);
          finish(duration, null);
        }
      };
      // A beat in, so the poster is not a black first frame.
      video.currentTime = Math.min(0.5, Math.max(0, (duration ?? 1) - 0.1));
    };
    video.src = url;
  });
}

/* Upload with real progress. supabase-js upload() has no progress callback,
   so mint a signed upload URL and PUT via XHR. Path is {pro_id}/{uuid}.{ext}:
   the job row does not exist yet while this runs. */
export async function uploadJobMedia(opts: {
  proId: string;
  file: Blob;
  ext: string;
  contentType: string;
  onProgress?: (fraction: number) => void;
}): Promise<{ path: string; publicUrl: string }> {
  const path = `${opts.proId}/${crypto.randomUUID()}.${opts.ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error("Couldn't start the upload. Try again.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl);
    xhr.setRequestHeader("content-type", opts.contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload failed. Try again."));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(opts.file);
  });
  return { path, publicUrl: publicMediaUrl(path) };
}

/* Best-effort delete for replaced/removed uploads before submit. */
export async function removeJobMediaObject(path: string): Promise<void> {
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // The orphaned object is invisible (no job_media row points at it).
  }
}

export async function listJobMedia(jobIds: string[]): Promise<JobMediaRow[]> {
  if (jobIds.length === 0) return [];
  const { data, error } = await db
    .from("job_media")
    .select("id,job_id,kind,url,thumbnail_url,duration_seconds,created_at")
    .in("job_id", jobIds)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as JobMediaRow[];
}

export async function insertJobMedia(
  rows: Array<Omit<JobMediaRow, "id" | "created_at">>,
): Promise<boolean> {
  if (rows.length === 0) return true;
  const { error } = await db.from("job_media").insert(rows);
  return !error;
}
```

- [ ] **Step 3: Verify**

Run: `bun run lint` then `bun run build`. Expected: both pass with no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/media.ts src/lib/capture.ts
git commit -m "Add job media helpers: probe, poster, progress upload, queries"
```

---

### Task 3: `RecordMedia` component

**Files:**
- Create: `src/components/job-media.tsx`

**Interfaces:**
- Consumes: `JobMediaRow` from `@/lib/media`
- Produces: `RecordMedia({ media, videoLabel, downloadLabel, photoAlt, onVideoPlay? })` - renders nothing when `media` is empty; fires `onVideoPlay` once per mount on first play.

- [ ] **Step 1: Create the component**

```tsx
import { useRef, useState } from "react";
import type { JobMediaRow } from "@/lib/media";

/* Media block for a service record: one featured walkthrough video (poster,
   native controls) plus a strip of photos. Shared by the homeowner record,
   the pro record detail, and the claim preview.

   If this browser cannot decode the file (iPhone HEVC in Chrome is the
   common case), the <video> element errors: swap to the poster with a
   download link instead of a black box. */
export function RecordMedia({
  media,
  videoLabel,
  downloadLabel,
  photoAlt,
  onVideoPlay,
}: {
  media: JobMediaRow[];
  videoLabel: string;
  downloadLabel: string;
  photoAlt: string;
  onVideoPlay?: () => void;
}) {
  const video = media.find((m) => m.kind === "video") ?? null;
  const photos = media.filter((m) => m.kind === "photo");
  const [broken, setBroken] = useState(false);
  const playedRef = useRef(false);

  if (!video && photos.length === 0) return null;

  return (
    <div className="space-y-3">
      {video && !broken && (
        <video
          controls
          playsInline
          preload="metadata"
          poster={video.thumbnail_url ?? undefined}
          src={video.url}
          aria-label={videoLabel}
          className="w-full max-h-[70vh] rounded-2xl border border-line bg-ink/5"
          onError={() => setBroken(true)}
          onPlay={() => {
            if (playedRef.current) return;
            playedRef.current = true;
            onVideoPlay?.();
          }}
        />
      )}
      {video && broken && (
        <div className="relative overflow-hidden rounded-2xl border border-line">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={videoLabel} className="w-full object-cover" />
          ) : null}
          <div
            className={
              video.thumbnail_url
                ? "absolute inset-0 flex items-center justify-center bg-ink/50"
                : "flex items-center justify-center bg-soft py-12"
            }
          >
            <a
              href={video.url}
              download
              className="pressable rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink shadow"
            >
              {downloadLabel}
            </a>
          </div>
        </div>
      )}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="shrink-0">
              <img
                src={p.url}
                alt={photoAlt}
                className="h-24 w-24 rounded-xl border border-line object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run build`. Expected: pass. (If `bg-paper` or `pressable` is flagged, check the class exists in the codebase: both are used in `pro.jobs.new.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/job-media.tsx
git commit -m "Add RecordMedia block: video player with download fallback, photo strip"
```

---

### Task 4: Log-a-job capture - video picker, background upload, photo persistence

All edits in `src/routes/pro.jobs.new.tsx` (large file; anchors below were valid on 2026-07-15, grep to confirm).

**Files:**
- Modify: `src/routes/pro.jobs.new.tsx`

**Interfaces:**
- Consumes: `probeVideo`, `uploadJobMedia`, `removeJobMediaObject`, `VIDEO_MAX_BYTES`, `VIDEO_MAX_SECONDS` from `@/lib/media`; `toJpegBlob` from `@/lib/capture`
- Produces (Task 5 relies on these exact names): refs `videoFinal`, `videoBusy`, `photoFinal`, `photoBusy`; state `videoUpload` of type `VideoUploadState`; JSX fragment `videoCapture`; function `onPickVideo(file: File)`.

- [ ] **Step 1: Add imports**

Add to the existing imports from `@/lib/capture` (grep `from "@/lib/capture"`): `toJpegBlob`. Add a new import line:

```ts
import {
  probeVideo,
  uploadJobMedia,
  removeJobMediaObject,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_SECONDS,
} from "@/lib/media";
```

- [ ] **Step 2: Add state and refs**

Directly after the nameplate-scan state block (anchor: `const [scanFilledDetails, setScanFilledDetails] = useState(false);` around line 379), add:

```ts
  // Walkthrough video (optional). The upload starts the moment the pro picks
  // it so the end of the form is never a long network wait. `videoFinal` and
  // `photoFinal` are refs, not state: submit reads them after awaiting the
  // busy promise and must not see a stale closure.
  type VideoUploadState = {
    status: "uploading" | "done" | "error";
    progress: number; // 0..1
    error?: string;
  };
  const videoRef = useRef<HTMLInputElement>(null);
  const [videoUpload, setVideoUpload] = useState<VideoUploadState | null>(null);
  const videoBusy = useRef<Promise<void> | null>(null);
  const videoFinal = useRef<{
    url: string;
    path: string;
    posterUrl: string | null;
    posterPath: string | null;
    duration: number | null;
  } | null>(null);
  const photoBusy = useRef<Promise<void> | null>(null);
  const photoFinal = useRef<{ url: string; path: string } | null>(null);
```

- [ ] **Step 3: Add `onPickVideo` next to `onNameplate`**

`onNameplate` is at ~line 685. Add below it:

```ts
  async function onPickVideo(file: File) {
    if (!proId) return;
    if (file.size > VIDEO_MAX_BYTES) {
      setToast("That video is too big. Keep it under 200MB.");
      setTimeout(() => setToast(null), 4500);
      return;
    }
    // Replacing a video: the old objects are orphans now, clean them up.
    const old = videoFinal.current;
    videoFinal.current = null;
    if (old) {
      void removeJobMediaObject(old.path);
      if (old.posterPath) void removeJobMediaObject(old.posterPath);
    }
    setVideoUpload({ status: "uploading", progress: 0 });
    const task = (async () => {
      const probe = await probeVideo(file);
      if (probe.duration && probe.duration > VIDEO_MAX_SECONDS) {
        setVideoUpload({ status: "error", progress: 0, error: "Keep it under 3 minutes." });
        return;
      }
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const video = await uploadJobMedia({
        proId,
        file,
        ext,
        contentType: file.type || "video/mp4",
        onProgress: (f) =>
          setVideoUpload((v) => (v && v.status === "uploading" ? { ...v, progress: f } : v)),
      });
      let poster: { path: string; publicUrl: string } | null = null;
      if (probe.poster) {
        poster = await uploadJobMedia({
          proId,
          file: probe.poster,
          ext: "jpg",
          contentType: "image/jpeg",
        }).catch(() => null);
      }
      videoFinal.current = {
        url: video.publicUrl,
        path: video.path,
        posterUrl: poster?.publicUrl ?? null,
        posterPath: poster?.path ?? null,
        duration: probe.duration,
      };
      setVideoUpload({ status: "done", progress: 1 });
      await logEvent(`pro:${proId}`, "video_recorded", { duration: probe.duration });
    })().catch((e) => {
      setVideoUpload({
        status: "error",
        progress: 0,
        error: e instanceof Error ? e.message : "Upload failed. Try again.",
      });
    });
    videoBusy.current = task;
    await task;
  }

  function removeVideo() {
    const old = videoFinal.current;
    videoFinal.current = null;
    videoBusy.current = null;
    setVideoUpload(null);
    if (old) {
      void removeJobMediaObject(old.path);
      if (old.posterPath) void removeJobMediaObject(old.posterPath);
    }
  }
```

- [ ] **Step 4: Persist the unit photo in `onNameplate`**

In `onNameplate` (~line 685), right after `setScanPreview(URL.createObjectURL(file));`, add a background upload (the scan itself is unchanged):

```ts
    // Persist the photo too: until now it only fed the AI scan and was lost.
    if (proId) {
      photoFinal.current = null;
      photoBusy.current = (async () => {
        const blob = await toJpegBlob(file);
        const up = await uploadJobMedia({ proId, file: blob, ext: "jpg", contentType: "image/jpeg" });
        photoFinal.current = { url: up.publicUrl, path: up.path };
      })().catch(() => {
        // Photo persistence is best effort; the scan result is the payoff.
      });
    }
```

- [ ] **Step 5: Add the `videoCapture` fragment**

Directly after the `photoCapture` const closes (anchor: its closing `);` after line ~2006), add:

```tsx
  /* Optional walkthrough video. Native camera via the file input (reliable on
     mobile Safari where an in-app recorder is not); also accepts a library
     pick. Upload runs in the background while the pro finishes the form. */
  const videoCapture = (
    <div>
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPickVideo(f);
          e.target.value = "";
        }}
      />
      {!videoUpload ? (
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          className="pressable w-full rounded-xl border-2 border-dashed border-indigo/40 bg-paper px-4 py-4 text-center hover:border-indigo hover:bg-indigobg/40 transition-colors"
        >
          <div className="flex items-center justify-center gap-2 text-indigo">
            <VideoIcon size={22} />
            <span className="text-sm font-semibold">Record a walkthrough video (optional)</span>
          </div>
          <div className="mt-1 text-xs text-muted">
            30 to 60 seconds showing what you did. It goes on their record.
          </div>
        </button>
      ) : (
        <div className="rounded-xl border border-line bg-paper p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {videoUpload.status === "uploading" && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo">
                    <span className="h-4 w-4 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
                    Uploading video... {Math.round(videoUpload.progress * 100)}%
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-indigobg">
                    <div
                      className="h-1.5 rounded-full bg-indigo transition-all"
                      style={{ width: `${Math.round(videoUpload.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {videoUpload.status === "done" && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo">
                  <ShieldCheck size={16} animate={false} /> Video added
                </div>
              )}
              {videoUpload.status === "error" && (
                <div className="text-sm text-red">{videoUpload.error}</div>
              )}
            </div>
            {videoUpload.status !== "uploading" && (
              <>
                <button
                  type="button"
                  onClick={() => videoRef.current?.click()}
                  className="pressable shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:border-ink/20 transition-colors"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="pressable shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:text-red hover:border-red/30 transition-colors"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
```

`VideoIcon`: check `lucide-react` imports at the top of the file; add `Video as VideoIcon` to that import (lucide exports `Video`). If a camera icon component from `@/components/svg` is used for `CameraIcon`, keep the lucide `Video` anyway; it only needs `size`.

- [ ] **Step 6: Mount `videoCapture` in the work step and the review step**

Work step: after `{photoCapture}` at anchor comment `{/* Photo (optional) */}` (~line 2364), add `{videoCapture}` on the next line.
Review step: `photoCapture` mounts a second time around line ~2877 inside a `border-t` div (the voice path skips the work step). Add `{videoCapture}` right after it inside the same div. Only one stage renders at a time, so the hidden inputs mount once.

- [ ] **Step 7: Verify and commit**

Run: `bun run lint && bun run build`. Expected: pass.

```bash
git add src/routes/pro.jobs.new.tsx src/lib/capture.ts
git commit -m "Log-a-job: walkthrough video capture with background upload, persist unit photo"
```

---

### Task 5: Log-a-job submit wiring - `job_media` rows, hidden fields, events

**Files:**
- Modify: `src/routes/pro.jobs.new.tsx`
- Modify: `src/lib/customer-locales.ts` (labels for the two new review rows)

**Interfaces:**
- Consumes: `videoFinal`, `videoBusy`, `photoFinal`, `photoBusy`, `videoUpload` from Task 4; `insertJobMedia` from `@/lib/media`
- Produces: constants `FIELD_VIDEO = "video"`, `FIELD_PHOTOS = "photos"` (Tasks 6 and 8 match these exact string values against `records.hidden_fields`); `record_sent` events carry `has_video: boolean`.

- [ ] **Step 1: Add the field constants**

At the FIELD block (lines 118-123), add:

```ts
const FIELD_VIDEO = "video";
const FIELD_PHOTOS = "photos";
```

- [ ] **Step 2: Import `insertJobMedia`**

Extend the Task 4 import from `@/lib/media` with `insertJobMedia`.

- [ ] **Step 3: Insert media rows after the job insert**

In the submit function, after the job insert succeeds (anchor: the `if (jobErr || !job) {` block ending ~line 1559) and BEFORE the `// Record.` comment, add:

```ts
    // Attach media. Wait out an in-flight upload (progress stays visible);
    // a failed upload never blocks the job or the record.
    if (videoBusy.current) await videoBusy.current;
    if (photoBusy.current) await photoBusy.current;
    const mediaRows: Array<{
      job_id: string;
      kind: "photo" | "video";
      url: string;
      thumbnail_url: string | null;
      duration_seconds: number | null;
    }> = [];
    if (videoFinal.current) {
      mediaRows.push({
        job_id: job.id,
        kind: "video",
        url: videoFinal.current.url,
        thumbnail_url: videoFinal.current.posterUrl,
        duration_seconds: videoFinal.current.duration,
      });
    }
    if (photoFinal.current) {
      mediaRows.push({
        job_id: job.id,
        kind: "photo",
        url: photoFinal.current.url,
        thumbnail_url: null,
        duration_seconds: null,
      });
    }
    if (!(await insertJobMedia(mediaRows))) {
      setToast("The video didn't attach. The record still sent without it.");
      setTimeout(() => setToast(null), 4500);
    }
```

- [ ] **Step 4: Register the hidden-field keys**

In the same submit function, the `presentKeys` set is built at ~line 1563. After the existing `if (nextService) presentKeys.add(FIELD_NEXT_SERVICE);` line add:

```ts
    if (videoFinal.current) presentKeys.add(FIELD_VIDEO);
    if (photoFinal.current) presentKeys.add(FIELD_PHOTOS);
```

- [ ] **Step 5: Review-step rows**

In the review step's `RecordRow` list (the block starting `<RecordRow label={customerCopy.workDone}` ~line 2823), after the `next_service` row/editor block (~line 2864), add:

```tsx
                    {videoUpload && (
                      <RecordRow
                        label={customerCopy.video}
                        value={
                          videoUpload.status === "uploading"
                            ? `Uploading ${Math.round(videoUpload.progress * 100)}%`
                            : videoUpload.status === "error"
                              ? "Upload failed"
                              : "Walkthrough video"
                        }
                        included={!hiddenFields.has(FIELD_VIDEO)}
                        onToggle={() => toggleField(FIELD_VIDEO)}
                      />
                    )}
                    {scanPreview && (
                      <RecordRow
                        label={customerCopy.photo}
                        value="Unit photo"
                        included={!hiddenFields.has(FIELD_PHOTOS)}
                        onToggle={() => toggleField(FIELD_PHOTOS)}
                      />
                    )}
```

`customerCopy` labels: grep `customerCopy` in `pro.jobs.new.tsx` to find its source object in `src/lib/customer-locales.ts`, and add to that object, in every locale present (en/es/ru/uk as of today):

```
video: "Video" (en) / "Video" (es) / "Видео" (ru) / "Відео" (uk)
photo: "Photo" (en) / "Foto" (es) / "Фото" (ru) / "Фото" (uk)
```

- [ ] **Step 6: `has_video` on `record_sent`**

There are two `record_sent` logEvent calls (lines ~1647 and ~1718). Add to BOTH props objects:

```ts
        has_video: !!videoFinal.current,
```

- [ ] **Step 7: Verify and commit**

Run: `bun run lint && bun run build`. Expected: pass.

```bash
git add src/routes/pro.jobs.new.tsx src/lib/customer-locales.ts
git commit -m "Log-a-job: attach media rows on submit, hideable video/photo, has_video event prop"
```

---

### Task 6: Homeowner record page - media block, video_watched, record_viewed prop

**Files:**
- Modify: `src/components/home-shell.tsx` (HomeRecord type)
- Modify: `src/routes/home.records.$recordId.tsx`
- Modify: `src/routes/home.index.tsx`
- Modify: `src/lib/customer-locales.ts` (homeowner copy)

**Interfaces:**
- Consumes: `listJobMedia`, `JobMediaRow` from `@/lib/media`; `RecordMedia` from `@/components/job-media`; `track` from `@/lib/events`; hidden-field values `"video"` / `"photos"` (Task 5); `hidden_fields` in the records JSON (Task 1).
- Produces: copy keys `videoFromPro`, `downloadVideo`, `jobPhoto` on `homeRecordCopy`.

- [ ] **Step 1: Extend the `HomeRecord` type**

In `src/components/home-shell.tsx` (~line 81), add to `HomeRecord`:

```ts
  hidden_fields: string[] | null;
```

(`get_home_view` returns it after Task 1's migration; until Lovable applies the migration, it comes back `undefined`, which the code below treats as nothing hidden.)

- [ ] **Step 2: Add copy keys**

In `src/lib/customer-locales.ts`, `homeRecordCopy`'s locale objects (en/es/ru/uk; grep `serviceRecord:` for the four blocks) each gain:

```
videoFromPro: "A video from your pro" / "Un video de tu profesional" / "Видео от вашего мастера" / "Відео від вашого майстра"
downloadVideo: "Download the video" / "Descargar el video" / "Скачать видео" / "Завантажити відео"
jobPhoto: "Job photo" / "Foto del trabajo" / "Фото работы" / "Фото роботи"
```

Add the three keys to the copy type at the top of the file as well (grep `workDone: string;`).

- [ ] **Step 3: Render the media block on the record page**

In `src/routes/home.records.$recordId.tsx`:

Imports:

```ts
import { listJobMedia, type JobMediaRow } from "@/lib/media";
import { RecordMedia } from "@/components/job-media";
import { track } from "@/lib/events";
```

State + fetch, after the invoices state (~line 41):

```ts
  const [media, setMedia] = useState<JobMediaRow[]>([]);
  useEffect(() => {
    if (!job) return;
    (async () => setMedia(await listJobMedia([job.id])))();
  }, [job]);
```

Note: `job` is a `useMemo` result; depending on `[job]` refires when the bundle reloads, and `listJobMedia` is cheap. Filter with the record's hidden fields, then render as the FIRST card inside `<div className="space-y-6">` (~line 115), above the details card. This is the payoff moment: coral eyebrow.

```tsx
        {(() => {
          const hidden = new Set(record.hidden_fields ?? []);
          const visible = media.filter((m) =>
            m.kind === "video" ? !hidden.has("video") : !hidden.has("photos"),
          );
          if (visible.length === 0) return null;
          return (
            <Card className="anim-fade-up d-1">
              <Eyebrow accent="coral">{copy.videoFromPro}</Eyebrow>
              <div className="mt-3">
                <RecordMedia
                  media={visible}
                  videoLabel={copy.videoFromPro}
                  downloadLabel={copy.downloadVideo}
                  photoAlt={copy.jobPhoto}
                  onVideoPlay={() => {
                    void track("homeowner", homeownerId, "video_watched", {
                      record_id: record.id,
                    });
                  }}
                />
              </div>
            </Card>
          );
        })()}
```

`homeownerId` comes from `useHomeownerGuard()`; add it to the destructuring at ~line 24. The existing cards below keep their `d-1`/`d-2` classes as they are.

- [ ] **Step 4: `has_video` on `record_viewed`**

In `src/routes/home.index.tsx`, the view handler (~lines 156-158) calls `mark_record_viewed` then logs `record_viewed`. The surrounding records come from the guard bundle. Change the logEvent call to include the flag, using the record's `job_id`:

```ts
            const rec = records.find((r) => r.id === recordId);
            const recMedia = rec ? await listJobMedia([rec.job_id]) : [];
            await supabase.rpc("mark_record_viewed", { p_record_id: recordId });
            await logEvent("system", "record_viewed", {
              role: "system",
              record_id: recordId,
              has_video: recMedia.some((m) => m.kind === "video"),
            });
```

Match the actual variable names in that scope (grep `mark_record_viewed`); import `listJobMedia` from `@/lib/media`.

- [ ] **Step 5: Verify and commit**

Run: `bun run lint && bun run build`. Expected: pass.

```bash
git add src/components/home-shell.tsx src/routes/home.records.\$recordId.tsx src/routes/home.index.tsx src/lib/customer-locales.ts
git commit -m "Homeowner record: media block with video_watched and has_video events"
```

---

### Task 7: Pro record detail - media block

**Files:**
- Modify: `src/routes/pro.records.$recordId.tsx`

**Interfaces:**
- Consumes: `listJobMedia`, `JobMediaRow`, `RecordMedia` as in Task 6. Pro side is English UI; labels are literals.

- [ ] **Step 1: Fetch and render**

Imports:

```ts
import { listJobMedia, type JobMediaRow } from "@/lib/media";
import { RecordMedia } from "@/components/job-media";
```

State next to the existing record state (~line 71):

```ts
  const [media, setMedia] = useState<JobMediaRow[]>([]);
```

In the load effect (~lines 92-106), after `setRecord(...)`:

```ts
      const jobId = (data as unknown as RecordRow | null)?.jobs?.id;
      if (jobId) setMedia(await listJobMedia([jobId]));
```

Render inside `<div className="max-w-xl space-y-4">` (~line 323), between the first Card (name/address/edit rows) and the HomesBrain AI card:

```tsx
        {media.length > 0 && (
          <Card className="anim-fade-up d-1 !p-4">
            <RecordMedia
              media={media}
              videoLabel="Walkthrough video"
              downloadLabel="Download the video"
              photoAlt="Job photo"
            />
          </Card>
        )}
```

- [ ] **Step 2: Verify and commit**

Run: `bun run lint && bun run build`. Expected: pass.

```bash
git add src/routes/pro.records.\$recordId.tsx
git commit -m "Pro record detail: show the job's video and photos"
```

---

### Task 8: Claim preview - media in the claim-exchange payload

**Files:**
- Modify: `supabase/functions/claim-exchange/index.ts`
- Modify: `src/routes/claim.$token.tsx`
- Modify: `src/lib/customer-locales.ts` (claim copy keys, same 3 keys/translations as Task 6, on the `claimCopy` object)

**Interfaces:**
- Consumes: `job_media` table (service-role client, no RLS concern); `records.hidden_fields`; `RecordMedia`.
- Produces: `Preview.media?: Array<{ kind: "photo" | "video"; url: string; thumbnail_url: string | null }>`.

- [ ] **Step 1: Edge function**

In `supabase/functions/claim-exchange/index.ts`, the preview loads records with a nested jobs select (~line 97). Add `id` to the nested jobs columns and `hidden_fields` to the records columns:

```ts
        .select(
          "id,created_at,hidden_fields,jobs(id,what_done,equipment_id,localized_content,homes(address))",
        )
```

Then, where `preview = { ... }` is built (~line 144), first fetch media (the function already has a service-role client; match its variable name, seen as the client used for the records select):

```ts
      const hiddenFields: string[] = Array.isArray(rec?.hidden_fields) ? rec.hidden_fields : [];
      let media: Array<{ kind: string; url: string; thumbnail_url: string | null }> = [];
      const jobId = (rec?.jobs as { id?: string } | null)?.id;
      if (jobId) {
        const { data: mediaRows } = await sb
          .from("job_media")
          .select("kind,url,thumbnail_url")
          .eq("job_id", jobId)
          .order("created_at", { ascending: true });
        media = (mediaRows ?? []).filter((m) =>
          m.kind === "video" ? !hiddenFields.includes("video") : !hiddenFields.includes("photos"),
        );
      }
```

Adjust `rec` / `sb` to the actual local names in that function, and add `media` to the preview object:

```ts
      preview = {
        // ...existing fields unchanged...
        media,
      };
```

- [ ] **Step 2: Claim page**

In `src/routes/claim.$token.tsx`, extend `Preview` (~line 30):

```ts
  media?: Array<{ kind: "photo" | "video"; url: string; thumbnail_url: string | null }> | null;
```

In `RecordPreview` (~line 74), render above the KV list (after the `<h1>`, before `<div className="mt-4 space-y-2">`):

```tsx
      {preview.media && preview.media.length > 0 && (
        <div className="mt-4">
          <RecordMedia
            media={preview.media.map((m, i) => ({
              id: String(i),
              job_id: "",
              kind: m.kind,
              url: m.url,
              thumbnail_url: m.thumbnail_url,
              duration_seconds: null,
              created_at: "",
            }))}
            videoLabel={copy.videoFromPro}
            downloadLabel={copy.downloadVideo}
            photoAlt={copy.jobPhoto}
          />
        </div>
      )}
```

Import `RecordMedia` from `@/components/job-media`. Add the three copy keys (`videoFromPro`, `downloadVideo`, `jobPhoto`, same translations as Task 6) to `claimCopy` locales and its type in `src/lib/customer-locales.ts`.

- [ ] **Step 3: Verify and commit**

Run: `bun run lint && bun run build`. Expected: pass.

```bash
git add supabase/functions/claim-exchange/index.ts src/routes/claim.\$token.tsx src/lib/customer-locales.ts
git commit -m "Claim preview: include the record's video and photos"
```

---

### Task 9: End-to-end verification

No code. The migration only takes effect once Lovable syncs and applies it; if the remote DB does not have `job_media` yet, the UI degrades silently (no media, no crash), which is itself worth confirming.

- [ ] **Step 1: Static checks**

Run: `bun run lint && bun run build`. Expected: clean.

- [ ] **Step 2: Manual flow (dev server, phone-sized viewport)**

Run `bun dev` and walk the loop:

1. `/pro/jobs/new`: log a job, attach a short video. Confirm the progress bar runs immediately, "Video added" appears, and Retake/Remove work.
2. Attach a unit photo; confirm the scan still fills fields.
3. Review step: Video and Photo rows appear with include/exclude toggles; submit.
4. Confirm `job_media` rows exist (Supabase table editor or the pro record page).
5. `/pro/records/:id`: video plays, photo strip shows.
6. Homeowner side (`/home`, open the record): media card with coral eyebrow renders above details; playing fires `video_watched` in `events`; opening from the list logs `record_viewed` with `has_video: true`.
7. Toggle-off test: log a second job with the video excluded in review; homeowner page and claim preview must not show it.
8. `events` table: `record_sent` rows carry `has_video`.

- [ ] **Step 3: Wrap up**

Update the Screen inventory status in Notion (log-a-job, record pages: video shipped). Ask the user before pushing.
