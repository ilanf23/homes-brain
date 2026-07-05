import { createFileRoute, Link } from "@tanstack/react-router";
import { marketingHead } from "@/components/marketing";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";

/* SMS program terms required for A2P 10DLC registration and TCPA compliance.
   Keep the STOP/HELP, frequency, rates, and quiet-hours language intact. */

export const Route = createFileRoute("/messaging-terms")({
  head: () =>
    marketingHead({
      title: "Messaging & SMS Terms - HomesBrain",
      description:
        "What texts HomesBrain sends, how consent is captured, and how to opt out (reply STOP).",
      path: "/messaging-terms",
      noindex: true,
    }),
  component: MessagingTerms,
});

function MessagingTerms() {
  return (
    <LegalPage
      title="Messaging & SMS Terms"
      updated="July 4, 2026"
      intro="These terms describe HomesBrain's text-messaging program: what we send, who consented, and how to stop it. They supplement our Terms of Service and Privacy Policy."
    >
      <LegalSection title="1. What messages we send">
        <LegalList
          items={[
            "Service records: a link to the branded record after a Pro completes a job at your home.",
            "Claim and account messages: links and one-time codes to claim or access your home record.",
            "Service reminders: upcoming or due service dates for equipment on your record.",
            "Review requests: a one-time request to review the Pro who performed your service.",
          ]}
        />
        <p>We do not send marketing messages on behalf of third parties.</p>
      </LegalSection>

      <LegalSection title="2. Consent">
        <p>
          Consent to receive these messages is captured when your service professional adds you as a
          customer at the time of service: the Pro confirms, on the job, that you agreed to receive
          your service record and related messages by text and/or email. HomesBrain stores the time
          and reference of that consent. Consent is not a condition of purchasing any service.
        </p>
      </LegalSection>

      <LegalSection title="3. Message frequency">
        <p>
          Message frequency varies with service activity, typically one to three messages per
          service visit, plus occasional reminders when a service is due. No recurring message
          schedule applies.
        </p>
      </LegalSection>

      <LegalSection title="4. Opt out (STOP) and help (HELP)">
        <LegalList
          items={[
            <>
              Reply <strong>STOP</strong> to any message to opt out. You will receive a single
              confirmation message and nothing further.
            </>,
            <>
              Reply <strong>HELP</strong> for help, or contact support@homesbrain.com.
            </>,
            "Opting out of SMS does not delete your home record. You can still access it on the web, and email delivery (if consented) continues until you unsubscribe there too.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Rates and delivery">
        <LegalList
          items={[
            "Message and data rates may apply, per your mobile carrier's plan.",
            "Carriers are not liable for delayed or undelivered messages.",
            "We send messages between 8:00 AM and 9:00 PM in your local time zone (quiet hours are honored).",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Privacy">
        <p>
          Phone numbers and message content are handled per our{" "}
          <Link to="/privacy" className="font-semibold text-indigo hover:underline">
            Privacy Policy
          </Link>
          . We do not sell phone numbers, and mobile opt-in data is never shared with third parties
          for their own marketing.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>HomesBrain, Inc.: support@homesbrain.com.</p>
      </LegalSection>
    </LegalPage>
  );
}
