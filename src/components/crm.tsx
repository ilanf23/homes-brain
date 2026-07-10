import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronUp, Pencil, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn, Card, Input, PhoneInput } from "@/lib/ui";
import { formatDate, formatPhone } from "@/lib/hb";

/* HubSpot-style CRM primitives, HomesBrain skin. Shared by the customers
   index (table, filters) and the customer record page (three columns). */

export function UnderlineTabs({
  tabs,
  active,
  onChange,
  onClose,
}: {
  tabs: { key: string; label: string; count?: number; closable?: boolean }[];
  active: string;
  onChange: (key: string) => void;
  onClose?: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-line overflow-x-auto no-scrollbar" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`pressable shrink-0 inline-flex items-center px-3.5 py-2 text-sm -mb-px border-b-2 transition-colors ${
            active === t.key
              ? "border-indigo text-indigo font-bold"
              : "border-transparent text-muted font-semibold hover:text-ink"
          }`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className="ml-1.5 text-xs tnum opacity-70">{t.count}</span>
          )}
          {t.closable && onClose && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Remove ${t.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.key);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onClose(t.key);
                }
              }}
              className="ml-1.5 p-0.5 rounded text-muted hover:text-ink hover:bg-soft"
            >
              <X size={12} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* Right slide-in panel (HubSpot preview / edit-columns pattern). */
export function SlideOver({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-paper border-l border-line shadow-[0_0_48px_-12px_rgba(22,22,15,0.4)] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="eyebrow text-indigo">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="pressable p-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function CollapsibleCard({
  title,
  count,
  action,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="pressable flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          {open ? (
            <ChevronDown size={14} className="text-muted shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-muted shrink-0" />
          )}
          <span className="eyebrow text-indigo truncate">
            {title}
            {typeof count === "number" ? ` (${count})` : ""}
          </span>
        </button>
        {action && <div className="shrink-0 flex items-center gap-2.5">{action}</div>}
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

export function PropertyRow({
  label,
  value,
  display,
  onSave,
}: {
  label: string;
  value?: string;
  display?: ReactNode;
  onSave?: (v: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!onSave) return;
    setSaving(true);
    const ok = await onSave(draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div className="group py-2.5 border-b border-line last:border-b-0">
      <div className="text-xs text-muted">{label}</div>
      {editing ? (
        <div className="mt-1.5 flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            aria-label={label}
            className="!min-h-9 !py-1.5 !text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <Btn size="sm" variant="indigo" loading={saving} onClick={save}>
            Save
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Btn>
        </div>
      ) : (
        <div className="mt-0.5 flex items-center justify-between gap-2 min-h-6">
          <div className="text-sm font-semibold text-ink min-w-0 truncate">
            {display ?? (value || <span className="text-muted font-normal">Not set</span>)}
          </div>
          {onSave && (
            <button
              onClick={() => {
                setDraft(value ?? "");
                setEditing(true);
              }}
              aria-label={`Edit ${label.toLowerCase()}`}
              className="pressable shrink-0 p-1.5 rounded-lg text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink hover:bg-soft transition-opacity"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ActionCircle({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  title,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={label}
        className="pressable w-11 h-11 rounded-full bg-indigobg text-indigo flex items-center justify-center transition-colors hover:bg-indigo hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigobg disabled:hover:text-indigo"
      >
        <Icon size={17} />
      </button>
      <span className="text-[11px] font-semibold text-muted">{label}</span>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-semibold text-ink outline-none hover:border-ink/30 focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: string;
  sort: { key: string; dir: "asc" | "desc" };
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th className={`px-3 py-2.5 text-left font-normal ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`pressable inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.08em] uppercase ${
          active ? "text-indigo" : "text-muted hover:text-ink"
        }`}
      >
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
}

export type TimelineEntry = {
  id: string;
  kind: "note" | "job" | "invoice" | "nudge";
  icon: LucideIcon;
  title: string;
  at: string;
  preview?: string;
  body?: ReactNode;
  action?: ReactNode;
  onDelete?: () => void;
};

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/* Entries must arrive sorted desc by `at`; this only groups by month. */
export function Timeline({ entries, empty }: { entries: TimelineEntry[]; empty?: ReactNode }) {
  if (entries.length === 0) return <>{empty}</>;
  const groups: { label: string; items: TimelineEntry[] }[] = [];
  for (const e of entries) {
    const label = monthLabel(e.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="eyebrow text-muted mb-2">{g.label}</div>
          <div className="space-y-2">
            {g.items.map((e) => (
              <TimelineItem key={`${e.kind}-${e.id}`} entry={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const [open, setOpen] = useState(false);
  const Icon = entry.icon;
  const expandable = Boolean(entry.body || entry.onDelete);
  return (
    <Card className="!p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-indigobg text-indigo flex items-center justify-center shrink-0">
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-ink text-sm truncate">{entry.title}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted tnum">{formatDate(entry.at)}</span>
              {expandable && (
                <button
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  aria-label={open ? "Collapse" : "Expand"}
                  className="pressable p-1 rounded-lg text-muted hover:text-ink hover:bg-soft"
                >
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>
          {!open && entry.preview && (
            <div className="mt-0.5 text-sm text-muted truncate">{entry.preview}</div>
          )}
          {open && (
            <div className="mt-2 text-sm text-ink whitespace-pre-wrap">
              {entry.body ?? entry.preview}
            </div>
          )}
          {(entry.action || (open && entry.onDelete)) && (
            <div className="mt-2 flex items-center gap-3">
              {entry.action}
              {open && entry.onDelete && (
                <button
                  onClick={entry.onDelete}
                  className="text-xs font-semibold text-red hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
