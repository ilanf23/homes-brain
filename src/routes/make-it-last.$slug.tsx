import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  AlertTriangle,
  FileText,
  BarChart3,
  Award,
  Wrench,
  Scale,
  Info,
  HelpCircle,
  BookOpen,
  MapPin,
} from "lucide-react";
import { Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { MarketingShell, SITE_URL, marketingHead } from "@/components/marketing";
import { GUIDE_ORDER, getGuide, otherGuides, type Guide } from "@/lib/make-it-last";

const UPDATED_ISO = "2026-07-01";
const UPDATED_LABEL = "July 2026";
const AREA_SERVED = "St. Johns County, Florida";

type Section = { id: string; label: string };

function buildSections(g: Guide): Section[] {
  const s: Section[] = [];
  if (g.overview) s.push({ id: "overview", label: "Overview" });
  if (g.expectedLifeOnly) {
    s.push({ id: "built-to-last", label: "Built to last" });
  } else if (g.cadenceOnly) {
    s.push({ id: "cadence", label: "Maintenance cadence" });
  } else {
    s.push({ id: "two-lifespans", label: "Two lifespans" });
  }
  if (g.brands?.length) s.push({ id: "top-brands", label: "Top brands" });
  s.push({ id: "maintenance", label: "Maintenance" });
  if (g.signs?.length) s.push({ id: "signs", label: "Signs it is failing" });
  if (g.repairOrReplace) s.push({ id: "repair-or-replace", label: "Repair or replace" });
  s.push({ id: "facts", label: "The facts" });
  if (g.faqs?.length) s.push({ id: "faq", label: "FAQ" });
  s.push({ id: "sources", label: "Sources" });
  return s;
}

const IMPACT_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export const Route = createFileRoute("/make-it-last/$slug")({
  head: ({ params }) => {
    const g = getGuide(params.slug);
    if (!g) {
      return marketingHead({
        title: "Guide not found | Make It Last",
        description: "This guide doesn't exist yet.",
        path: `/make-it-last/${params.slug}`,
        noindex: true,
      });
    }
    const base = marketingHead({
      title: `How long does a ${g.label.toLowerCase()} last (and how to make it last longer) | Make It Last`,
      description: g.metaDescription,
      path: `/make-it-last/${g.slug}`,
      geo: true,
    });
    const url = `${SITE_URL}/make-it-last/${g.slug}`;

    const faqEntities = (g.faqs ?? [{ q: g.h1, a: g.quickAnswer }]).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
    const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqEntities };
    const howToLd = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `Make your ${g.label.toLowerCase()} last longer`,
      description: g.metaDescription,
      url,
      step: g.maintenance.map((m, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: m.task,
        text: `${m.task}. ${m.frequency}. ${m.effect}`,
      })),
    };
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Make It Last", item: `${SITE_URL}/make-it-last` },
        { "@type": "ListItem", position: 3, name: g.label, item: url },
      ],
    };
    const articleLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: g.h1,
      description: g.metaDescription,
      url,
      datePublished: UPDATED_ISO,
      dateModified: UPDATED_ISO,
      inLanguage: "en-US",
      areaServed: { "@type": "AdministrativeArea", name: AREA_SERVED },
      spatialCoverage: { "@type": "State", name: "Florida" },
      author: {
        "@type": "Organization",
        name: "HomesBrain",
        areaServed: { "@type": "AdministrativeArea", name: AREA_SERVED },
      },
      publisher: { "@type": "Organization", name: "HomesBrain" },
      mainEntityOfPage: url,
    };
    return {
      ...base,
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(faqLd) },
        { type: "application/ld+json", children: JSON.stringify(howToLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbLd) },
        { type: "application/ld+json", children: JSON.stringify(articleLd) },
      ],
    };
  },
  loader: ({ params }) => {
    if (!getGuide(params.slug)) throw notFound();
    return null;
  },
  notFoundComponent: () => <GuideNotFound />,
  component: GuidePage,
});

function GuideNotFound() {
  return (
    <MarketingShell mobileCta={{ label: "Explore Make It Last", to: "/make-it-last", variant: "coral" }}>
      <section className="mx-auto max-w-2xl px-5 pt-20 pb-24 text-center">
        <Eyebrow accent="coral">Make it last</Eyebrow>
        <h1 className="mt-4 text-4xl tracking-tight text-ink">Guide not found</h1>
        <p className="mt-4 text-muted">That guide doesn't exist yet. Browse the ones that do.</p>
        <div className="mt-8">
          <Link to="/make-it-last">
            <Btn variant="coral">Back to Make It Last</Btn>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

function ImpactPill({ impact }: { impact?: "High" | "Medium" | "Low" }) {
  if (!impact) return null;
  const styles =
    impact === "High"
      ? "bg-coral text-white"
      : impact === "Medium"
      ? "bg-soft text-muted border border-line"
      : "bg-white text-muted border border-line";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {impact} impact
    </span>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-32 flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-coralbg text-coraldark">
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">{children}</h2>
    </div>
  );
}

function SectionDivider() {
  return <div className="mt-16 h-px bg-line" aria-hidden="true" />;
}

function InlineSource({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-coraldark hover:text-coral transition-colors"
    >
      Source: {label}
      <ExternalLink size={11} />
    </a>
  );
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? "");
  useEffect(() => {
    if (!ids.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids.join("|")]);
  return active;
}

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-line bg-paper overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-soft/40 transition-colors"
      >
        <h3 className="text-base font-semibold text-ink">{q}</h3>
        <ChevronDown
          size={20}
          className={`text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1">
          <p className="text-sm text-muted leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function GuidePage() {
  const { slug } = Route.useParams();
  const g = getGuide(slug)!;
  const gap = g.maintained - g.neglected;
  const maxYears = Math.max(
    ...GUIDE_ORDER.map((s) => getGuide(s)!)
      .filter((x) => !x.expectedLifeOnly && !x.cadenceOnly)
      .map((x) => x.maintained)
  );
  const neglectedPct = (g.neglected / maxYears) * 100;
  const maintainedPct = (g.maintained / maxYears) * 100;
  const others = otherGuides(g.slug, 4);
  const sections = buildSections(g);
  const active = useScrollSpy(sections.map((s) => s.id));

  const orderedMaintenance = [...g.maintenance].sort(
    (a, b) => (IMPACT_ORDER[a.impact ?? "Medium"] ?? 1) - (IMPACT_ORDER[b.impact ?? "Medium"] ?? 1)
  );

  // Primary source for the lifespan facts: pick a lifespan-focused source when available.
  const lifespanSource =
    g.sources.find((s) => /lifespan|life expectancy|handyman|nachi/i.test(s.label)) ?? g.sources[0];
  // Brand source (first brand shares one URL in these guides).
  const brandSource = g.brands?.[0]
    ? { label: g.brands[0].sourceLabel, url: g.brands[0].sourceUrl }
    : null;

  return (
    <MarketingShell mobileCta={{ label: "Start free record", to: "/home/signup", variant: "coral" }}>
      {/* Mobile sticky sub-nav */}
      <div className="lg:hidden sticky top-14 z-30 bg-bg/95 backdrop-blur border-b border-line">
        <nav aria-label="On this page" className="overflow-x-auto no-scrollbar">
          <ul className="flex gap-1 px-4 py-2 whitespace-nowrap">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    active === s.id ? "bg-coralbg text-coraldark" : "text-muted hover:text-ink"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-10 pb-20 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        {/* Desktop sticky TOC */}
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3">On this page</div>
            <ul className="space-y-1 border-l border-line">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`block -ml-px pl-3 py-1.5 text-sm border-l-2 transition-colors ${
                      active === s.id
                        ? "border-coral text-coraldark font-semibold"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>
                <Link to="/make-it-last" className="hover:text-ink transition-colors">
                  Make It Last
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={14} />
              </li>
              <li className="text-ink font-semibold">{g.label}</li>
            </ol>
          </nav>

          {/* H1 + byline */}
          <header className="mt-6">
            <Eyebrow accent="coral">Make it last</Eyebrow>
            <h1 className="mt-3 text-3xl sm:text-5xl tracking-tight text-ink leading-[1.05] font-semibold">
              {g.h1}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>
                Updated <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>
              </span>
              <span aria-hidden="true">·</span>
              <span>Reviewed by the HomesBrain team</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <MapPin size={12} className="text-coraldark" />
              <span>Written for Florida homes, St. Johns County first</span>
            </div>
          </header>

          {/* Quick answer */}
          <section className="mt-8 rounded-3xl bg-coralbg p-6 sm:p-8 border border-coral/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-coraldark">Quick answer</div>
            <p className="mt-2 text-lg sm:text-xl text-ink leading-relaxed">{g.quickAnswer}</p>
          </section>

          {/* VISUAL CENTERPIECE: swap by mode */}
          {g.expectedLifeOnly ? (
            <section className="mt-10 scroll-mt-32" id="built-to-last">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-coralbg text-coraldark">
                  <Info size={20} strokeWidth={2.25} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
                  Built to last, here is what actually needs attention
                </h2>
              </div>
              <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
                <div className="text-[11px] font-bold uppercase tracking-wider text-coraldark">
                  Expected life
                </div>
                <p className="mt-3 text-lg sm:text-xl text-ink leading-relaxed">
                  {g.expectedLife ?? g.quickAnswer}
                </p>
                <p className="mt-4 text-sm text-muted leading-relaxed">
                  Because this one is built to last, the useful section for you is not a lifespan chart, it is the maintenance list below.
                </p>
                {lifespanSource && (
                  <div className="mt-5">
                    <InlineSource label={lifespanSource.label} url={lifespanSource.url} />
                  </div>
                )}
              </div>
            </section>
          ) : g.cadenceOnly ? (
            <section className="mt-10 scroll-mt-32" id="cadence">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-coralbg text-coraldark">
                  <Info size={20} strokeWidth={2.25} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
                  Maintenance cadence
                </h2>
              </div>
              <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
                <p className="text-lg sm:text-xl text-ink leading-relaxed">
                  This one is not a lifespan story, it is a cadence. Keep the schedule below active and you stay protected. Let it lapse and you start over.
                </p>
                {lifespanSource && (
                  <div className="mt-5">
                    <InlineSource label={lifespanSource.label} url={lifespanSource.url} />
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="mt-10 scroll-mt-32" id="two-lifespans">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-coralbg text-coraldark">
                  <BarChart3 size={20} strokeWidth={2.25} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Two lifespans</h2>
              </div>
              <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
                <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-start">
                  <div className="space-y-6 min-w-0">
                    {/* Left alone */}
                    <div>
                      <div className="flex items-baseline justify-between gap-3 mb-2">
                        <div className="text-sm font-semibold uppercase tracking-wider text-muted">Left alone</div>
                        <div className="tnum text-3xl sm:text-4xl font-bold text-muted">
                          {g.neglected}
                          <span className="text-base font-semibold ml-1">yrs</span>
                        </div>
                      </div>
                      <div className="h-5 rounded-full bg-soft overflow-hidden">
                        <div className="h-full rounded-full bg-line" style={{ width: `${neglectedPct}%` }} />
                      </div>
                    </div>
                    {/* Maintained */}
                    <div>
                      <div className="flex items-baseline justify-between gap-3 mb-2">
                        <div className="text-sm font-semibold uppercase tracking-wider text-coraldark">
                          Maintained
                        </div>
                        <div className="tnum text-3xl sm:text-4xl font-bold text-coraldark">
                          {g.maintained}
                          <span className="text-base font-semibold ml-1">yrs</span>
                        </div>
                      </div>
                      <div className="h-5 rounded-full bg-coralbg overflow-hidden">
                        <div
                          className="h-full rounded-full bg-coral"
                          style={{ width: `${maintainedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Big +N years stat */}
                  <div className="sm:border-l sm:border-line sm:pl-6 flex sm:flex-col items-center sm:items-start justify-between gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-coraldark">You gain</div>
                    <div className="tnum text-5xl sm:text-6xl font-bold text-coral leading-none">
                      +{gap}
                    </div>
                    <div className="text-sm font-semibold text-ink">years</div>
                  </div>
                </div>
                {g.barsLabel && (
                  <div className="mt-4 text-xs text-muted">Based on {g.barsLabel}.</div>
                )}
                {lifespanSource && (
                  <div className="mt-4">
                    <InlineSource label={lifespanSource.label} url={lifespanSource.url} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Overview */}
          {g.overview && (
            <>
              <SectionDivider />
              <div className="mt-16">
                <SectionHeading id="overview" icon={FileText}>
                  Overview
                </SectionHeading>
                <p className="mt-5 text-base sm:text-lg text-ink leading-relaxed">{g.overview}</p>
              </div>
            </>
          )}

          {/* Top brands */}
          {g.brands?.length ? (
            <>
              <SectionDivider />
              <div className="mt-16">
                <SectionHeading id="top-brands" icon={Award}>
                  Top brands
                </SectionHeading>
                <p className="mt-3 text-sm text-muted">
                  The names pros and reviewers consistently rank at the top.
                </p>
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  {g.brands.map((b) => (
                    <div
                      key={b.name}
                      className="rounded-2xl border border-line bg-paper p-5 flex gap-4 items-start"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-coralbg text-coraldark text-lg font-bold shrink-0">
                        {b.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-ink">{b.name}</div>
                        <p className="mt-1 text-sm text-muted leading-relaxed">{b.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {brandSource && (
                  <div className="mt-4">
                    <InlineSource label={brandSource.label} url={brandSource.url} />
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Maintenance */}
          <SectionDivider />
          <div className="mt-16">
            <SectionHeading id="maintenance" icon={Wrench}>
              The maintenance that buys you the years
            </SectionHeading>
            <ul className="mt-6 space-y-3">
              {orderedMaintenance.map((m) => (
                <li
                  key={m.task}
                  className="rounded-2xl border border-line bg-paper p-5 flex gap-4"
                >
                  <div className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-full bg-coralbg text-coraldark shrink-0">
                    <Check size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <div className="text-base font-semibold text-ink">{m.task}</div>
                      <ImpactPill impact={m.impact} />
                    </div>
                    <div className="mt-1 text-xs font-semibold text-coraldark uppercase tracking-wider">
                      {m.frequency}
                    </div>
                    <p className="mt-2 text-sm text-muted leading-relaxed">{m.effect}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Signs it is failing */}
          {g.signs?.length ? (
            <>
              <SectionDivider />
              <div className="mt-16">
                <SectionHeading id="signs" icon={AlertTriangle}>
                  Signs it is failing
                </SectionHeading>
                <div className="mt-6 rounded-3xl bg-amberbg border border-amber/25 p-5 sm:p-6">
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {g.signs.map((s) => (
                      <li key={s} className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-white text-amberdark shrink-0">
                          <AlertTriangle size={13} strokeWidth={2.5} />
                        </div>
                        <span className="text-sm text-ink">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}

          {/* Repair or replace */}
          {g.repairOrReplace ? (
            <>
              <SectionDivider />
              <div className="mt-16">
                <SectionHeading id="repair-or-replace" icon={Scale}>
                  Repair or replace
                </SectionHeading>
                <div className="mt-6 rounded-3xl bg-coralbg border border-coral/20 p-6 sm:p-8 flex gap-4 items-start">
                  <div className="mt-1 flex items-center justify-center w-10 h-10 rounded-full bg-white text-coraldark shrink-0">
                    <Scale size={20} strokeWidth={2.25} />
                  </div>
                  <p className="text-base sm:text-lg text-ink leading-relaxed">{g.repairOrReplace}</p>
                </div>
              </div>
            </>
          ) : null}

          {/* Facts */}
          <SectionDivider />
          <div className="mt-16">
            <SectionHeading id="facts" icon={Info}>
              The facts
            </SectionHeading>
            <Card className="mt-6 py-2">
              {g.facts.map((f) => (
                <KV key={f.k} k={f.k} v={f.v} mono={false} />
              ))}
            </Card>
            {lifespanSource && (
              <div className="mt-3">
                <InlineSource label={lifespanSource.label} url={lifespanSource.url} />
              </div>
            )}
          </div>

          {/* Florida note */}
          <div className="mt-16 rounded-3xl bg-soft border border-line p-6 sm:p-7 flex gap-4 items-start">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-coralbg text-coraldark shrink-0">
              <MapPin size={20} strokeWidth={2.25} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-coraldark">
                Florida note
              </div>
              <p className="mt-2 text-base text-ink leading-relaxed">{g.floridaNote}</p>
            </div>
          </div>

          {/* FAQ */}
          {g.faqs?.length ? (
            <>
              <SectionDivider />
              <div className="mt-16">
                <SectionHeading id="faq" icon={HelpCircle}>
                  FAQ
                </SectionHeading>
                <div className="mt-6 space-y-3">
                  {g.faqs.map((f, i) => (
                    <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {/* Sources */}
          <SectionDivider />
          <div className="mt-16">
            <SectionHeading id="sources" icon={BookOpen}>
              Sources
            </SectionHeading>
            {g.verifyProminent && (
              <div className="mt-6 rounded-2xl bg-amberbg border border-amber/25 p-4 text-sm text-amberdark">
                Ranges vary widely by product and model. Verify specifics for your exact equipment before making a
                maintenance or replacement decision.
              </div>
            )}
            <ul className="mt-5 space-y-2">
              {g.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-coraldark hover:text-coral transition-colors"
                  >
                    {s.label}
                    <ExternalLink size={14} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Sources are general public references. Verify specifics for your model.
            </p>
          </div>

          {/* CTAs */}
          <section className="mt-16 rounded-3xl bg-coralbg p-8 sm:p-10 text-center border border-coral/20">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
              Make this one last longer
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted max-w-md mx-auto">
              Book a pro who does this work, or add this {g.label.toLowerCase()} to your free home record and get
              reminders when it needs service.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/home/pros">
                <Btn variant="coral">Book a pro</Btn>
              </Link>
              <Link to="/home/signup">
                <Btn variant="ghost">Add to my home record</Btn>
              </Link>
            </div>
          </section>

          {/* Keep going */}
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-coralbg text-coraldark">
                <ChevronRight size={20} strokeWidth={2.25} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Keep going</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {others.map((o) => (
                <Link key={o.slug} to="/make-it-last/$slug" params={{ slug: o.slug }} className="group">
                  <Card lift className="flex items-center justify-between gap-3 py-5">
                    <div>
                      <div className="text-sm font-semibold text-ink">{o.label}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {o.neglected} vs {o.maintained} years
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted group-hover:text-coral transition-colors" />
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Disclaimer */}
          <p className="mt-14 text-xs text-muted text-center max-w-xl mx-auto">
            Lifespans and maintenance guidance are general estimates and vary by product, use, and climate. Always
            follow your manufacturer's instructions.
          </p>
        </article>
      </div>
    </MarketingShell>
  );
}
