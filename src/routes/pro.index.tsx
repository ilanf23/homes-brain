import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/geo";
import { ProPageSkeleton, ProShell, useProGuard } from "@/components/pro-shell";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "HomesBrain" }] }),
  component: ProHome,
});

function timeOfDayGreetingKey():
  | "pi.greeting.morning"
  | "pi.greeting.afternoon"
  | "pi.greeting.evening" {
  const h = new Date().getHours();
  if (h < 12) return "pi.greeting.morning";
  if (h < 18) return "pi.greeting.afternoon";
  return "pi.greeting.evening";
}

function ProHome() {
  const t = useT();
  const { proId, pro } = useProGuard();
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [locationText, setLocationText] = useState<string | null>(null);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("pro_id", proId);
      if (cancelled) return;
      setJobCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (r?.address) setLocationText(r.address);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  if (!pro) {
    return (
      <ProShell pro={pro} active="home" hideMobileCta>
        <ProPageSkeleton variant="list" />
      </ProShell>
    );
  }

  const firstName = (pro.owner_first_name?.trim() || pro.business?.split(" ")[0] || "").trim();
  const greetingWord = t(timeOfDayGreetingKey());
  const greeting = firstName ? `${greetingWord}, ${firstName}.` : `${greetingWord}.`;

  return (
    <ProShell pro={pro} active="home" hideMobileCta>
      <div className="anim-fade-up mb-2">
        <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">{greeting}</h1>
        {locationText && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper border border-line px-3 py-1.5 text-xs text-muted">
            <MapPin size={13} className="text-indigo" />
            <span>
              {t("pi.youreAt")} <span className="text-ink font-semibold">{locationText}</span>
            </span>
          </div>
        )}
      </div>

      <Link to="/pro/jobs/new" className="anim-fade-up d-1 block mt-6">
        <button
          type="button"
          className="pressable w-full rounded-3xl bg-indigo text-white text-left px-6 py-7 sm:px-8 sm:py-9 shadow-[0_18px_40px_-14px_rgba(71,63,176,0.55)] hover:shadow-[0_22px_48px_-14px_rgba(71,63,176,0.65)] transition-shadow"
        >
          <div className="flex items-center gap-5">
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 shrink-0">
              <Plus size={32} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl font-bold leading-tight">{t("pi.logJob")}</div>
              <div className="mt-1 text-sm sm:text-base text-white/85">
                {jobCount === 0 ? t("pi.logJob.subFirst") : t("pi.logJob.sub")}
              </div>
            </div>
          </div>
        </button>
      </Link>

      <div className="anim-fade-up d-2 mt-8 mb-4">
        <Link
          to="/pro/dashboard"
          className="pressable flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm text-muted hover:text-ink hover:bg-paper transition-colors"
        >
          <span>{t("pro.nav.dashboard")}</span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </ProShell>
  );
}
