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
