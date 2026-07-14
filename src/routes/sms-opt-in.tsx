import { createFileRoute, Link } from "@tanstack/react-router";
import { marketingHead } from "@/components/marketing";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";

/* Public A2P/Twilio compliance proof page. Must be reachable without any
   auth or redirect so carrier reviewers can see the opt-in flow as-is. */

export const Route = createFileRoute("/sms-opt-in")({
  head: () =>
    marketingHead({
      title: "SMS opt-in flow - HomesBrain",
      description:
        "How homeowners consent to receive text messages from HomesBrain, including the exact opt-in language and disclosures.",
      path: "/sms-opt-in",
    }),
  component: SmsOptIn,
});

function SmsOptIn() {
  return (
    <LegalPage
      title="SMS opt-in flow"
      updated="July 14, 2026"
      intro="How homeowners consent to receive text messages from HomesBrain."
      draft={false}
    >
      <LegalSection title="Program">
        <p>
          <strong>Sender:</strong> HomesBrain, on behalf of the home-service professional the
          homeowner hired.
        </p>
        <p>
          <strong>Recipients:</strong> homeowners who have opted in.
        </p>
        <p>
          <strong>Purpose:</strong> (1) service-record confirmations after a job, and (2)
          maintenance/service reminders. These are transactional/relationship messages tied to
          services the homeowner received.
        </p>
      </LegalSection>

      <LegalSection title="The opt-in as it appears at homesbrain.com/home/signup (and in account settings)">
        <div className="rounded-2xl border border-line bg-soft p-5 sm:p-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink" htmlFor="opt-in-phone">
              Mobile number (for text updates)
            </label>
            <input
              id="opt-in-phone"
              type="tel"
              disabled
              placeholder="(904) 555-0123"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/60 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div
              role="img"
              aria-label="Unchecked consent checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-line bg-white"
            />
            <p className="text-[15px] leading-relaxed text-ink/85">
              Text me my service records and reminders. By checking this box, I agree to receive
              recurring automated service and reminder text messages from HomesBrain at the number
              I provide. Consent is not a condition of any purchase or service. Msg & data rates may
              apply. Message frequency varies. Reply STOP to opt out, HELP for help. See our{" "}
              <Link to="/privacy" className="font-semibold text-indigo hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/messaging-terms" className="font-semibold text-indigo hover:underline">
                Messaging Terms
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted">
          The consent checkbox is unchecked by default. The homeowner must actively check it.
          Consent is never required to use HomesBrain.
        </p>
      </LegalSection>

      <LegalSection title="Disclosures">
        <LegalList
          items={[
            "Message types: service-record confirmations and maintenance/service reminders.",
            "Message frequency varies.",
            "Message and data rates may apply.",
            "Reply STOP to opt out and HELP for help.",
            "Mobile numbers and opt-in consent are never shared with third parties or affiliates for marketing.",
          ]}
        />
        <p>
          See the full{" "}
          <Link to="/privacy" className="font-semibold text-indigo hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/messaging-terms" className="font-semibold text-indigo hover:underline">
            Messaging Terms
          </Link>{" "}
          for more details.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
