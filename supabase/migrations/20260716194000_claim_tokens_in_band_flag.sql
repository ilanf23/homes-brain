-- Mark claim tokens that are returned to the API caller in-band (the QR flow)
-- rather than delivered to the bound email's inbox.
--
-- claim-exchange mints a login session for the email a token is bound to, on the
-- assumption that possessing the token proves control of that inbox. That holds
-- for tokens delivered by email (invite-claim, pro-login, homeowner-login,
-- send-follow-up), but NOT for claim-qr, which binds a pro-entered customer.email
-- and hands the claim URL straight back to the pro. A pro could therefore mint a
-- login session for any email they type. This flag lets claim-exchange refuse an
-- in-band session for such tokens and instead email the sign-in link, so only the
-- real inbox owner can complete login.
--
-- Default false = existing email-delivered flows are unchanged. Only claim-qr
-- sets it true. Any future in-band token source MUST set in_band = true.

ALTER TABLE public.claim_tokens
  ADD COLUMN IF NOT EXISTS in_band boolean NOT NULL DEFAULT false;
