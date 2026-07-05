import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Eyebrow, KV, Pill } from "@/lib/ui";
import { MarketingShell, marketingHead, SITE_URL } from "@/components/marketing";
import { ShieldCheck, TradeIcon } from "@/components/svg";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, tradeLabel } from "@/lib/hb";

/* Public verified pro profile — the SEO engine.
   Server-rendered via the route loader; data comes ONLY from the read-only
   get_public_pro_profile() function (never direct table access). Unknown or
   inactive pros get a noindex + graceful 404. */

type PublicProProfile = {
  business: string;
  trade: string;
  city: string | null;
  logo: string | null;
  google_rating: number | null;
  job_count: number;
  recalls_caught: number;
  last_job_at: string;
  activity: { what_done: string; done_on: string; equipment_type: string | null }[];
};

async function fetchProfile(city: string, trade: string, business: string) {
  // The RPC isn't in the generated Database types yet; call it untyped.
  const rpc = supabase.rpc.bind(supabase) as (
    fn: string,
    args: Record<string, string>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("get_public_pro_profile", {
    p_city: city,
    p_trade: trade,
    p_business: business,
  });
  if (error) {
    console.error("[pro-profile]", error.message);
    return null;
  }
  return (data as PublicProProfile | null) ?? null;
}

export const Route = createFileRoute("/pro/$city/$trade/$business")({
  loader: async ({ params }) => ({
    profile: await fetchProfile(params.city, params.trade, params.business),
  }),
  head: ({ loaderData, params }) => {
    const p = loaderData?.profile;
    if (!p) {
      return {
        meta: [
          { title: "Pro profile not found — HomesBrain" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${p.business} — ${tradeLabel(p.trade)} in ${p.city ?? ""} | Verified by HomesBrain`;
    const description = `${p.business} keeps a verified HomesBrain record of their work: ${p.job_count} verified ${
      p.job_count === 1 ? "job" : "jobs"
    }${p.google_rating ? `, ${p.google_rating}★ on Google` : ""}. ${tradeLabel(p.trade)} serving ${p.city ?? "your area"}.`;
    return marketingHead({
      title,
      description,
      path: `/pro/${params.city}/${params.trade}/${params.business}`,
    });
  },
  component: ProProfile,
});

function JsonLd({ profile, path }: { profile: PublicProProfile; path: string }) {
  const url = `${SITE_URL}${path}`;
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.business,
    url,
    areaServed: profile.city ?? undefined,
    knowsAbout: tradeLabel(profile.trade),
    ...(profile.google_rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: profile.google_rating,
            bestRating: 5,
            ratingCount: Math.max(profile.job_count, 1),
          },
        }
      : {}),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "HomesBrain", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: `${tradeLabel(profile.trade)} in ${profile.city ?? ""}`.trim(),
      },
      { "@type": "ListItem", position: 3, name: profile.business, item: url },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}

function NotAvailable() {
  return (
    <MarketingShell mobileCta={null}>
      <section className="mx-auto max-w-xl px-5 py-24 text-center">
        <Eyebrow accent="teal">Verified pros</Eyebrow>
        <h1 className="mt-4 text-4xl tracking-tight text-ink">This profile isn't available.</h1>
        <p className="mt-4 text-muted">
          Either the link is wrong, or this pro hasn't logged verified work recently. Verified
          profiles are earned by doing the work — every page here is backed by real, logged jobs.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/for-pros">
            <Btn variant="teal" size="lg">
              I'm a pro — get verified
            </Btn>
          </Link>
          <Link to="/">
            <Btn variant="secondary" size="lg">
              Back home
            </Btn>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

function ProProfile() {
  const { profile } = Route.useLoaderData();
  const params = Route.useParams();
  if (!profile) return <NotAvailable />;

  const path = `/pro/${params.city}/${params.trade}/${params.business}`;
  const trade = tradeLabel(profile.trade);

  return (
    <MarketingShell
      mobileCta={{ label: "Claim your home record", to: "/for-homeowners", variant: "coral" }}
    >
      <JsonLd profile={profile} path={path} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-4xl px-5 pt-6 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-ink transition-colors">
              HomesBrain
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {trade} in {profile.city}
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-ink">{profile.business}</li>
        </ol>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-4xl px-5 pt-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-tealbg text-teal flex items-center justify-center shrink-0">
            <TradeIcon trade={profile.trade} size={28} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">{profile.business}</h1>
              <Pill accent="teal">
                <ShieldCheck size={12} animate={false} /> Verified by HomesBrain
              </Pill>
            </div>
            <p className="mt-1 text-muted">
              {trade} · {profile.city}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Verified jobs",
              value: String(profile.job_count),
            },
            {
              label: "Google rating",
              value: profile.google_rating ? `${profile.google_rating}★` : "—",
            },
            {
              label: "Recalls caught",
              value: String(profile.recalls_caught),
            },
            {
              label: "Last verified job",
              value: formatDate(profile.last_job_at),
            },
          ].map((s) => (
            <Card key={s.label} className="p-4 text-center">
              <div className="text-2xl font-semibold font-display tracking-tight text-ink tnum">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* What "verified" means + activity */}
      <section className="bg-soft border-y border-line py-14">
        <div className="mx-auto max-w-4xl px-5 grid md:grid-cols-[1fr_1.2fr] gap-8">
          <div>
            <Eyebrow accent="teal">What this means</Eyebrow>
            <h2 className="mt-3 text-2xl sm:text-3xl tracking-tight">
              Every job here really happened.
            </h2>
            <p className="mt-3 text-sm text-muted">
              {profile.business} logs their work on HomesBrain: the equipment, the service, the
              date. Each entry becomes a permanent record their customer owns. That's a track record
              no ad can fake.
            </p>
            <div className="mt-5">
              <KV k="Trade" v={trade} />
              <KV k="Service area" v={profile.city ?? "—"} />
              <KV
                k="Recall checks"
                v={
                  <span className="inline-flex items-center gap-1.5 text-teal font-semibold text-sm">
                    <ShieldCheck size={16} animate={false} /> On every visit
                  </span>
                }
              />
            </div>
          </div>
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight font-display">
                Recent verified work
              </h3>
              <Pill accent="teal">Anonymized</Pill>
            </div>
            {profile.activity.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Recent activity will appear here.</p>
            ) : (
              <ul className="mt-3">
                {profile.activity.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{a.what_done}</div>
                      {a.equipment_type && (
                        <div className="text-xs text-muted mt-0.5">{a.equipment_type}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted shrink-0 font-mono tnum">
                      {formatDate(a.done_on)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      {/* Homeowner CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Eyebrow accent="coral">For their customers</Eyebrow>
          <h2 className="mt-3 text-2xl sm:text-3xl tracking-tight">
            This pro keeps a verified record of their work — claim your home record.
          </h2>
          <p className="mt-3 text-muted max-w-xl mx-auto">
            If {profile.business} has worked on your home, your service record is waiting in the
            text they sent you. Claiming is free, forever.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/for-homeowners">
              <Btn variant="coral" size="lg">
                Claim your home record
              </Btn>
            </Link>
            <Link to="/how-it-works">
              <Btn variant="secondary" size="lg">
                How it works
              </Btn>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
