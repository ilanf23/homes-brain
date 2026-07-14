import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import { useT } from "@/lib/i18n";

type Hit = {
  kind: "customer" | "record";
  id: string;
  primary: string;
  secondary: string | null;
};

/* Join shapes come back loosely typed from the generated client. */
type JobHit = {
  id: string;
  what_done: string | null;
  homes: { address: string } | null;
  records: { id: string }[] | null;
};

/* Top-bar combobox: finds the pro's own customers (name/phone) and recent
   records (home address). Debounced 250ms, min 2 chars, max 6 rows.
   Failures resolve to empty groups; search must never break the shell. */
export function GlobalSearch({ proId }: { proId: string | null }) {
  const navigate = useNavigate();
  const t = useT();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!proId || term.length < 2) {
      setHits([]);
      setOpen(false);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      /* Commas and parens would break PostgREST or() syntax. */
      const safe = term.replace(/[,()]/g, " ").trim();
      const like = `%${safe}%`;
      const [cust, jobs] = await Promise.all([
        supabase
          .from("customers")
          .select("id,name,phone")
          .eq("pro_id", proId)
          .or(`name.ilike.${like},phone.ilike.${like}`)
          .limit(4),
        supabase
          .from("jobs")
          .select("id,what_done,homes!inner(address),records(id)")
          .eq("pro_id", proId)
          .ilike("homes.address", like)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      const next: Hit[] = [];
      for (const c of cust.data ?? []) {
        next.push({ kind: "customer", id: c.id, primary: c.name, secondary: c.phone });
      }
      for (const j of (jobs.data ?? []) as unknown as JobHit[]) {
        const recordId = j.records?.[0]?.id;
        if (!recordId) continue;
        next.push({
          kind: "record",
          id: recordId,
          primary: j.homes?.address ?? t("pro.nav.records"),
          secondary: j.what_done,
        });
      }
      setHits(next.slice(0, 6));
      setSearched(true);
      setOpen(true);
      setActive(-1);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, proId, t]);

  function go(hit: Hit) {
    setOpen(false);
    setQ("");
    setSearched(false);
    inputRef.current?.blur();
    logEvent(proId, "search_used", { kind: hit.kind, q: q.trim() });
    if (hit.kind === "customer") {
      navigate({ to: "/pro/customers/$customerId", params: { customerId: hit.id } });
    } else {
      navigate({ to: "/pro/records/$recordId", params: { recordId: hit.id } });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && active >= 0 && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const groups: { label: string; kind: Hit["kind"]; icon: typeof User }[] = [
    { label: t("pro.nav.customers"), kind: "customer", icon: User },
    { label: t("pro.nav.records"), kind: "record", icon: FileText },
  ];

  return (
    <div className="relative flex-1 max-w-[420px]">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => searched && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="pro-search-listbox"
        aria-label={t("pro.search.label")}
        placeholder={t("pro.search.placeholder")}
        className="w-full h-10 rounded-full border border-line bg-soft pl-9 pr-4 text-sm text-ink placeholder:text-muted outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10 hover:border-ink/30"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id="pro-search-listbox"
            role="listbox"
            aria-label={t("pro.search.results")}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-24px_rgba(22,22,15,0.3)] overflow-hidden"
          >
            {hits.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">{t("pro.search.noMatches")}</p>
            ) : (
              groups.map(({ label, kind, icon: Icon }) => {
                const rows = hits.filter((h) => h.kind === kind);
                if (rows.length === 0) return null;
                return (
                  <div key={kind} className="py-1.5 border-b border-line last:border-b-0">
                    <div className="px-4 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                      {label}
                    </div>
                    {rows.map((h) => {
                      const idx = hits.indexOf(h);
                      return (
                        <button
                          key={`${h.kind}-${h.id}`}
                          role="option"
                          aria-selected={idx === active}
                          onClick={() => go(h)}
                          onMouseEnter={() => setActive(idx)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-left ${
                            idx === active ? "bg-soft" : ""
                          }`}
                        >
                          <Icon size={15} className="text-muted shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink truncate">
                              {h.primary}
                            </span>
                            {h.secondary && (
                              <span className="block text-xs text-muted truncate">
                                {h.secondary}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
