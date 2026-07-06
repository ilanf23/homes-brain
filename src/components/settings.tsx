import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Card, Eyebrow, Input } from "@/lib/ui";
import { logEvent } from "@/lib/hb";
import type { ReactNode } from "react";

/* Shared building blocks for /pro/settings and /home/settings. */

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* Anchor card: gives each section a stable #id the section nav can jump to.
   scroll-mt clears the sticky mobile header. */
export function SettingsSection({
  id,
  eyebrow,
  accent = "indigo" as const,
  delay,
  children,
}: {
  id: string;
  eyebrow: string;
  accent?: "indigo" | "red";
  delay?: 1 | 2 | 3 | 4;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-label={eyebrow} className="scroll-mt-28 md:scroll-mt-8">
      <Card className={delay ? `anim-fade-up d-${delay}` : ""}>
        <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
        {children}
      </Card>
    </section>
  );
}

/* Desktop-only jump nav. On mobile the sections simply stack. */
export function SettingsNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      className="hidden lg:block sticky top-10 self-start space-y-0.5"
      aria-label="Settings sections"
    >
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          className="pressable block rounded-xl px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-ink hover:bg-soft transition-colors"
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}

/* Guarded delete-account flow: expand → type DELETE → server-side edge function.
   The edge function (service role) is Lovable-owned; until it ships, the error
   path tells the truth and nothing is deleted. */
export function DeleteAccountRow({
  actor,
  onDeleted,
}: {
  actor: string; // "pro:<id>" | "homeowner:<id>"
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const armed = typed.trim().toUpperCase() === "DELETE";

  async function run() {
    if (!armed || busy) return;
    setBusy(true);
    setErr(null);
    await logEvent(actor, "delete_account_requested", {});
    const { error } = await supabase.functions.invoke("delete-account", { body: { actor } });
    if (error) {
      setErr(
        "Deletion isn't available yet - it runs server-side and ships with real sign-in. Nothing was deleted.",
      );
      setBusy(false);
      return;
    }
    onDeleted();
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4 pt-3.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Delete account</div>
          <div className="text-xs text-muted mt-0.5">
            Permanently removes your account and data. This can't be undone.
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="pressable shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-red bg-redbg hover:bg-red hover:text-white transition-colors"
        >
          Delete…
        </button>
      </div>
    );
  }

  return (
    <div className="anim-fade-in mt-3.5 rounded-xl border border-red/25 bg-redbg/60 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-red shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm text-ink">
          <span className="font-semibold">This permanently deletes your account.</span> Records
          already sent to the other side of a job stay on their record, anonymized.
        </div>
      </div>
      <label className="block mt-3">
        <div className="text-xs font-semibold text-ink mb-1.5">
          Type <span className="font-mono">DELETE</span> to confirm
        </div>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          aria-label="Type DELETE to confirm"
        />
      </label>
      {err && (
        <div role="alert" className="anim-fade-in mt-3 text-sm text-red">
          {err}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={run}
          disabled={!armed || busy}
          className="pressable rounded-full px-4 py-2 text-sm font-semibold bg-red text-white hover:bg-red/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
        <Btn
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setErr(null);
          }}
        >
          Cancel
        </Btn>
      </div>
    </div>
  );
}
