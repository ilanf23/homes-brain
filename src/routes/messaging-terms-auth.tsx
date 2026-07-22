import { createFileRoute, Link } from "@tanstack/react-router";
import { marketingHead } from "@/components/marketing";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";

/* SMS program terms for the HomesBrain Authentication (OTP) campaign.
   Required for A2P 10DLC 2FA use-case registration. Scope: one-time
   passcodes sent to phone numbers entered on the HomesBrain login screen
   for the sole purpose of authenticating the account holder. Do not add
   marketing, service-record, reminder, or promotional language here -
   those live in /messaging-terms. */

export const Route = createFileRoute("/messaging-terms-auth")({
  head: () =>
    marketingHead({
      title: "SMS Authentication Terms - HomesBrain",
      description:
        "How HomesBrain sends one-time login passcodes by text: what we send, who receives them, and how to opt out.",
      path: "/messaging-terms-auth",
    }),
  component: MessagingTermsAuth,
});

function MessagingTermsAuth() {
  return (
    <LegalPage
      title="SMS Authentication Terms"
      updated="July 22, 2026"
      intro="These terms describe the HomesBrain Authentication SMS Program: one-time passcodes sent by text to verify sign-in to a HomesBrain account. They supplement our Terms of Service and Privacy Policy, and are separate from the HomesBrain service-record SMS program described in our Messaging Terms."
      draft={false}
    >
      <LegalSection title="1. Program name">
        <p>HomesBrain Authentication SMS Program.</p>
      </LegalSection>

      <LegalSection title="2. Who sends, who receives, and why">
        <p>
          HomesBrain sends one-time passcodes (OTPs) to homeowners and home-service professionals
          who request them from the HomesBrain login screen on{" "}
          <a
            href="https://homesbrain.com/login"
            className="font-semibold text-indigo hover:underline"
          >
            homesbrain.com/login
          </a>{" "}
          or in the HomesBrain iOS/Android app. Codes are 6 digits, valid for 10 minutes, and
          single-use. They are used solely to authenticate the account holder for that sign-in
          attempt.
        </p>
      </LegalSection>

      <LegalSection title="3. How you opt in (consent)">
        <p>
          You opt in by entering your mobile number on the HomesBrain login screen and tapping{" "}
          <strong>Send code</strong>. Directly above the phone input the following disclosure is
          shown:
        </p>
        <div className="rounded-2xl border border-line bg-soft p-5 text-sm text-ink">
          By tapping <strong>Send code</strong>, you agree to receive a one-time passcode by SMS
          from HomesBrain for the sole purpose of signing in to your account. Msg &amp; data rates
          may apply. Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help. See our{" "}
          <Link to="/messaging-terms-auth" className="font-semibold text-indigo hover:underline">
            SMS Authentication Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold text-indigo hover:underline">
            Privacy Policy
          </Link>
          .
        </div>
        <p>
          Consent is not a condition of any purchase or service. Consent is limited to
          authentication codes; it does not authorize marketing, promotional, or other messages.
        </p>
      </LegalSection>

      <LegalSection title="4. Example messages">
        <LegalList
          items={[
            <>"HomesBrain: Your login code is 428193. Expires in 10 minutes. Reply STOP to opt out, HELP for help."</>,
            <>"HomesBrain: 739024 is your verification code. Do not share this code with anyone. Reply STOP to opt out."</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Message frequency">
        <p>
          One message per sign-in attempt you initiate. You may request a new code up to a small
          number of times per hour if you did not receive one; further attempts are rate-limited to
          prevent abuse.
        </p>
      </LegalSection>

      <LegalSection title="6. Cost">
        <p>Message and data rates may apply.</p>
      </LegalSection>

      <LegalSection title="7. Opt out (STOP) and help (HELP)">
        <p>
          Text <strong>STOP</strong> to cancel at any time. Once opted out, HomesBrain will not send
          you further authentication codes by SMS; you can still sign in using email. Text{" "}
          <strong>HELP</strong> for help, or email support@homesbrain.com.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          HomesBrain will never ask you to share, read back, or forward an authentication code.
          Anyone asking for your code is attempting to take over your account. Codes are single-use
          and expire in 10 minutes.
        </p>
      </LegalSection>

      <LegalSection title="9. Privacy">
        <p>
          Phone numbers used for authentication are handled per our{" "}
          <Link to="/privacy" className="font-semibold text-indigo hover:underline">
            Privacy Policy
          </Link>
          . No mobile information, including your phone number, and no SMS or messaging consent
          will be shared with, sold to, or disclosed to any third parties or affiliates for
          marketing or promotional purposes. Text messaging originator opt-in data and consent are
          never shared with third parties.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>HomesBrain, Inc.: support@homesbrain.com.</p>
      </LegalSection>
    </LegalPage>
  );
}
