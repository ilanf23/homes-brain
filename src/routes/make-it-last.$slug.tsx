import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, ChevronRight, ExternalLink } from "lucide-react";
import { Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { MarketingShell, SITE_URL, marketingHead } from "@/components/marketing";
import { GUIDE_ORDER, getGuide, otherGuides } from "@/lib/make-it-last";

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
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: g.h1,
          acceptedAnswer: { "@type": "Answer", text: g.quickAnswer },
        },
      ],
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
    return {
      ...base,
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(faqLd) },
        { type: "application/ld+json", children: JSON.stringify(howToLd) },
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
        <p className="mt-4 text-muted">
          That guide doesn't exist yet. Browse the ones that do.
        </p>
        <div className="mt-8">
          <Link to="/make-it-last">
            <Btn variant="coral">Back to Make It Last</Btn>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

function GuidePage() {
  const { slug } = Route.useParams();
  const g = getGuide(slug)!;
  const gap = g.maintained - g.neglected;
  const maxYears = Math.max(...GUIDE_ORDER.map((s) => getGuide(s)!.maintained));
  const neglectedPct = (g.neglected / maxYears) * 100;
  const maintainedPct = (g.maintained / maxYears) * 100;
  const others = otherGuides(g.slug, 4);

  return (
    <MarketingShell mobileCta={{ label: "Start free record", to: "/home/signup", variant: "coral" }}>
      <article className="mx-auto max-w-3xl px-5 pt-10 pb-20">
        {/* 1. Breadcrumb */}
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

        {/* 2. H1 */}
        <header className="mt-6">
          <Eyebrow accent="coral">Make it last</Eyebrow>
          <h1 className="mt-3 text-3xl sm:text-4xl tracking-tight text-ink leading-[1.1]">
            {g.h1}
          </h1>
        </header>

        {/* 3. Quick answer box */}
        <section className="mt-8 rounded-2xl bg-coralbg p-5 sm:p-6 border border-coral/20">
          <div className="eyebrow text-coraldark">Quick answer</div>
          <p className="mt-2 text-base sm:text-lg text-ink leading-relaxed">{g.quickAnswer}</p>
        </section>

        {/* 4. Two lifespans */}
        <section className="mt-12">
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
                  <div
                    className="h-full rounded-full bg-line"
                    style={{ width: `${neglectedPct}%` }}
                  />
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

        {/* 5. Maintenance that buys you the years */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            The maintenance that buys you the years
          </h2>
          <ul className="mt-5 space-y-3">
            {g.maintenance.map((m) => (
              <li
                key={m.task}
                className="rounded-2xl border border-line bg-paper p-4 flex gap-3"
              >
                <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-full bg-coralbg text-coraldark shrink-0">
                  <Check size={16} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <div className="text-sm font-semibold text-ink">{m.task}</div>
                    <div className="text-xs font-semibold text-coraldark">{m.frequency}</div>
                  </div>
                  <p className="mt-1 text-sm text-muted">{m.effect}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Facts band */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">The facts</h2>
          <Card className="mt-4 py-2">
            {g.facts.map((f) => (
              <KV key={f.k} k={f.k} v={f.v} mono={false} />
            ))}
          </Card>
        </section>

        {/* 7. Florida note */}
        <section className="mt-12 rounded-2xl bg-soft border border-line p-5 sm:p-6">
          <div className="eyebrow text-coral">Florida note</div>
          <p className="mt-2 text-sm sm:text-base text-ink">{g.floridaNote}</p>
        </section>

        {/* 8. Sources */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Sources</h2>
          {g.verifyProminent && (
            <div className="mt-4 rounded-xl bg-amberbg border border-amber/20 p-4 text-sm text-amberdark">
              Ranges vary widely by product and model. Verify specifics for your exact equipment
              before making a maintenance or replacement decision.
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

        {/* 9. CTAs */}
        <section className="mt-12 rounded-2xl bg-coralbg p-6 sm:p-8 text-center border border-coral/20">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Make this one last longer
          </h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Book a pro who does this work, or add this {g.label.toLowerCase()} to your free home
            record and get reminders when it needs service.
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

        {/* 10. Keep going */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Keep going</h2>
          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                to="/make-it-last/$slug"
                params={{ slug: o.slug }}
                className="group"
              >
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
          Lifespans and maintenance guidance are general estimates and vary by product, use, and
          climate. Always follow your manufacturer's instructions.
        </p>
      </article>
    </MarketingShell>
  );
}
