import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Eyebrow } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";

const LABELS: Record<string, string> = {
  "water-heater": "Water heater",
  "central-ac": "Central AC",
  roof: "Roof",
  dryer: "Dryer",
  dishwasher: "Dishwasher",
  "water-softener": "Water softener",
  refrigerator: "Refrigerator",
  "pool-equipment": "Pool equipment",
};

function labelFor(slug: string) {
  return LABELS[slug] ?? slug.replace(/-/g, " ");
}

export const Route = createFileRoute("/make-it-last/$slug")({
  head: ({ params }) => {
    const label = labelFor(params.slug);
    return marketingHead({
      title: `${label} lifespan and maintenance, Make It Last`,
      description: `How to make your ${label.toLowerCase()} last longer. Full guide coming soon.`,
      path: `/make-it-last/${params.slug}`,
    });
  },
  component: GuidePlaceholder,
});

function GuidePlaceholder() {
  const { slug } = Route.useParams();
  const label = labelFor(slug);
  return (
    <MarketingShell mobileCta={{ label: "Start free record", to: "/home/signup", variant: "coral" }}>
      <section className="mx-auto max-w-2xl px-5 pt-20 pb-24 text-center">
        <Eyebrow accent="coral">Make it last</Eyebrow>
        <h1 className="mt-4 text-4xl sm:text-5xl tracking-tight text-ink leading-[1.06]">
          {label}
        </h1>
        <p className="mt-6 text-lg text-muted">
          The full {label.toLowerCase()} guide is coming soon. In the meantime, start your record so
          you don't lose the paper trail on this one.
        </p>
        <Card className="mt-10 text-left">
          <div className="eyebrow text-coral">Coming soon</div>
          <p className="mt-2 text-sm text-muted">
            Lifespan ranges, the maintenance schedule that actually matters, common failure modes,
            and what a fair repair should cost.
          </p>
        </Card>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/make-it-last">
            <Btn variant="ghost">Back to Make It Last</Btn>
          </Link>
          <Link to="/home/signup">
            <Btn variant="coral">Start your free record</Btn>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
