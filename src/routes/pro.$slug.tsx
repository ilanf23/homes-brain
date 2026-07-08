import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone,
  Globe,
  Facebook,
  Instagram,
  Star,
  ShieldCheck,
  ArrowLeft,
  MapPin,
  Clock,
  Tag,
  MailQuestion,
} from "lucide-react";
import { Btn, Card, Eyebrow, Pill } from "@/lib/ui";
import { MarketingShell, marketingHead, SITE_URL } from "@/components/marketing";
import { ContactProModal } from "@/components/contact-pro-modal";
import { getPro, TRADE_LABELS, type Pro } from "@/lib/pros";

/* /pro/$slug is a single-segment dynamic route. Static /pro/* routes (jobs,
   customers, office, etc.) take precedence via file-based routing, but we also
   reject reserved slugs here as a guardrail so a future collision surfaces as
   a 404 instead of the profile page rendering unexpected pro-app URLs. */
const RESERVED_SLUGS = new Set([
  "jobs",
  "customers",
  "office",
  "settings",
  "reviews",
  "signup",
  "login",
  "referral",
  "notifications",
  "invoices",
]);

export const Route = createFileRoute("/pro/$slug")({
  beforeLoad: ({ params }) => {
    if (RESERVED_SLUGS.has(params.slug)) throw notFound();
    if (!getPro(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const pro = getPro(params.slug);
    if (!pro) {
      return marketingHead({
        title: "Pro not found | HomesBrain",
        description: "This pro is not listed on HomesBrain.",
        path: `/pro/${params.slug}`,
        noindex: true,
      });
    }
    const tradeStr = pro.trades.map((t) => TRADE_LABELS[t]).join(", ");
    return marketingHead({
      title: `${pro.name} - ${tradeStr} in ${pro.city}, FL | HomesBrain`,
      description: pro.about
        ? pro.about.slice(0, 155)
        : `${pro.name}: ${tradeStr} in ${pro.city}, St. Johns County, Florida.`,
      path: `/pro/${params.slug}`,
      geo: true,
    });
  },
  component: ProProfile,
  notFoundComponent: () => (
    <MarketingShell>
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-3xl font-bold text-ink">Pro not found</h1>
        <p className="mt-3 text-muted">
          This profile is not listed. Browse the full directory instead.
        </p>
        <div className="mt-6">
          <Link to="/pros">
            <Btn variant="coral">See all pros</Btn>
          </Link>
        </div>
      </div>
    </MarketingShell>
  ),
});

function ProProfile() {
  const { slug } = Route.useParams();
  const pro = getPro(slug)!;
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <MarketingShell>
      <JsonLd pro={pro} />

      <div className="mx-auto max-w-4xl px-5 pt-6 pb-16">
        <Link
          to="/pros"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} /> All pros
        </Link>

        {/* Header */}
        <header className="mt-6 rounded-3xl border border-line bg-paper p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <Eyebrow accent="coral">{pro.city}, St. Johns County</Eyebrow>
              <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
                {pro.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pro.trades.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-soft px-2.5 py-1 text-xs font-semibold text-ink/80"
                  >
                    {TRADE_LABELS[t]}
                  </span>
                ))}
              </div>
            </div>
            {pro.verified ? (
              <Pill accent="coral">
                <ShieldCheck size={12} strokeWidth={2.5} />
                <span className="ml-0.5">Verified</span>
              </Pill>
            ) : (
              <Pill accent="ink">Listing</Pill>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Btn
              variant="coral"
              size="lg"
              onClick={() => setContactOpen(true)}
              className="w-full sm:w-auto"
            >
              Contact this pro
            </Btn>
            <a
              href={`tel:${pro.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink hover:bg-soft transition-colors"
            >
              <Phone size={16} strokeWidth={2} />
              <span className="tnum">{pro.phone}</span>
            </a>
          </div>
        </header>

        {/* Info grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contact + web card */}
          <Card className="md:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
              Contact
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <ContactRow icon={<MapPin size={14} strokeWidth={2} />}>
                {pro.city}, St. Johns County, FL
              </ContactRow>
              <ContactRow icon={<Phone size={14} strokeWidth={2} />}>
                <a
                  href={`tel:${pro.phone.replace(/[^\d+]/g, "")}`}
                  className="text-ink hover:text-coraldark transition-colors tnum"
                >
                  {pro.phone}
                </a>
              </ContactRow>
              {pro.website && (
                <ContactRow icon={<Globe size={14} strokeWidth={2} />}>
                  <a
                    href={pro.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink hover:text-coraldark transition-colors"
                  >
                    {pro.website.replace(/^https?:\/\//, "")}
                  </a>
                </ContactRow>
              )}
              {pro.socials?.facebook && (
                <ContactRow icon={<Facebook size={14} strokeWidth={2} />}>
                  <a
                    href={pro.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink hover:text-coraldark transition-colors"
                  >
                    Facebook
                  </a>
                </ContactRow>
              )}
              {pro.socials?.instagram && (
                <ContactRow icon={<Instagram size={14} strokeWidth={2} />}>
                  <a
                    href={pro.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink hover:text-coraldark transition-colors"
                  >
                    Instagram
                  </a>
                </ContactRow>
              )}
              {pro.hours && (
                <ContactRow icon={<Clock size={14} strokeWidth={2} />}>{pro.hours}</ContactRow>
              )}
            </div>
          </Card>

          {/* Google card */}
          {pro.googleRating != null && (
            <Card>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
                Google
              </h2>
              <div className="mt-3 flex items-baseline gap-2">
                <Star size={20} strokeWidth={2} className="fill-amber text-amber" />
                <span className="text-3xl font-bold text-ink tnum">
                  {pro.googleRating.toFixed(1)}
                </span>
              </div>
              {pro.googleReviewCount != null && (
                <p className="text-sm text-muted tnum">
                  {pro.googleReviewCount} reviews
                </p>
              )}
              {pro.googlePlaceUrl && (
                <a
                  href={pro.googlePlaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-indigo hover:underline"
                >
                  See on Google →
                </a>
              )}
            </Card>
          )}
        </div>

        {/* About - verified only */}
        {pro.verified && pro.about && (
          <Card className="mt-6">
            <h2 className="text-lg font-bold text-ink">About</h2>
            <p className="mt-3 text-ink leading-relaxed">{pro.about}</p>
          </Card>
        )}

        {/* Deals - verified only */}
        {pro.verified && pro.deals && pro.deals.length > 0 && (
          <Card className="mt-6 !bg-coralbg !border-coral/25">
            <h2 className="text-lg font-bold text-coraldark flex items-center gap-2">
              <Tag size={16} strokeWidth={2} /> Deals for HomesBrain homeowners
            </h2>
            <ul className="mt-3 space-y-2">
              {pro.deals.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral"
                  />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 rounded-3xl border border-line bg-soft p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Ready to get in touch?
          </h2>
          <p className="mt-2 text-muted">
            We'll pass your info to {pro.name}. No spam, ever.
          </p>
          <div className="mt-5">
            <Btn variant="coral" size="lg" onClick={() => setContactOpen(true)}>
              Contact this pro
            </Btn>
          </div>
        </div>

        {/* Claim link - listing pros only */}
        {!pro.verified && (
          <div className="mt-6 text-center">
            <a
              href={`mailto:hello@homesbrain.com?subject=${encodeURIComponent(
                `Claim ${pro.name}`,
              )}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo hover:underline"
            >
              <MailQuestion size={14} strokeWidth={2} /> Are you this pro? Claim your profile
            </a>
          </div>
        )}
      </div>

      <ContactProModal
        pro={pro}
        open={contactOpen}
        onOpenChange={setContactOpen}
        source="pro_profile"
      />
    </MarketingShell>
  );
}

function ContactRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-ink/80">
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function JsonLd({ pro }: { pro: Pro }) {
  const url = `${SITE_URL}/pro/${pro.slug}`;
  const localBusiness: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name: pro.name,
    telephone: pro.phone,
    url,
    areaServed: {
      "@type": "AdministrativeArea",
      name: "St. Johns County, Florida",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: pro.city,
      addressRegion: "FL",
      addressCountry: "US",
    },
  };
  if (pro.website) localBusiness.sameAs = [pro.website];
  if (pro.googleRating != null && pro.googleReviewCount != null) {
    localBusiness.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: pro.googleRating,
      reviewCount: pro.googleReviewCount,
    };
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Find a pro", item: `${SITE_URL}/pros` },
      { "@type": "ListItem", position: 3, name: pro.name, item: url },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
