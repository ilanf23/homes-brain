import type { ReactNode } from "react";
import { MarketingShell } from "@/components/marketing";

/* Shared layout for the legal pages (/privacy, /terms, /messaging-terms).
   Every legal page carries the draft banner until attorney review clears it. */

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <MarketingShell mobileCta={null}>
      <div className="mx-auto max-w-3xl px-5 py-14">
        {/* Draft banner - compliance red role. Remove only after attorney sign-off. */}
        <div
          role="note"
          className="rounded-2xl border border-red/25 bg-redbg px-5 py-4 flex items-start gap-3"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-red"
          >
            <path
              d="M9 2 16.5 15.5H1.5L9 2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M9 7v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="9" cy="13" r="0.9" fill="currentColor" />
          </svg>
          <div>
            <div className="text-sm font-bold text-red uppercase tracking-[0.08em]">
              Draft: pending attorney review
            </div>
            <p className="mt-1 text-sm text-red/90">
              This document is a structured draft and is not final legal advice. It will be reviewed
              by counsel before launch.
            </p>
          </div>
        </div>

        <h1 className="mt-10 text-4xl sm:text-5xl tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>
        <p className="mt-6 text-muted">{intro}</p>

        <div className="mt-10 space-y-10">{children}</div>

        <div className="mt-14 rounded-2xl border border-line bg-soft px-5 py-4 text-sm text-muted">
          Questions about this document? Contact us at{" "}
          <a href="mailto:legal@homesbrain.com" className="font-semibold text-ink hover:underline">
            legal@homesbrain.com
          </a>
          .
        </div>
      </div>
    </MarketingShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
