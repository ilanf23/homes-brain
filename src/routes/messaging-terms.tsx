import { createFileRoute, Link } from "@tanstack/react-router";
import { marketingHead } from "@/components/marketing";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";

/* SMS program terms required for A2P 10DLC registration and TCPA compliance.
   Content must match the registered campaign: same sender (HomesBrain), same
   use case (service records + due-for-service reminders). Do not add other
   message types, marketing, or auth/OTP language here. */

export const Route = createFileRoute("/messaging-terms")({
  head: () =>
    marketingHead({
      title: "Messaging & SMS Terms - HomesBrain",
      description:
        "The HomesBrain SMS Program: service records and service reminders sent to homeowners who consented. Reply STOP to opt out.",
      path: "/messaging-terms",
    }),
  component: MessagingTerms,
});

function MessagingTerms() {
  return (
    <LegalPage
      title="Messaging & SMS Terms"
      updated="July 13, 2026"
      intro="These terms describe the HomesBrain SMS Program: what we send, who consented, and how to stop it. They supplement our Terms of Service and Privacy Policy."
    >
      <LegalSection title="1. Program name">
        <p>HomesBrain SMS Program.</p>
      </LegalSection>

      <LegalSection title="2. Who sends, who receives, and why">
        <p>
          HomesBrain sends text messages on behalf of the home-service professional to the
          homeowner who received service. Homeowners receive: (1) a notification when a new service
          record is added to their home, and (2) reminders when equipment at their home is due for
          service.
        </p>
      </LegalSection>

      <LegalSection title="3. How you consent (opt-in)">
        <LegalList
          items={[
            "(a) At the time of service, the professional collects your mobile number and your consent to receive service records and reminders, and confirms it in the HomesBrain app.",
            <>
              (b) When you create or claim your HomesBrain account at{" "}
              <a
                href="https://homesbrain.com"
                className="font-semibold text-indigo hover:underline"
              >
                homesbrain.com
              </a>
              , you agree to these Messaging Terms and the Privacy Policy.
            </>,
          ]}
        />
        <p>Consent is not a condition of purchasing any service.</p>
      </LegalSection>

      <LegalSection title="4. Example messages">
        <LegalList
          items={[
            <>
              "[Business] added a new service record to your home at [address] on HomesBrain: [work
              done]. See it: https://homesbrain.com/claim/xxxx Reply STOP to opt out."
            </>,
            <>
              "Hi [name], it's [Business] via HomesBrain. Your [equipment] is due for service
              around [date]. Reply here and we'll get you scheduled. Reply STOP to opt out, HELP
              for help."
            </>,
            <>
              "[Business]: Your service record is saved to your home on HomesBrain:
              https://homesbrain.com/home. Msg & data rates may apply. Reply STOP to opt out."
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Message frequency">
        <p>Message frequency varies.</p>
      </LegalSection>

      <LegalSection title="6. Cost">
        <p>Message and data rates may apply.</p>
      </LegalSection>

      <LegalSection title="7. Opt out (STOP) and help (HELP)">
        <p>
          Text <strong>STOP</strong> to cancel at any time. Text <strong>HELP</strong> for help, or
          email support@homesbrain.com.
        </p>
        <p>
          Opting out of SMS does not delete your home record. You can still access it on the web.
        </p>
      </LegalSection>

      <LegalSection title="8. Privacy">
        <p>
          Phone numbers and message content are handled per our{" "}
          <Link to="/privacy" className="font-semibold text-indigo hover:underline">
            Privacy Policy
          </Link>
          . No mobile information, including your phone number, and no SMS or messaging consent
          will be shared with, sold to, or disclosed to any third parties or affiliates for
          marketing or promotional purposes. Text messaging originator opt-in data and consent are
          never shared with third parties.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>HomesBrain, Inc.: support@homesbrain.com.</p>
      </LegalSection>
    </LegalPage>
  );
}
