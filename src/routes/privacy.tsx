import { createFileRoute, Link } from "@tanstack/react-router";
import { marketingHead } from "@/components/marketing";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";

/* Publicly reachable and indexable: A2P 10DLC registration requires a live,
   linkable Privacy Policy. Do not add noindex here. */

export const Route = createFileRoute("/privacy")({
  head: () =>
    marketingHead({
      title: "Privacy Policy - HomesBrain",
      description:
        "How HomesBrain collects, uses, shares, and protects data for home-service pros and homeowners, and the rights you have over your information.",
      path: "/privacy",
    }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 4, 2026"
      intro="HomesBrain, Inc. (“HomesBrain,” “we,” “us”) provides a home service-record platform used by home-service professionals (“Pros”) and homeowners. This policy explains what we collect, how we use it, who we share it with, and the choices you have."
      draft={false}
    >
      <LegalSection title="1. Information we collect">
        <LegalList
          items={[
            <>
              <strong>Account information.</strong> For Pros: business name, trade, service area,
              contact details, and logo. For homeowners: phone number and/or email used to claim a
              home record.
            </>,
            <>
              <strong>Home and service data.</strong> Property address, equipment details (make,
              model, serial, warranty), service history, photos of equipment, and scheduled service
              dates, entered by Pros in the course of doing work, or by homeowners on their own
              record.
            </>,
            <>
              <strong>Customer contact information.</strong> When a Pro logs a job, they provide
              their customer's name and contact details along with a record of the customer's
              consent to be contacted.
            </>,
            <>
              <strong>Usage data.</strong> Product events (for example, when a record is sent or
              viewed), device and browser information, and log data used to operate and improve the
              service.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="2. How we use information">
        <LegalList
          items={[
            "To create, deliver, and maintain home service records.",
            "To send service records, reminders, and review requests on a Pro's behalf, where consent has been captured.",
            "To check logged equipment against public recall information.",
            "To operate, secure, and improve the service, including fraud prevention and support.",
            "To comply with legal obligations.",
          ]}
        />
        <p>We do not sell personal information.</p>
      </LegalSection>

      <LegalSection title="3. How we share information">
        <LegalList
          items={[
            <>
              <strong>Between Pros and homeowners.</strong> A Pro sees only the customers and jobs
              they created. A homeowner who claims a home sees the service history of that home,
              including which Pros performed the work.
            </>,
            <>
              <strong>Service providers.</strong> We use vendors to run the platform: hosting and
              database (Supabase), payment processing (Stripe), and SMS/email delivery providers.
              They process data only to provide their service to us.
            </>,
            <>
              <strong>Payments.</strong> Card payments are processed by Stripe. HomesBrain never
              stores card numbers.
            </>,
            <>
              <strong>Legal.</strong> We may disclose information if required by law or to protect
              the rights, safety, or property of HomesBrain or others.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Data retention">
        <p>
          Home records are designed to be durable: service history stays with the home so long as
          the record exists. Account data is retained while your account is active and for a
          reasonable period afterward as required for legal, accounting, or security purposes. You
          may request deletion of your personal data at any time (see Section 6).
        </p>
      </LegalSection>

      <LegalSection title="5. Security">
        <p>
          Data is encrypted in transit and at rest. Access is restricted with row-level security:
          Pros can access only their own business data, homeowners only their claimed home. See our{" "}
          <Link to="/security" className="font-semibold text-indigo hover:underline">
            plain-English security overview
          </Link>{" "}
          for more.
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights and choices">
        <LegalList
          items={[
            "Access, correct, or export your data. Home records are portable: you can export your home's history.",
            "Delete your account and personal data, subject to legal retention requirements.",
            "Opt out of SMS at any time by replying STOP, and of marketing email via the unsubscribe link.",
            "Depending on where you live, you may have additional rights (for example under CCPA or GDPR). We honor verified requests.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Text messaging / SMS">
        <p>
          HomesBrain sends service records and reminders about your home via SMS to recipients who
          have consented.
        </p>
        <LegalList
          items={[
            "Message frequency varies.",
            "Message and data rates may apply.",
            <>
              Text <strong>STOP</strong> to unsubscribe at any time. Text <strong>HELP</strong> for
              help, or email support@homesbrain.com.
            </>,
            "No mobile information - including your phone number - and no SMS or messaging consent will be shared with, sold to, or disclosed to any third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent are never shared with third parties.",
          ]}
        />
        <p>
          See our{" "}
          <Link to="/messaging-terms" className="font-semibold text-indigo hover:underline">
            Messaging Terms
          </Link>{" "}
          for the full SMS program details.
        </p>
      </LegalSection>

      <LegalSection title="8. Children">
        <p>
          HomesBrain is not directed to children under 16, and we do not knowingly collect their
          personal information.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        <p>
          We will post any changes here and update the date above. Material changes will be
          communicated through the service or by email.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          HomesBrain, Inc.: privacy@homesbrain.com. See also our{" "}
          <Link to="/terms" className="font-semibold text-indigo hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/messaging-terms" className="font-semibold text-indigo hover:underline">
            Messaging Terms
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
