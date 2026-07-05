import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Eyebrow, Pill } from "@/lib/ui";
import { CtaBand, MarketingShell, marketingHead } from "@/components/marketing";
import { BLOG_POSTS, formatPostDate } from "@/lib/blog";

export const Route = createFileRoute("/blog/")({
  head: () =>
    marketingHead({
      title: "HomesBrain guides — keep your home remembered.",
      description:
        "Practical guides for homeowners: maintenance schedules, what records to keep, and how to make your home remember itself.",
      path: "/blog",
    }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <MarketingShell mobileCta={null}>
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-12 text-center">
        <div className="anim-fade-up">
          <Eyebrow accent="coral">Guides</Eyebrow>
        </div>
        <h1 className="anim-fade-up d-1 mt-4 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          Keep your home remembered.
        </h1>
        <p className="anim-fade-up d-2 mt-6 text-lg text-muted">
          Short, practical guides on maintaining the biggest thing you own — and on never losing its
          paperwork again.
        </p>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-5">
          {BLOG_POSTS.length === 0 ? (
            <Card className="text-center py-14 border-dashed">
              <p className="text-muted">Guides are on their way. Check back soon.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {BLOG_POSTS.map((p, i) => (
                <Link
                  key={p.slug}
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className={`anim-fade-up d-${Math.min(i + 1, 6)} group block`}
                >
                  <Card lift className="h-full">
                    <div className="flex items-center justify-between gap-3">
                      <Pill accent="coral">{p.tag}</Pill>
                      <span className="text-xs text-muted font-mono tnum">{p.readMinutes} min</span>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold tracking-tight font-display group-hover:text-coral transition-colors">
                      {p.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted">{p.description}</p>
                    <div className="mt-4 text-xs text-muted">
                      {p.author} · {formatPostDate(p.date)}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBand
        eyebrow="Free for homeowners, forever"
        accent="coral"
        title="Reading about upkeep is good. A home that tracks its own is better."
        sub="Every pro visit fills your home's record automatically. You never type a thing."
      >
        <Link to="/for-homeowners">
          <Btn variant="coral" size="lg">
            Claim your home, free
          </Btn>
        </Link>
      </CtaBand>
    </MarketingShell>
  );
}
