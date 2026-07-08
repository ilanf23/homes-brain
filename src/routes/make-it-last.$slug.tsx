import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronRight, ExternalLink, AlertTriangle } from "lucide-react";
import { Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { MarketingShell, SITE_URL, marketingHead } from "@/components/marketing";
import { GUIDE_ORDER, getGuide, otherGuides, type Guide } from "@/lib/make-it-last";

const UPDATED_ISO = "2026-07-01";
const UPDATED_LABEL = "July 2026";

type Section = { id: string; label: string };

function buildSections(g: Guide): Section[] {
  const s: Section[] = [];
  if (g.overview) s.push({ id: "overview", label: "Overview" });
  s.push({ id: "two-lifespans", label: "Two lifespans" });
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
    });
    const url = `${SITE_URL}/make-it-last/${g.slug}`;

    const faqEntities = (g.faqs ?? [{ q: g.h1, a: g.quickAnswer }]).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqEntities,
    };
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
      author: { "@type": "Organization", name: "HomesBrain" },
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

function ImpactTag({ impact }: { impact?: "High" | "Medium" | "Low" }) {
  if (!impact) return null;
  const styles =
    impact === "High"
      ? "bg-coralbg text-coraldark"
      : impact === "Medium"
      ? "bg-soft text-muted"
      : "bg-white text-muted border border-line";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {impact} impact
    </span>
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

function GuidePage() {
  const { slug } = Route.useParams();
  const g = getGuide(slug)!;
  const gap = g.maintained - g.neglected;
  const maxYears = Math.max(...GUIDE_ORDER.map((s) => getGuide(s)!.maintained));
  const neglectedPct = (g.neglected / maxYears) * 100;
  const maintainedPct = (g.maintained / maxYears) * 100;
  const others = otherGuides(g.slug, 4);
  const sections = buildSections(g);
  const active = useScrollSpy(sections.map((s) => s.id));

  const orderedMaintenance = [...g.maintenance].sort(
    (a, b) => (IMPACT_ORDER[a.impact ?? "Medium"] ?? 1) - (IMPACT_ORDER[b.impact ?? "Medium"] ?? 1)
  );

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

      <div className="mx-auto max-w-6xl px-5 pt-10 pb-20 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
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
            <h1 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink leading-[1.1]">{g.h1}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>
                Updated <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>
              </span>
              <span aria-hidden="true">·</span>
              <span>Reviewed by the HomesBrain team</span>
            </div>
          </header>

          {/* Quick answer */}
          <section className="mt-8 rounded-2xl bg-coralbg p-5 sm:p-6 border border-coral/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-coraldark">Quick answer</div>
            <p className="mt-2 text-base sm:text-lg text-ink leading-relaxed">{g.quickAnswer}</p>
          </section>

          {/* Overview */}
          {g.overview && (
            <section id="overview" className="mt-12 scroll-mt-32">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">Overview</h2>
              <p className="mt-4 text-base text-ink leading-relaxed">{g.overview}</p>
            </section>
          )}

          {/* Two lifespans */}
          <section id="two-lifespans" className="mt-12 scroll-mt-32">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Two lifespans</h2>
            <Card className="mt-4">
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-sm text-muted">
                  {g.barsLabel ? `Based on ${g.barsLabel}.` : "Left alone vs maintained."}
                </div>
                <Pill accent="coral">+{gap} years</Pill>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted font-semibold">Left alone</span>
                    <span className="tnum font-semibold text-ink">{g.neglected} years</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-soft overflow-hidden">
                    <div className="h-full rounded-full bg-line" style={{ width: `${neglectedPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-coraldark font-semibold">Maintained</span>
                    <span className="tnum font-semibold text-coraldark">{g.maintained} years</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-coralbg overflow-hidden">
                    <div className="h-full rounded-full bg-coral" style={{ width: `${maintainedPct}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Top brands */}
          {g.brands?.length ? (
            <section id="top-brands" className="mt-12 scroll-mt-32">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">Top brands</h2>
              <p className="mt-2 text-sm text-muted">The names pros and reviewers consistently rank at the top.</p>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                {g.brands.map((b) => (
                  <Card key={b.name} className="flex flex-col">
                    <div className="text-base font-semibold text-ink">{b.name}</div>
                    <p className="mt-1.5 text-sm text-muted leading-relaxed">{b.note}</p>
                    <a
                      href={b.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-coraldark hover:text-coral transition-colors"
                    >
                      {b.sourceLabel}
                      <ExternalLink size={12} />
                    </a>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {/* Maintenance */}
          <section id="maintenance" className="mt-12 scroll-mt-32">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">The maintenance that buys you the years</h2>
            <ul className="mt-5 space-y-3">
              {orderedMaintenance.map((m) => (
                <li key={m.task} className="rounded-2xl border border-line bg-paper p-4 flex gap-3">
                  <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-full bg-coralbg text-coraldark shrink-0">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <div className="text-sm font-semibold text-ink">{m.task}</div>
                      <div className="text-xs font-semibold text-coraldark">{m.frequency}</div>
                      <ImpactTag impact={m.impact} />
                    </div>
                    <p className="mt-1 text-sm text-muted">{m.effect}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Signs it is failing */}
          {g.signs?.length ? (
            <section id="signs" className="mt-12 scroll-mt-32">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">Signs it is failing</h2>
              <ul className="mt-5 grid sm:grid-cols-2 gap-3">
                {g.signs.map((s) => (
                  <li key={s} className="rounded-xl border border-line bg-paper p-3 flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-coraldark mt-0.5 shrink-0" />
                    <span className="text-sm text-ink">{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Repair or replace */}
          {g.repairOrReplace ? (
            <section id="repair-or-replace" className="mt-12 scroll-mt-32">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">Repair or replace</h2>
              <div className="mt-4 rounded-2xl bg-soft border border-line p-5 sm:p-6">
                <p className="text-base text-ink leading-relaxed">{g.repairOrReplace}</p>
              </div>
            </section>
          ) : null}

          {/* Facts */}
          <section id="facts" className="mt-12 scroll-mt-32">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">The facts</h2>
            <Card className="mt-4 py-2">
              {g.facts.map((f) => (
                <KV key={f.k} k={f.k} v={f.v} mono={false} />
              ))}
            </Card>
          </section>

          {/* FAQ */}
          {g.faqs?.length ? (
            <section id="faq" className="mt-12 scroll-mt-32">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">FAQ</h2>
              <div className="mt-5 space-y-4">
                {g.faqs.map((f) => (
                  <div key={f.q} className="rounded-2xl border border-line bg-paper p-5">
                    <h3 className="text-base font-semibold text-ink">{f.q}</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Florida note */}
          <section className="mt-12 rounded-2xl bg-soft border border-line p-5 sm:p-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-coral">Florida note</div>
            <p className="mt-2 text-sm sm:text-base text-ink">{g.floridaNote}</p>
          </section>

          {/* Sources */}
          <section id="sources" className="mt-12 scroll-mt-32">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Sources</h2>
            {g.verifyProminent && (
              <div className="mt-4 rounded-xl bg-amberbg border border-amber/20 p-4 text-sm text-amberdark">
                Ranges vary widely by product and model. Verify specifics for your exact equipment before making a
                maintenance or replacement decision.
              </div>
            )}
            <ul className="mt-4 space-y-2">
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
          </section>

          {/* CTAs */}
          <section className="mt-12 rounded-2xl bg-coralbg p-6 sm:p-8 text-center border border-coral/20">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Make this one last longer</h2>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              Book a pro who does this work, or add this {g.label.toLowerCase()} to your free home record and get
              reminders when it needs service.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/home/pros">
                <Btn variant="coral">Book a pro</Btn>
              </Link>
              <Link to="/home/signup">
                <Btn variant="ghost">Add to my home record</Btn>
              </Link>
            </div>
          </section>

          {/* Keep going */}
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Keep going</h2>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
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
