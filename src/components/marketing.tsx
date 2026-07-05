import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Btn } from "@/lib/ui";
import { Logo, LogoMark } from "@/components/svg";

/* Shared shell for the public marketing site: sticky header, mobile menu,
   full footer, and the SEO head helper. Every no-login page renders inside this. */

/* Canonical origin for og:url / canonical links. Update when the production
   domain changes - this is the only place it lives. */
export const SITE_URL = "https://homesbrain.com";

export function marketingHead(opts: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}) {
  const url = `${SITE_URL}${opts.path}`;
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
      ...(opts.noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

const NAV_LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/for-pros", label: "For pros" },
  { to: "/for-homeowners", label: "For homeowners" },
  { to: "/pricing", label: "Pricing" },
  { to: "/partners", label: "Partners" },
] as const;

const FOOTER_GROUPS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/how-it-works", label: "How it works" },
      { to: "/pricing", label: "Pricing" },
      { to: "/security", label: "Security" },
    ],
  },
  {
    title: "Audiences",
    links: [
      { to: "/for-pros", label: "For pros" },
      { to: "/for-homeowners", label: "For homeowners" },
      { to: "/partners", label: "Partners" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/blog", label: "Guides" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
      { to: "/messaging-terms", label: "Messaging terms" },
    ],
  },
];

export function MarketingShell({
  children,
  mobileCta = { label: "Start free", to: "/pro/signup", variant: "indigo" as const },
}: {
  children: ReactNode;
  /* Fixed thumb-zone CTA shown only on small screens. Pass null to hide. */
  mobileCta?: { label: string; to: string; variant: "indigo" | "coral" } | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the menu on navigation and keep the page from scrolling behind it.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="HomesBrain home"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden min-[880px]:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm font-semibold text-muted hover:text-ink transition-colors px-3 py-2 rounded-full"
                activeProps={{ className: "text-ink" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden min-[880px]:flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-semibold text-muted hover:text-ink transition-colors px-3 py-2"
            >
              Log in
            </Link>
            <Link to="/pro/signup">
              <Btn variant="indigo" size="sm">
                Start free
              </Btn>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="pressable min-[880px]:hidden flex items-center justify-center w-11 h-11 rounded-full hover:bg-soft transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <g
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="transition-transform duration-200"
              >
                {menuOpen ? (
                  <>
                    <path d="M5 5l10 10" />
                    <path d="M15 5L5 15" />
                  </>
                ) : (
                  <>
                    <path d="M3 6h14" />
                    <path d="M3 10h14" />
                    <path d="M3 14h14" />
                  </>
                )}
              </g>
            </svg>
          </button>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div
            id="mobile-menu"
            className="min-[880px]:hidden anim-fade-in fixed inset-x-0 top-16 bottom-0 z-40 bg-background flex flex-col"
          >
            <nav aria-label="Main" className="anim-fade-up flex-1 overflow-y-auto px-5 py-4">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="flex items-center justify-between min-h-12 px-3 rounded-xl text-base font-semibold text-ink hover:bg-soft transition-colors"
                  activeProps={{ className: "text-indigo" }}
                >
                  {l.label}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    aria-hidden="true"
                    className="text-muted"
                  >
                    <path
                      d="M5 3l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ))}
            </nav>
            {/* Thumb-zone actions pinned to the bottom of the menu */}
            <div
              className="border-t border-line px-5 py-4 flex flex-col gap-2"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              <Link to="/pro/signup" className="w-full">
                <Btn variant="indigo" size="lg" className="w-full">
                  Start free, no card
                </Btn>
              </Link>
              <Link to="/login" className="w-full">
                <Btn variant="secondary" size="lg" className="w-full">
                  Log in
                </Btn>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Fixed thumb-reachable CTA on mobile. Footer padding below makes room for it. */}
      {mobileCta && !menuOpen && (
        <div
          className="min-[880px]:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-background/92 backdrop-blur-md px-5 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Link to={mobileCta.to} className="block">
            <Btn variant={mobileCta.variant} size="lg" className="w-full">
              {mobileCta.label}
            </Btn>
          </Link>
        </div>
      )}

      <footer
        className={`border-t border-line bg-soft ${mobileCta ? "pb-24 min-[880px]:pb-0" : ""}`}
      >
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-10">
            <div className="col-span-2 md:col-span-1">
              <Logo size={24} />
              <p className="mt-3 text-sm text-muted">The living record for every home.</p>
            </div>
            {FOOTER_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="eyebrow text-ink/60">{g.title}</div>
                <ul className="mt-3 space-y-1">
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="inline-flex items-center min-h-9 text-sm font-medium text-muted hover:text-ink transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
            <div className="flex items-center gap-2">
              <LogoMark size={18} />
              <span>© {new Date().getFullYear()} HomesBrain, Inc.</span>
            </div>
            <span>The living record for every home.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Dual- or single-CTA closing band used at the bottom of marketing pages. */
export function CtaBand({
  eyebrow,
  accent = "indigo",
  title,
  sub,
  children,
}: {
  eyebrow: string;
  accent?: "indigo" | "coral" | "amber";
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  const accentText: Record<string, string> = {
    indigo: "text-indigo",
    coral: "text-coral",
    amber: "text-amber",
  };
  return (
    <section className="border-t border-line bg-soft">
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className={`eyebrow ${accentText[accent]}`}>{eyebrow}</div>
        <h2 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink">{title}</h2>
        {sub && <p className="mt-4 text-muted max-w-xl mx-auto">{sub}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </section>
  );
}
