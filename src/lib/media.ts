import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Job media: the pro's walkthrough video and unit photos, stored in the
   private job-media bucket with one job_media row per object.

   job_media is not in the Lovable-generated types.ts yet (it regenerates
   from migrations on the Lovable side), so this module goes through an
   untyped view of the client. Keep every job_media query in this file so
   the cast lives in one place. */
const db = supabase as unknown as SupabaseClient;

const BUCKET = "job-media";

export type JobMediaKind = "photo" | "video";

/* url/thumbnail_url hold storage paths; sign with signJobMedia before
   rendering. */
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
}): Promise<{ path: string }> {
  const path = `${opts.proId}/${crypto.randomUUID()}.${opts.ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error("Couldn't start the upload. Try again.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl);
    xhr.timeout = 180000;
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Check your connection and try again."));
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
  return { path };
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

/* job_media.url/thumbnail_url are storage paths, not URLs (see JobMediaRow).
   Sign every path in one batch call and return only rows whose main url
   signed successfully; a thumbnail that failed to sign just becomes null.
   A total batch failure returns [], which callers already render as
   "no media" (see listJobMedia). */
export async function signJobMedia(
  rows: JobMediaRow[],
  ttlSeconds = 86400,
): Promise<JobMediaRow[]> {
  if (rows.length === 0) return [];
  const paths = new Set<string>();
  for (const row of rows) {
    paths.add(row.url);
    if (row.thumbnail_url) paths.add(row.thumbnail_url);
  }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(Array.from(paths), ttlSeconds);
  if (error || !data) return [];

  const signed = new Map<string, string>();
  for (const item of data) {
    if (item.error || !item.path || !item.signedUrl) continue;
    signed.set(item.path, item.signedUrl);
  }

  const out: JobMediaRow[] = [];
  for (const row of rows) {
    const url = signed.get(row.url);
    if (!url) continue;
    const thumbnail_url = row.thumbnail_url ? (signed.get(row.thumbnail_url) ?? null) : null;
    out.push({ ...row, url, thumbnail_url });
  }
  return out;
}
