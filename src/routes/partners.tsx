import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Btn, Card, Eyebrow, Field, Input, Pill, SectionHead, Select } from "@/lib/ui";
import { MarketingShell, marketingHead } from "@/components/marketing";
import { CheckBurst } from "@/components/svg";
import { logEvent } from "@/lib/hb";

export const Route = createFileRoute("/partners")({
  head: () =>
    marketingHead({
      title: "HomesBrain partners: every company that touches the home.",
      description:
        "Builders, realtors, inspectors, insurers, and home-watch firms: give every home you touch a memory from day one.",
      path: "/partners",
    }),
  component: Partners,
});

const PARTNER_TYPES = [
  {
    key: "Builders",
    title: "Builders",
    body: "Hand over every new home with its record already started: equipment, warranties, and serials from day one.",
  },
  {
    key: "Realtors",
    title: "Realtors",
    body: "List homes with a verified history attached. A documented home is an easier close on both sides.",
  },
  {
    key: "Inspectors",
    title: "Inspectors",
    body: "Turn the inspection into the seed of a living record instead of a PDF that dies in a download folder.",
  },
  {
    key: "Insurers",
    title: "Insurers",
    body: "Maintained homes are lower-risk homes. Verified service history you can actually underwrite against.",
  },
  {
    key: "Home-watch firms",
    title: "Home-watch firms",
    body: "Log every visit to the homes you watch: owners see the proof, you keep the contract.",
  },
];

function Partners() {
  const [form, setForm] = useState({ name: "", company: "", type: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await logEvent(null, "partner_lead", { ...form });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingShell mobileCta={null}>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pt-16 pb-14 text-center">
        <div className="anim-fade-up">
          <Eyebrow accent="indigo">Partners</Eyebrow>
        </div>
        <h1 className="anim-fade-up d-1 mt-4 text-4xl sm:text-6xl tracking-tight text-ink leading-[1.06]">
          Give every home a memory from day one.
        </h1>
        <p className="anim-fade-up d-2 mt-6 text-lg text-muted max-w-2xl mx-auto">
          If your business touches the home, you can start its record, and stay part of its story
          for as long as it stands.
        </p>
        <div className="anim-fade-up d-3 mt-8">
          <a href="#become-a-partner">
            <Btn variant="indigo" size="lg">
              Become a partner
            </Btn>
          </a>
        </div>
      </section>

      {/* Partner cards */}
      <section className="bg-soft border-y border-line py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="Who we work with"
            title="Every company that touches the home"
          />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PARTNER_TYPES.map((p, i) => (
              <Card key={p.key} lift className={`anim-fade-up d-${Math.min(i + 1, 6)}`}>
                <Pill accent="indigo">{p.title}</Pill>
                <p className="mt-4 text-sm text-muted">{p.body}</p>
              </Card>
            ))}
            <Card lift className="anim-fade-up d-6 border-dashed">
              <Pill accent="ink">Someone else?</Pill>
              <p className="mt-4 text-sm text-muted">
                Property managers, warranty companies, utilities: if you touch the home, we want to
                talk. Tell us who you are below.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Lead form */}
      <section id="become-a-partner" className="py-20">
        <div className="mx-auto max-w-xl px-5">
          <SectionHead
            accent="indigo"
            eyebrow="Become a partner"
            title="Tell us where you fit"
            sub="A short note is all it takes. We'll come back within a couple of days."
          />
          <Card className="mt-10">
            {done ? (
              <div className="anim-scale-in text-center py-8">
                <CheckBurst size={64} className="mx-auto text-indigo" />
                <h3 className="mt-4 text-xl font-semibold tracking-tight font-display">
                  Thanks, we'll be in touch.
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Your note is in. Expect a reply at {form.email || "your email"} shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <Field label="Your name">
                  <Input
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jordan Rivera"
                  />
                </Field>
                <Field label="Company">
                  <Input
                    required
                    autoComplete="organization"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Rivera Homes"
                  />
                </Field>
                <Field label="What kind of partner are you?">
                  <Select
                    required
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="" disabled>
                      Choose one…
                    </option>
                    {PARTNER_TYPES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.title}
                      </option>
                    ))}
                    <option value="Other">Someone else</option>
                  </Select>
                </Field>
                <Field label="Work email">
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jordan@riverahomes.com"
                  />
                </Field>
                {error && (
                  <p role="alert" className="text-sm font-semibold text-red">
                    {error}
                  </p>
                )}
                <Btn
                  type="submit"
                  variant="indigo"
                  size="lg"
                  loading={submitting}
                  className="w-full"
                >
                  Become a partner
                </Btn>
              </form>
            )}
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
