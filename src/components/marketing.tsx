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
  geo?: boolean; // add St. Johns County, FL geo meta
}) {
  const url = `${SITE_URL}${opts.path}`;
  const geoMeta = opts.geo
    ? [
        { name: "geo.region", content: "US-FL" },
        { name: "geo.placename", content: "St. Johns County, Florida" },
        { name: "geo.position", content: "29.90;-81.40" },
        { name: "ICBM", content: "29.90, -81.40" },
        { property: "og:locale", content: "en_US" },
      ]
    : [];
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
      ...geoMeta,
      ...(opts.noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}


const NAV_LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/for-pros", label: "For pros" },
  { to: "/pros", label: "Find a pro" },
] as const;

/* Homeowner-oriented routes get the coral homeowner CTA. Everything else
   (including /, /for-pros, /how-it-works) gets the teal pro CTA. */
function isHomeownerRoute(pathname: string): boolean {
  if (pathname.startsWith("/home")) return true;
  return (
    pathname === "/for-homeowners" ||
    pathname === "/make-it-last" ||
    pathname.startsWith("/make-it-last/") ||
    pathname === "/pros" ||
    pathname.startsWith("/pros/")
  );
}


type FooterLink = {
  to: string;
  label: string;
  /* Optional per-link accent so Make it last (coral) and Find a pro (teal)
     stand out as the two hero destinations, matching the header subbrands. */
  accent?: "coral" | "teal";
};

const FOOTER_GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Explore",
    links: [
      { to: "/for-pros", label: "For pros", accent: "teal" },
      { to: "/make-it-last", label: "Make it last", accent: "coral" },
      { to: "/pros", label: "Find a pro" },
      { to: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/for-homeowners", label: "For homeowners" },
      { to: "/partners", label: "Partners" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy and consent" },
      { to: "/terms", label: "Terms" },
      { to: "/messaging-terms", label: "Messaging terms" },
      /* No dedicated CCPA page yet - the privacy page covers this today. */
      { to: "/privacy", label: "Do Not Sell or Share My Information" },
    ],
  },
];

export function MarketingShell({
  children,
  mobileCta,
}: {
  children: ReactNode;
  /* Fixed thumb-zone CTA shown only on small screens. Pass null to hide.
     If omitted, the shell falls back to the persistent primary CTA which
     is teal (Claim your profile) on pro-oriented routes and coral
     (Get my record) on homeowner-oriented routes. */
  mobileCta?: { label: string; to: string; variant: "indigo" | "coral" | "teal" } | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  /* The single persistent primary CTA, shown in the desktop header and the
     mobile overlay pinned bottom. Pro-first by default; homeowner routes
     get the homeowner CTA. */
  const primaryCta: { label: string; to: string; variant: "coral" | "teal" } =
    isHomeownerRoute(pathname)
      ? { label: "Get my record", to: "/home/signup", variant: "coral" }
      : { label: "Claim your profile", to: "/pro/signup", variant: "teal" };

  const resolvedMobileCta =
    mobileCta === undefined ? { ...primaryCta } : mobileCta;


  // Close the menu on navigation and keep the page from scrolling behind it.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Frosted-on-scroll: transparent at the very top, translucent glass once
  // the user has scrolled even a little. Passive listener + rAF-throttled
  // read so this never fights the scroll thread.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Quiet mobile links listed explicitly below the two hero destination cards.
  const quietMobileLinks = [
    { to: "/how-it-works", label: "How it works" },
    { to: "/pros", label: "Find a pro" },
    { to: "/make-it-last", label: "Make it last" },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header
        className={`sticky top-0 z-40 transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ${
          scrolled
            ? "bg-background/70 supports-[backdrop-filter]:bg-background/55 backdrop-blur-xl border-b border-line/70 shadow-[0_1px_0_rgba(22,22,15,0.02)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
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
            {NAV_LINKS.map((l) => {
              const isForPros = l.to === "/for-pros";
              const emphasis = isForPros
                ? "text-sm font-bold text-teal hover:text-tealdark transition-colors px-3 py-2 rounded-full"
                : "text-sm font-semibold text-muted hover:text-ink transition-colors px-3 py-2 rounded-full";
              const activeClass = isForPros ? "text-tealdark" : "text-ink";
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={emphasis}
                  activeProps={{ className: activeClass }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions: one primary CTA (pathname-derived), one quiet log-in link */}
          <div className="hidden min-[880px]:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              Log in
            </Link>
            <Link to={primaryCta.to}>
              <Btn variant={primaryCta.variant} size="sm">
                {primaryCta.label}
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
            className="pressable min-[880px]:hidden flex items-center justify-center w-11 h-11 rounded-full hover:bg-soft/70 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <g
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="transition-transform duration-200"
              >
                <path d="M3 6h14" />
                <path d="M3 10h14" />
                <path d="M3 14h14" />
              </g>
            </svg>
          </button>
        </div>
      </header>

      {/* Full-screen mobile overlay. Lives outside <header> so it can cover
          the whole viewport (including the top bar) with a single close X. */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="min-[880px]:hidden fixed inset-0 z-50 flex flex-col bg-background anim-fade-in"
        >
          {/* Overlay header: logo + close */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-line/70">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              aria-label="HomesBrain home"
              className="flex items-center gap-2.5 shrink-0"
            >
              <Logo />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="pressable flex items-center justify-center w-11 h-11 rounded-full hover:bg-soft transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M5 5l10 10" />
                  <path d="M15 5L5 15" />
                </g>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
            {/* Hero destinations */}
            <div className="space-y-3 anim-fade-up">
              <Link
                to="/for-pros"
                onClick={() => setMenuOpen(false)}
                className="pressable block rounded-3xl bg-tealbg/70 px-5 py-5 hover:bg-tealbg transition-colors"
              >
                <div className="text-[26px] leading-tight font-extrabold tracking-tight text-tealdark">
                  For pros
                </div>
                <div className="mt-1 text-sm text-ink/70">
                  Claim your profile and turn every job into a review.
                </div>
              </Link>
              <Link
                to="/for-homeowners"
                onClick={() => setMenuOpen(false)}
                className="pressable block rounded-3xl bg-coralbg/70 px-5 py-5 hover:bg-coralbg transition-colors"
              >
                <div className="text-[26px] leading-tight font-extrabold tracking-tight text-coraldark">
                  For homeowners
                </div>
                <div className="mt-1 text-sm text-ink/70">
                  Get the living record for your home.
                </div>
              </Link>
            </div>

            {/* Divider */}
            <div className="my-6 h-px bg-line" />

            {/* Quiet items */}
            <nav aria-label="More" className="anim-fade-up flex flex-col">
              {quietMobileLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between min-h-12 py-2 text-base font-medium text-muted hover:text-ink transition-colors"
                >
                  {l.label}
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="opacity-60">
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
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between min-h-12 py-2 text-base font-medium text-muted hover:text-ink transition-colors"
              >
                Log in
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="opacity-60">
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
            </nav>
          </div>

          {/* Pinned bottom CTA */}
          <div
            className="border-t border-line px-5 py-4 bg-background"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <Link
              to={primaryCta.to}
              onClick={() => setMenuOpen(false)}
              className="block w-full"
            >
              <Btn variant={primaryCta.variant} size="lg" className="w-full">
                {primaryCta.label}
              </Btn>
            </Link>
          </div>
        </div>
      )}


      <main className="flex-1">{children}</main>

      {/* Fixed thumb-reachable CTA on mobile. Footer padding below makes room for it. */}
      {resolvedMobileCta && !menuOpen && (
        <div
          className="min-[880px]:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-background/92 backdrop-blur-md px-5 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Link to={resolvedMobileCta.to} className="block">
            <Btn variant={resolvedMobileCta.variant} size="lg" className="w-full">
              {resolvedMobileCta.label}
            </Btn>
          </Link>
        </div>
      )}

      <footer
        className={`border-t border-line bg-soft ${resolvedMobileCta ? "pb-24 min-[880px]:pb-0" : ""}`}
      >
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">

          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Logo size={26} />
              <p className="mt-5 text-xl sm:text-2xl font-bold tracking-tight text-ink leading-tight">
                Every home remembers.
              </p>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                The living record for every home.
              </p>
              <p className="mt-3 text-xs text-muted">
                Made for Florida homes. St. Johns County first.
              </p>
            </div>
            {FOOTER_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="eyebrow text-ink/60">{g.title}</div>
                <ul className="mt-4 space-y-1">
                  {g.links.map((l) => {
                    const accentClass =
                      l.accent === "coral"
                        ? "text-coraldark font-semibold hover:text-coraldark/80"
                        : l.accent === "teal"
                          ? "text-tealdark font-semibold hover:text-tealdark/80"
                          : "text-muted font-medium hover:text-ink";
                    return (
                      <li key={`${g.title}-${l.label}`}>
                        <Link
                          to={l.to}
                          className={`inline-flex items-center min-h-9 text-sm transition-colors ${accentClass}`}
                        >
                          {l.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-6 border-t border-line flex items-center text-sm text-muted">
            <div className="flex items-center gap-2">
              <LogoMark size={18} />
              <span>© {new Date().getFullYear()} HomesBrain, Inc.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


/* ---- Phone mockup - the brand's one product visual, shared by every
   marketing page. Real-handset proportions (screen ≈ 9:19.5), a thin uniform
   bezel, status bar, and home indicator so it reads as a phone rather than a
   rounded card. Content is top-anchored; the quiet screen below it is
   intentional. ---- */

export function Phone({
  title,
  titleRight,
  children,
  floatDelay,
  className = "",
}: {
  title?: string;
  titleRight?: string;
  children: ReactNode;
  floatDelay?: string;
  className?: string;
}) {
  return (
    <div
      className={`anim-float w-full max-w-[270px] mx-auto rounded-[38px] bg-ink p-[7px] shadow-[0_24px_48px_-24px_rgba(22,22,15,0.38)] ${className}`}
      style={floatDelay ? { animationDelay: floatDelay } : undefined}
    >
      <div className="flex aspect-[9/18.5] flex-col overflow-hidden rounded-[31px] bg-[#f5f4ef] text-left">
        {/* status bar */}
        <div
          className="flex shrink-0 items-center justify-between px-5 pt-2.5 text-ink"
          aria-hidden="true"
        >
          <span className="text-[10px] font-bold tracking-tight tnum">9:41</span>
          <span className="flex items-center gap-1.5">
            <svg width="13" height="9" viewBox="0 0 13 9" fill="currentColor">
              <rect y="6" width="2" height="3" rx="0.5" />
              <rect x="3.5" y="4" width="2" height="5" rx="0.5" />
              <rect x="7" y="2" width="2" height="7" rx="0.5" />
              <rect x="10.5" width="2" height="9" rx="0.5" opacity="0.3" />
            </svg>
            <svg width="17" height="9" viewBox="0 0 17 9">
              <rect
                x="0.5"
                y="0.5"
                width="14"
                height="8"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                opacity="0.4"
              />
              <rect x="2" y="2" width="9" height="5" rx="1.5" fill="currentColor" />
              <path d="M16 3v3a1.6 1.6 0 0 0 0-3Z" fill="currentColor" opacity="0.4" />
            </svg>
          </span>
        </div>
        {(title || titleRight) && (
          <div className="flex shrink-0 items-baseline justify-between gap-3 px-4 pt-3.5 pb-1.5">
            <div className="text-sm font-extrabold text-ink">{title}</div>
            {titleRight && <div className="text-[11px] text-muted">{titleRight}</div>}
          </div>
        )}
        <div className={`min-h-0 flex-1 space-y-2 px-2.5 ${title || titleRight ? "" : "pt-3.5"}`}>
          {children}
        </div>
        {/* home indicator */}
        <div
          className="mx-auto mt-2 mb-2 h-1 w-[34%] shrink-0 rounded-full bg-ink/15"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/* Generic key/value or list row on the phone screen. */
export function PhoneRow({
  left,
  right,
  className = "",
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-paper px-3.5 py-2.5 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">{left}</div>
      {right}
    </div>
  );
}

/* Compact label/value row used on the pros page. */
export function PhoneKV({ k, v, accentV = false }: { k: string; v: string; accentV?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2.5">
      <span className="text-xs text-muted">{k}</span>
      <span className={`text-xs font-bold ${accentV ? "text-indigo" : "text-ink"}`}>{v}</span>
    </div>
  );
}

/* Primary in-screen action button. */
export function PhoneBtn({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-indigo px-3 py-2.5 text-center text-[13px] font-bold text-white">
      {children}
    </div>
  );
}

/* iMessage-style text bubble used inside the Phone mockup for the "How it works"
   cards. Incoming (left) uses a light neutral surface; outgoing (right) uses indigo
   or coral to show the homeowner or brand reply. */
export function MsgBubble({
  align = "left",
  sender,
  children,
  tone = "neutral",
  className = "",
}: {
  align?: "left" | "right";
  sender?: string;
  children: ReactNode;
  tone?: "neutral" | "indigo" | "coral";
  className?: string;
}) {
  const isLeft = align === "left";
  const toneClass = {
    neutral: "bg-paper text-ink border border-line",
    indigo: "bg-indigo text-white",
    coral: "bg-coral text-white",
  }[tone];
  return (
    <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} ${className}`}>
      {sender && (
        <span className="mb-1 px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
          {sender}
        </span>
      )}
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-snug shadow-sm ${
          isLeft ? "rounded-tl-sm" : "rounded-tr-sm"
        } ${toneClass}`}
      >
        {children}
      </div>
    </div>
  );
}

/* Pipeline mockup: shows a pro's inbound callback stream. Used on for-pros and index. */
export function PipelinePhone({ floatDelay }: { floatDelay?: string }) {
  return (
    <Phone floatDelay={floatDelay}>
      {/* push notification */}
      <div className="rounded-2xl bg-white border border-line px-3 py-2.5 flex items-start gap-2.5 shadow-[0_6px_16px_-10px_rgba(22,22,15,0.25)]">
        <div className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-indigo grid place-items-center text-white text-[11px] font-extrabold">
          HB
        </div>
        <div className="min-w-0">
          <div className="text-[11.5px] font-extrabold text-ink leading-tight">
            Mike is due today
          </div>
          <div className="mt-0.5 text-[10.5px] text-muted leading-snug">
            He set a reminder for an AC tune-up. Tap to call and log it.
          </div>
        </div>
      </div>

      <div className="pt-2 px-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal">
          Your pipeline
        </div>
        <div className="mt-1 text-[22px] font-extrabold leading-tight text-ink">
          <span className="text-teal">3</span> callbacks coming
        </div>
      </div>

      {[
        { name: "Karen M.", detail: "Water softener · due Jun", pill: "Reminder set", tone: "teal" as const },
        { name: "Mike R.", detail: "AC tune up · due now", pill: "Call today", tone: "coral" as const },
        { name: "Dana P.", detail: "Water heater · due Aug", pill: "Reminder set", tone: "teal" as const },
      ].map((r) => (
        <div
          key={r.name}
          className="rounded-xl border border-line bg-paper px-3 py-2 flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-ink truncate">{r.name}</div>
            <div className="text-[10.5px] text-muted truncate">{r.detail}</div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
              r.tone === "coral" ? "bg-coralbg text-coraldark" : "bg-tealbg text-tealdark"
            }`}
          >
            {r.pill}
          </span>
        </div>
      ))}

      <div className="rounded-xl bg-teal px-3 py-2.5 text-center text-[12.5px] font-bold text-white">
        Call Mike, log the job →
      </div>
    </Phone>
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
