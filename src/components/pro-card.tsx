import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, Globe, Star, ShieldCheck, MapPin } from "lucide-react";
import { Btn, Card, Pill } from "@/lib/ui";
import type { Pro, TradeKey } from "@/lib/pros";
import { TRADE_LABELS } from "@/lib/pros";
import { ContactProModal } from "@/components/contact-pro-modal";

/* Shared pro card used by /pros directory and the guide "Pros who do this work
   near you" section. Teal highlights (the pro subbrand) are reserved for verified badge + primary
   CTA - listing pros stay neutral so we do not visually endorse them. */

export function ProCard({
  pro,
  compact = false,
  source = "directory",
  trade,
}: {
  pro: Pro;
  compact?: boolean;
  source?: "directory" | "pro_profile" | "guide";
  trade?: TradeKey;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const tradeLabels = useMemo(
    () => pro.trades.map((t) => TRADE_LABELS[t]),
    [pro.trades],
  );

  return (
    <Card lift className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/pro/$slug"
            params={{ slug: pro.slug }}
            className="text-lg font-bold text-ink leading-tight hover:text-tealdark transition-colors block truncate"
          >
            {pro.name}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <MapPin size={12} strokeWidth={2} />
            <span>{pro.city}, FL</span>
          </div>
        </div>
        {pro.verified && (
          <Pill accent="teal">
            <ShieldCheck size={11} strokeWidth={2.5} />
            <span className="ml-0.5">Verified</span>
          </Pill>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tradeLabels.map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-semibold text-ink/80"
          >
            {label}
          </span>
        ))}
      </div>

      {pro.googleRating != null && (
        <a
          href={pro.googlePlaceUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink hover:text-tealdark transition-colors w-fit"
        >
          <Star size={14} strokeWidth={2} className="fill-amber text-amber" />
          <span className="font-semibold tnum">{pro.googleRating.toFixed(1)}</span>
          {pro.googleReviewCount != null && (
            <span className="text-muted tnum">({pro.googleReviewCount})</span>
          )}
          <span className="text-xs text-muted">Google</span>
        </a>
      )}

      {!compact && (
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          <a
            href={`tel:${pro.phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex items-center gap-1.5 text-ink hover:text-tealdark transition-colors w-fit"
          >
            <Phone size={14} strokeWidth={2} />
            <span className="tnum">{pro.phone}</span>
          </a>
          {pro.website && (
            <a
              href={pro.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink hover:text-tealdark transition-colors w-fit"
            >
              <Globe size={14} strokeWidth={2} />
              <span>Website</span>
            </a>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 pt-4 border-t border-line mt-auto">
        <Btn
          variant="teal"
          size="sm"
          onClick={() => setContactOpen(true)}
          className="flex-1"
        >
          Contact pro
        </Btn>
        <Link
          to="/pro/$slug"
          params={{ slug: pro.slug }}
          className="text-xs font-semibold text-indigo hover:underline whitespace-nowrap"
        >
          Profile →
        </Link>
      </div>

      <ContactProModal
        pro={pro}
        open={contactOpen}
        onOpenChange={setContactOpen}
        source={source}
        trade={trade}
      />
    </Card>
  );
}
