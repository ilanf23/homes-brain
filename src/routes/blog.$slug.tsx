import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Btn, Eyebrow, Pill } from "@/lib/ui";
import { CtaBand, MarketingShell, marketingHead, SITE_URL } from "@/components/marketing";
import { formatPostDate, getPost } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post)
      return {
        meta: [{ title: "Guide not found — HomesBrain" }, { name: "robots", content: "noindex" }],
      };
    return {
      ...marketingHead({
        title: `${post.title} — HomesBrain guides`,
        description: post.description,
        path: `/blog/${post.slug}`,
      }),
    };
  },
  component: BlogPost,
});

function BlogPost() {
  const { post } = Route.useLoaderData();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "HomesBrain", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <MarketingShell mobileCta={null}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <article className="mx-auto max-w-2xl px-5 py-14">
        {/* Article header */}
        <header>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M9 3 5 7l4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            All guides
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <Pill accent="coral">{post.tag}</Pill>
            <span className="text-xs text-muted font-mono tnum">{post.readMinutes} min read</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl tracking-tight text-ink leading-[1.1]">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted">{post.description}</p>
          <div className="mt-5 pb-6 border-b border-line text-sm text-muted">
            {post.author} · {formatPostDate(post.date)}
          </div>
        </header>

        {/* Body */}
        <div className="mt-8 space-y-8">
          {post.sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2 className="text-2xl tracking-tight text-ink">{s.heading}</h2>}
              <div className={`${s.heading ? "mt-3" : ""} space-y-4`}>
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-[17px] leading-relaxed text-ink/85">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* In-article homeowner CTA */}
        <aside className="mt-12 rounded-[22px] bg-coralbg border border-coral/20 p-6 sm:p-8 text-center">
          <Eyebrow accent="coral">Free for homeowners</Eyebrow>
          <p className="mt-3 text-xl font-semibold tracking-tight font-display text-ink">
            A home that keeps its own records.
          </p>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Every time a pro services your home, the equipment, warranty, and work land in your
            record automatically.
          </p>
          <div className="mt-5">
            <Link to="/for-homeowners">
              <Btn variant="coral" size="lg">
                Claim your home, free
              </Btn>
            </Link>
          </div>
        </aside>
      </article>

      <CtaBand eyebrow="Keep reading" accent="coral" title="More guides, fewer surprises.">
        <Link to="/blog">
          <Btn variant="secondary" size="lg">
            Browse all guides
          </Btn>
        </Link>
      </CtaBand>
    </MarketingShell>
  );
}
