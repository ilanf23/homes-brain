# Claim Invite Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pros send a homeowner in their CRM a real branded email (via Resend) inviting them to claim their home record, from the customer detail page, tracked with a 7-day cooldown.

**Architecture:** One dedicated Supabase edge function (`invite-claim`) does everything server-side: resolves the pro from the JWT, validates ownership and sendable state, finds the latest record, sends through Resend, stamps `customers.claim_invited_at`, and writes the `messages` audit row. The client is a thin button on the customer detail page that calls the function and renders the result. Spec: `docs/superpowers/specs/2026-07-06-claim-invite-email-design.md`.

**Tech Stack:** TanStack Start + React 19 + TypeScript, Supabase (Postgres, edge functions on Deno), Resend REST API, Bun.

## Global Constraints

- Never use em dashes (U+2014) anywhere: code, comments, copy, commits.
- Never edit `src/routeTree.gen.ts` or files in `src/integrations/supabase/` (all Lovable-generated). New columns are NOT added to `types.ts` by hand; client code casts through `as unknown as` (existing convention, see the `untyped` cast in `src/lib/hb.ts:59-61` and the `as unknown as Customer` cast in `pro.customers.$customerId.tsx:105`).
- Migrations go in `supabase/migrations/` and apply via git push (Lovable syncs and deploys). Never apply schema through the Supabase MCP.
- Edge functions ship in `supabase/functions/`; Lovable deploys them on git sync.
- Brand: indigo is the brand color; UI is built from `src/lib/ui.tsx` primitives (`Btn`, `Pill`) and `src/components/crm.tsx` (`ActionCircle`, `PropertyRow`). Email colors use the exact tokens: ink `#16160f`, muted `#73706a`, line `#e7e5de`, soft `#f7f6f1`, indigo `#473fb0`.
- No test suite exists (per CLAUDE.md). Each task verifies via `bun run lint`, `bunx tsc --noEmit`, and manual dev-server checks; the final task verifies the deployed flow end to end.
- Commands: `bun dev`, `bun run lint`, `bun run format`.
- Commit after every task. Never force-push or rewrite published history.

---

### Task 1: Migration for `customers.claim_invited_at`

**Files:**
- Create: `supabase/migrations/20260706233000_claim_invite.sql`
- Modify: `CLAUDE.md` (data model block, `customers` line)

**Interfaces:**
- Consumes: nothing.
- Produces: nullable `customers.claim_invited_at timestamptz`, read and written by the edge function (Task 2) with the service role, and read by the UI (Task 3) through the customer select.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260706233000_claim_invite.sql`:

```sql
-- Claim invite tracking: when the pro last emailed this customer an invite to
-- claim their home record. The invite-claim edge function stamps it (service
-- role) and enforces a 7 day cooldown against it. Nullable: never invited.
alter table public.customers add column if not exists claim_invited_at timestamptz;
```

- [ ] **Step 2: Update the CLAUDE.md data model**

In `CLAUDE.md`, find the line:

```
customers   ( id, pro_id, home_id, name, phone, email, consent_at, consent_ref )
```

Replace with:

```
customers   ( id, pro_id, home_id, name, phone, email, consent_at, consent_ref, claim_invited_at )
```

- [ ] **Step 3: Verify the SQL parses**

Run: `grep -c "claim_invited_at" supabase/migrations/20260706233000_claim_invite.sql CLAUDE.md`
Expected: `supabase/migrations/20260706233000_claim_invite.sql:2` (comment + statement) and `CLAUDE.md:1`. There is no local Postgres; the statement is a single `alter table ... add column if not exists`, safe and idempotent.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260706233000_claim_invite.sql CLAUDE.md
git commit -m "Add customers.claim_invited_at for claim invite tracking"
```

---

### Task 2: `invite-claim` edge function

**Files:**
- Create: `supabase/functions/invite-claim/index.ts`
- Modify: `supabase/config.toml` (append a comment block; no setting change)

**Interfaces:**
- Consumes: `customers.claim_invited_at` (Task 1); tables `pros(id,business,auth_user_id)`, `customers`, `homes`, `jobs`, `records`, `messages`; secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto-provisioned), `RESEND_API_KEY` (user adds later).
- Produces: HTTP contract used by Task 3. Request body: `{ customer_id: string, origin?: string }` with the caller's JWT in the Authorization header (supabase-js attaches it automatically). Responses, all JSON:
  - `200 { ok: true, invited_at: string }` on success.
  - `200 { ok: false, code: "no_email" | "already_claimed" | "no_record" | "not_configured" }` business rejections.
  - `200 { ok: false, code: "cooldown", invited_at: string }` within 7 days of the last send.
  - `400 { ok: false, code: "bad_request" }`, `403 { ok: false, code: "forbidden" }`, `502 { ok: false, code: "send_failed" }`, `500 { ok: false, code: "error" }`.

- [ ] **Step 1: Write the edge function**

Create `supabase/functions/invite-claim/index.ts` with exactly this content:

```ts
/* Claim invite email: a pro emails a homeowner in their CRM an invite to claim
   their home record. Everything is enforced server-side: the pro is resolved
   from the JWT, ownership is checked, the 7 day cooldown is checked, and the
   email goes out through Resend. Ships in the repo; Lovable deploys on git
   sync. Requires the RESEND_API_KEY secret; until it exists the function
   answers { ok: false, code: "not_configured" }. verify_jwt stays on (the
   default), so only signed-in users reach this code at all. */

import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_MS = 7 * 24 * 3600 * 1000;
const FALLBACK_ORIGIN = "https://homesbrain.com";
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/(www\.)?homesbrain\.com$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function claimOrigin(raw: unknown): string {
  if (typeof raw !== "string") return FALLBACK_ORIGIN;
  return ALLOWED_ORIGINS.some((re) => re.test(raw)) ? raw : FALLBACK_ORIGIN;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailText(business: string, address: string, url: string) {
  return [
    `${business} keeps a service record for ${address} on HomesBrain.`,
    "",
    "Every job they log builds a verified history for your home: what was done, when, and what's due next. Claim it free and it's yours for life.",
    "",
    `Claim your home record: ${url}`,
    "",
    `You're receiving this because ${business} logged a service visit at ${address}.`,
  ].join("\n");
}

function emailHtml(business: string, address: string, url: string) {
  const b = esc(business);
  const a = esc(address);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#473fb0;">HomesBrain</div>
      <div style="margin-top:16px;background:#ffffff;border:1px solid #e7e5de;border-radius:20px;padding:28px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#16160f;">${b} started a home record for ${a}</h1>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#73706a;">Every job they log builds a verified history for your home: what was done, when, and what's due next. Claim it free and it's yours for life.</p>
        <div style="margin-top:22px;">
          <a href="${url}" style="display:inline-block;background:#473fb0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 26px;">Claim your home record</a>
        </div>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.55;color:#73706a;">You're receiving this because ${b} logged a service visit at ${a}.</p>
    </div>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { customer_id, origin } = await req.json();
    if (typeof customer_id !== "string" || !customer_id) {
      return json({ ok: false, code: "bad_request" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) return json({ ok: false, code: "forbidden" }, 403);

    const { data: pro } = await admin
      .from("pros")
      .select("id,business")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (!pro) return json({ ok: false, code: "forbidden" }, 403);

    const { data: customer } = await admin
      .from("customers")
      .select("id,pro_id,home_id,email,claim_invited_at,homes(address,claimed_at)")
      .eq("id", customer_id)
      .maybeSingle();
    if (!customer || customer.pro_id !== pro.id) {
      return json({ ok: false, code: "forbidden" }, 403);
    }

    const home = Array.isArray(customer.homes) ? customer.homes[0] : customer.homes;
    if (!customer.email) return json({ ok: false, code: "no_email" });
    if (home?.claimed_at) return json({ ok: false, code: "already_claimed" });
    if (
      customer.claim_invited_at &&
      Date.now() - new Date(customer.claim_invited_at).getTime() < COOLDOWN_MS
    ) {
      return json({ ok: false, code: "cooldown", invited_at: customer.claim_invited_at });
    }

    const { data: jobRows } = await admin
      .from("jobs")
      .select("id,created_at,records(id)")
      .eq("home_id", customer.home_id)
      .eq("pro_id", pro.id)
      .order("created_at", { ascending: false });
    const record = (jobRows ?? []).flatMap((j) => j.records ?? [])[0];
    if (!record) return json({ ok: false, code: "no_record" });

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ ok: false, code: "not_configured" });

    const claimUrl = `${claimOrigin(origin)}/claim/${record.id}`;
    const address = home?.address ?? "your home";
    const text = emailText(pro.business, address, claimUrl);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HomesBrain <invites@homesbrain.com>",
        to: [customer.email],
        subject: `${pro.business} started a home record for ${address}`,
        html: emailHtml(pro.business, address, claimUrl),
        text,
      }),
    });
    if (!resp.ok) {
      console.error("resend error", resp.status, await resp.text());
      return json({ ok: false, code: "send_failed" }, 502);
    }

    const invited_at = new Date().toISOString();
    await admin.from("customers").update({ claim_invited_at: invited_at }).eq("id", customer.id);
    await admin.from("messages").insert({
      channel: "email",
      to_contact: customer.email,
      body: text,
      kind: "invite",
    });

    return json({ ok: true, invited_at });
  } catch (e) {
    console.error("invite-claim error", e);
    return json({ ok: false, code: "error" }, 500);
  }
});
```

- [ ] **Step 2: Document the JWT stance in config.toml**

Append to `supabase/config.toml` (below the scan-nameplate block):

```toml

# invite-claim keeps the default verify_jwt = true on purpose: only a signed-in
# user may reach it, and the function resolves the pro from the JWT itself.
```

No `[functions.invite-claim]` section is added; the default is what we want.

- [ ] **Step 3: Verify lint and formatting pass**

Run: `bun run lint && bun run format`
Expected: lint exits 0 (warnings about the Deno global are acceptable only if scan-nameplate produces the same; it declares `Deno` identically, so none are expected). Format rewrites nothing unexpected; check with `git diff --stat`, only the two files above (plus possible formatting of the new file itself) should appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/invite-claim/index.ts supabase/config.toml
git commit -m "Add invite-claim edge function (Resend claim invite email)"
```

---

### Task 3: Invite button on the customer detail page

**Files:**
- Modify: `src/routes/pro.customers.$customerId.tsx`

**Interfaces:**
- Consumes: the Task 2 HTTP contract via `supabase.functions.invoke("invite-claim", { body: { customer_id, origin } })`; `ActionCircle` and `PropertyRow` from `src/components/crm.tsx` (both already imported by this file); `Pill` from `src/lib/ui.tsx`; `formatDate` and `logEvent` from `src/lib/hb.ts` (`logEvent(actor: string, type: string, props: object)`).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the Mail icon import**

In `src/routes/pro.customers.$customerId.tsx`, change line 3:

```ts
import { ArrowLeft, BellRing, Eye, Mail, ReceiptText, Send, StickyNote, Wrench } from "lucide-react";
```

- [ ] **Step 2: Add `claim_invited_at` to the Customer type and query**

In the `Customer` type, after `email: string | null;` add:

```ts
  claim_invited_at: string | null;
```

In the customer select (currently line 100), add the column. The full select string becomes:

```ts
          "id,name,phone,email,consent_at,created_at,home_id,claim_invited_at,homes(id,address,claimed_at,claimed_by_homeowner,homeowners!homes_homeowner_fk(id,phone,email,created_at))",
```

The existing `as unknown as Customer` cast on the result absorbs the fact that `types.ts` (Lovable-generated, not hand-edited) does not know the new column yet.

- [ ] **Step 3: Add invite state and the send function**

Next to the existing `const [nudging, setNudging] = useState(false);` add:

```ts
  const [inviting, setInviting] = useState(false);
```

After the `sendNudge` function, add:

```ts
  async function sendClaimInvite() {
    if (!proId || !customer || inviting) return;
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-claim", {
      body: { customer_id: customerId, origin: window.location.origin },
    });
    setInviting(false);
    const result = data as { ok: boolean; code?: string; invited_at?: string } | null;
    if (error || !result?.ok) {
      const code = result?.code;
      setToast(
        code === "no_email"
          ? "No email on file."
          : code === "already_claimed"
            ? "This home is already claimed."
            : code === "no_record"
              ? "Log a job first so there's a record to claim."
              : code === "cooldown"
                ? `Already invited ${result?.invited_at ? formatDate(result.invited_at) : "recently"}. Invites can go out once every 7 days.`
                : code === "not_configured"
                  ? "Email is not configured yet."
                  : "Could not send the invite. Try again.",
      );
      if (code === "cooldown" && result?.invited_at) {
        setCustomer((c) => (c ? { ...c, claim_invited_at: result.invited_at! } : c));
      }
      return;
    }
    setCustomer((c) => (c ? { ...c, claim_invited_at: result.invited_at ?? null } : c));
    await logEvent(`pro:${proId}`, "claim_invite_sent", { customer_id: customerId });
    setToast("Claim invite sent");
  }
```

- [ ] **Step 4: Add the ActionCircle and the About row**

Inside the actions row (the `div` with `className="mt-5 flex justify-center gap-4"`), after the Nudge `ActionCircle`, add:

```tsx
              {!customer.homes?.claimed_at && (
                <ActionCircle
                  icon={Mail}
                  label="Invite"
                  onClick={sendClaimInvite}
                  disabled={!customer.email || inviting || inviteOnCooldown}
                  title={
                    !customer.email
                      ? "No email on file"
                      : inviteOnCooldown
                        ? `Invited ${formatDate(customer.claim_invited_at!)} · resend available ${formatDate(inviteCooldownUntil!)}`
                        : "Email an invite to claim this home record"
                  }
                />
              )}
```

The two derived values live just above the `return` (after the existing `const homeowner = ...` line):

```ts
  const inviteCooldownUntil = customer.claim_invited_at
    ? new Date(new Date(customer.claim_invited_at).getTime() + 7 * 24 * 3600 * 1000).toISOString()
    : null;
  const inviteOnCooldown =
    inviteCooldownUntil != null && new Date(inviteCooldownUntil).getTime() > Date.now();
```

In the "About this customer" `CollapsibleCard`, after the `Home claimed` `PropertyRow`, add (only rendered while unclaimed):

```tsx
              {!customer.homes?.claimed_at && (
                <PropertyRow
                  label="Claim invite"
                  display={
                    customer.claim_invited_at ? (
                      <Pill accent="indigo">Sent · {formatDate(customer.claim_invited_at)}</Pill>
                    ) : (
                      <Pill accent="ink">Not sent</Pill>
                    )
                  }
                />
              )}
```

- [ ] **Step 5: Verify types, lint, and the UI states**

Run: `bunx tsc --noEmit && bun run lint`
Expected: both exit 0.

Run `bun dev`, log in as a pro, open a customer whose home is unclaimed:
- "Invite" action appears; hover title reads "Email an invite to claim this home record".
- A customer with no email shows the action disabled with "No email on file".
- A claimed customer shows no Invite action and no "Claim invite" row.
- Clicking Invite before the function is deployed with a key shows the honest toast (either the invoke error path "Could not send the invite. Try again." if the function is not yet deployed, or "Email is not configured yet." once deployed without the key). No mock fallback.

- [ ] **Step 6: Commit**

```bash
git add src/routes/pro.customers.$customerId.tsx
git commit -m "Add claim invite button to customer detail page"
```

---

### Task 4: Deploy, configure Resend, verify end to end

**Files:**
- None created or modified (setup + verification only).

**Interfaces:**
- Consumes: everything above, deployed. The migration and function reach Supabase via git push (Lovable syncs from GitHub and deploys both).
- Produces: the working feature.

- [ ] **Step 1: Push so Lovable deploys the migration and function**

```bash
git pull --rebase=false && git push
```

Expected: push succeeds. Wait for Lovable to sync (check the Lovable project's activity), then confirm the column exists by loading a customer detail page: the query in Task 3 selects `claim_invited_at` and errors loudly if the column is missing.

- [ ] **Step 2: One-time Resend setup (user does this; walk them through it)**

1. Create an account at resend.com.
2. Domains → Add domain → `homesbrain.com`, add the DKIM/SPF DNS records Resend shows at the DNS host, wait for Verified.
3. API Keys → create a key with send access.
4. Supabase dashboard → project `ccglxkhrlfxlvpzcitso` → Edge Functions → Secrets → add `RESEND_API_KEY` with the key value.

Do not proceed to Step 3 until the domain shows Verified; Resend rejects sends from unverified domains.

- [ ] **Step 3: End-to-end verification with a real inbox**

Using a test customer whose email is an inbox you control, home unclaimed, at least one job logged:

1. Click Invite. Expected: toast "Claim invite sent"; the About card flips to "Sent · {today}"; the Invite action disables.
2. The email arrives from `HomesBrain <invites@homesbrain.com>`, subject "{Business} started a home record for {address}", indigo pill CTA, footer consent line.
3. Click "Claim your home record": lands on `/claim/:recordId`, complete the magic-link claim, land on `/home`, and the pro receives the existing home_claimed notification.
4. In Supabase: `customers.claim_invited_at` stamped; a `messages` row with `channel=email, kind=invite`; an `events` row with `type=claim_invite_sent`.
5. Click Invite again (new unclaimed test customer is NOT needed; reuse is the point): blocked, disabled with the cooldown title.
6. Rejection paths: a customer with no email (disabled), a claimed customer (no button), a customer with zero jobs (toast "Log a job first so there's a record to claim.").

- [ ] **Step 4: Update the Notion screen inventory**

Per the working agreement in CLAUDE.md, update the Customer detail screen's entry in the Notion Screen inventory (page `393e1945-9086-81e7-8a0d-f62ac86649d8`) to note the claim invite action and its email channel being real.
