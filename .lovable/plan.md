# Why the pro sees "couldn't send email"

## What I found

Edge-function logs confirm exactly one recent call to `invite-claim` for pro Maverich, and it returned **HTTP 400**:

```
POST | 400 | .../functions/v1/invite-claim   (13:27:25Z)
```

In `supabase/functions/invite-claim/index.ts`, the only path that returns 400 is:

```ts
if (typeof customer_id !== "string" || !customer_id) {
  return json({ ok: false, code: "bad_request" }, 400);
}
```

So the edge function is telling us the request body had no (or an empty) `customer_id`. Yet the DB shows the customer WAS inserted (`e42ff547-... "Customer" avfone@gmail.com`) and a record WAS created (`cf9ed0ee-...`, `sent_email_at = null`) at the same instant. The client-side variable therefore had the id in scope for the DB insert but somehow reached `deliverRecord()` without it — or the body serialization dropped it.

Two things then combine to produce the poor UX:

1. `invite-claim` returns `{ ok:false, code:"bad_request" }` with status 400.
2. In `src/routes/pro.jobs.new.tsx > deliverRecord()`, `supabase.functions.invoke(...)` on a non-2xx response gives `data === null` and `error.message === "Edge Function returned a non-2xx status code"`. The specific `code: "bad_request"` in the JSON body is discarded. Our `deliveryErrorMessage()` then falls through to the generic:

   > "Check your connection and try the email again."

That is the toast the pro is seeing. It's a lie — nothing is wrong with the connection; the server rejected the payload as malformed and we swallowed the real reason.

## Plan (two small, targeted changes)

### 1. Surface the real error code on the client

In `src/routes/pro.jobs.new.tsx > deliverRecord()`, when `sendErr` is set but `sendResp` is null, parse the JSON body off `sendErr.context` (a `Response`) before falling back to the generic string. Then the retry loop and toast can react to the actual `code` (`bad_request`, `no_email`, `not_configured`, etc.). No behavior change on the happy path.

Also extend `deliveryErrorMessage()` with a case for `bad_request` and `no_email` so pros get a real sentence instead of the connection-blame line.

### 2. Log the offending body on the edge

In `supabase/functions/invite-claim/index.ts`, on the `bad_request` branch, `console.error` the body shape (keys present, types, whether `customer_id` was empty vs. missing). This is a one-line change and gives us the ground truth on the next real send instead of guessing. Nothing else about the function changes.

### 3. Verify

- Typecheck.
- On the next pro job send, either:
  - The pro sees a specific error (e.g. `bad_request`, `no_email`) instead of the connection message, and the invite-claim log tells us which field was empty; or
  - The send succeeds because the bug was a transient client state issue, and the improved messaging is only defensive.

## Technical details

- `src/routes/pro.jobs.new.tsx` lines ~1070–1130 (`deliverRecord`) and ~132–137 (`deliveryErrorMessage`).
- `supabase/functions/invite-claim/index.ts` lines ~395–405 (bad_request branch), add a single `console.error` with `{ hasBody: !!body, keys: Object.keys(body ?? {}), customerIdType: typeof body?.customer_id, customerIdEmpty: body?.customer_id === "" }`.

## Out of scope

- No changes to the send/Resend logic, templates, auth, or A2P/SMS work.
- No schema/RLS changes.
- Not disabling or rewriting the send path — this is instrumentation + honest error copy.
