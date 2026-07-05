import { createFileRoute, Link } from "@tanstack/react-router";
import { marketingHead } from "@/components/marketing";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";

export const Route = createFileRoute("/terms")({
  head: () =>
    marketingHead({
      title: "Terms of Service - HomesBrain",
      description:
        "The terms that govern use of HomesBrain by home-service professionals and homeowners.",
      path: "/terms",
      noindex: true,
    }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 4, 2026"
      intro="These Terms govern your use of HomesBrain. By creating an account or claiming a home record, you agree to them. “Pros” are home-service professionals using HomesBrain for their business; “homeowners” are people who claim or manage a home record."
    >
      <LegalSection title="1. Accounts">
        <LegalList
          items={[
            "You must provide accurate information and keep your contact details current.",
            "You are responsible for activity under your account. Authentication is by one-time code to your phone or email, so protect access to both.",
            "You must be at least 18 and able to form a binding contract to use HomesBrain.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Acceptable use">
        <LegalList
          items={[
            "Log only work you actually performed, for customers who are actually yours.",
            "Only add customer contact information when you have the customer's consent to be contacted. HomesBrain captures and stores this consent when a homeowner is added.",
            "No spam, harassment, misrepresentation, or attempts to access data that isn't yours.",
            "No review gating: every customer receives the same review request. Do not use HomesBrain to selectively solicit reviews.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Pro responsibilities">
        <LegalList
          items={[
            "You are solely responsible for the quality, legality, and licensing of the work you perform.",
            "Service records you create must be accurate. Homeowners rely on them.",
            "You are responsible for complying with laws that apply to your business, including consumer-contact and telemarketing rules.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Homeowner responsibilities">
        <LegalList
          items={[
            "Claim only homes you own or are authorized to manage.",
            "Information you add to your record must be accurate to the best of your knowledge.",
            "Sharing your record (for example with a buyer) is your choice and your responsibility.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Records and data ownership">
        <p>
          The home record belongs with the home. Homeowners own their claimed home record and may
          export it. Pros retain access to the job records they created. HomesBrain has a license to
          host, display, and transmit this content as needed to provide the service.
        </p>
      </LegalSection>

      <LegalSection title="6. Payments">
        <LegalList
          items={[
            "Paid plans are billed monthly and can be canceled anytime; cancellation takes effect at the end of the billing period.",
            "Payments between homeowners and Pros are processed by Stripe. HomesBrain is not a party to the underlying service transaction and never stores card numbers.",
            "Fees are non-refundable except where required by law.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Recall and warranty information">
        <p>
          Recall checks and warranty tracking are informational conveniences based on data provided
          by Pros and public sources. They are not a guarantee, inspection, or substitute for
          manufacturer or government notices.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers and limitation of liability">
        <p>
          HomesBrain is provided “as is.” To the maximum extent permitted by law, we disclaim
          implied warranties and are not liable for indirect, incidental, or consequential damages,
          or for the acts or omissions of Pros or homeowners. Our total liability is limited to the
          amounts you paid us in the twelve months before the claim.
        </p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p>
          You may close your account at any time. We may suspend or terminate accounts that violate
          these Terms (including consent and review-gating violations) or that create risk for
          other users. Homeowner records survive a Pro's termination.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes and contact">
        <p>
          We may update these Terms; material changes will be notified through the service. See also
          the{" "}
          <Link to="/privacy" className="font-semibold text-indigo hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/messaging-terms" className="font-semibold text-indigo hover:underline">
            Messaging Terms
          </Link>
          . Contact: legal@homesbrain.com.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
