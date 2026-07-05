import { createFileRoute, Link } from "@tanstack/react-router";
import { Pill } from "@/lib/ui";
import { Logo } from "@/components/svg";

// Entry chooser behind every generic "Start free" CTA. Pros go straight to
// signup; homeowners have no self-serve signup (they claim from a record a
// pro sends), so their path routes to the homeowner story.

export const Route = createFileRoute("/start")({
  head: () => ({ meta: [{ title: "Get started - HomesBrain" }] }),
  component: Start,
});

const PATHS = [
  {
    to: "/pro/signup",
    pill: "Pro",
    title: "I'm a home service pro",
    sub: "Log a job in 30 seconds and send a branded record. Free to start, no card.",
    cta: "Start free",
  },
  {
    to: "/for-homeowners",
    pill: "Homeowner",
    title: "I own a home",
    sub: "Claim your home free from the record your pro sends. It fills itself.",
    cta: "See how it works",
  },
] as const;

function Start() {
  return (
    <div className="min-h-dvh bg-soft">
      <header className="border-b border-line bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <Pill accent="indigo">Get started</Pill>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        <div className="anim-fade-up text-center mb-8">
          <h1 className="text-3xl tracking-tight">How do you want to start?</h1>
          <p className="mt-2 text-sm text-muted">
            HomesBrain is free for both. Pick the side you're on.
          </p>
        </div>

        <div className="anim-fade-up d-1 space-y-3">
          {PATHS.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="pressable liftable block rounded-2xl border border-line bg-paper p-5 hover:border-indigo transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <Pill accent="indigo">{p.pill}</Pill>
                <span className="flex items-center gap-1 text-sm font-semibold text-indigo">
                  {p.cta}
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M5 3l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <div className="mt-3 text-lg font-bold text-ink">{p.title}</div>
              <div className="mt-1 text-sm text-muted">{p.sub}</div>
            </Link>
          ))}
        </div>

        <div className="anim-fade-up d-2 mt-6 text-center text-xs text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
