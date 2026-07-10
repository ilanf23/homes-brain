import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, mockSend, suggestTradeGaps, TRADES, tradeLabel } from "@/lib/hb";
import { Btn, Card, Eyebrow, Field, Input, PhoneInput, Pill, Select } from "@/lib/ui";
import { TradeIcon } from "@/components/svg";

type InviteRow = {
  id: string;
  to_pro_name: string;
  to_pro_email?: string | null;
  to_pro_phone?: string | null;
  trade: string | null;
  status: string;
};


/* The one-tap "invite your other pros" card (Flow C hook), shared by the
   homeowner overview, My Pros, and Add pages. Fetches its own invites. */
export function InviteProsCard({
  homeId,
  homeownerId,
  knownTrades,
  prosCount,
  className = "",
  onToast,
}: {
  homeId: string;
  homeownerId: string | null;
  knownTrades: string[];
  prosCount: number;
  className?: string;
  onToast: (msg: string) => void;
}) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTrade, setInviteTrade] = useState<string>("electrical");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!homeownerId) return;
    (async () => {
      const { data } = await supabase.rpc("get_home_view");
      const view = data as { invites?: InviteRow[] } | null;
      setInvites((view?.invites ?? []) as InviteRow[]);
    })();
  }, [homeownerId, homeId]);

  const gaps = useMemo(() => suggestTradeGaps(knownTrades).slice(0, 3), [knownTrades]);

  async function sendInvite(
    toName: string,
    toPhone: string | null,
    toEmail: string | null,
    trade: string | null,
  ) {
    if (!homeownerId) return;
    const { data, error } = await supabase.rpc("homeowner_create_invite", {
      p_to_pro_name: toName,
      p_to_pro_phone: toPhone ?? "",
      p_to_pro_email: toEmail ?? "",
      p_trade: trade ?? "",
    });
    if (!error && data) {
      setInvites((prev) => [
        {
          id: data as string,
          to_pro_name: toName,
          to_pro_email: toEmail,
          to_pro_phone: toPhone,
          trade,
          status: "pending",
        },
        ...prev,
      ]);
    }

    let emailed = false;
    if (toEmail) {
      const { data: emailResp, error: emailErr } = await supabase.functions.invoke(
        "invite-pro",
        {
          body: {
            to_name: toName,
            to_email: toEmail,
            trade: trade ?? "",
            origin: window.location.origin,
          },
        },
      );
      const ok = !emailErr && (emailResp as { ok?: boolean } | null)?.ok === true;
      emailed = ok;
      if (!ok) {
        onToast(`Invite saved, but email couldn't be sent to ${toName}`);
      }
    }

    // Phone stays as an optional capture until real SMS is live. Keep the
    // mock log so existing "message preview" surfaces don't regress.
    if (toPhone) {
      await mockSend({
        channel: "sms",
        to: toPhone,
        body: `A homeowner invited you to add their home to HomesBrain. Tap to claim: ${window.location.origin}/pro/signup (Reply STOP to opt out.)`,
        kind: "invite",
      });
    }

    await logEvent(`homeowner:${homeownerId}`, "pro_invited", {
      trade,
      channel: toEmail ? "email" : toPhone ? "sms" : "none",
    });
    if (prosCount + invites.length + 1 === 2) {
      await logEvent(`homeowner:${homeownerId}`, "second_pro_added", {});
    }
    if (emailed) onToast(`Invite emailed to ${toName}`);
    else if (!toEmail) onToast(`Invite sent to ${toName}`);
  }


  return (
    <Card className={className}>
      <Eyebrow accent="indigo">Add the other pros who work on your home</Eyebrow>
      <p className="mt-2 text-sm text-muted">
        One source of truth for everything that gets done here.
      </p>

      {gaps.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">
            Suggested gaps
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {gaps.map((g, i) => (
              <button
                key={g}
                onClick={() => sendInvite(`Your ${tradeLabel(g).toLowerCase()} pro`, null, null, g)}
                className="pressable anim-fade-up inline-flex items-center gap-2 rounded-full bg-indigobg text-indigo text-sm font-semibold px-3.5 py-2 hover:shadow-[0_8px_20px_-10px_rgba(71,63,176,0.5)] hover:-translate-y-px transition-all duration-200"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <TradeIcon trade={g} size={15} />
                Invite {tradeLabel(g)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid sm:grid-cols-2 gap-3 items-end">
        <Field label="Pro name">
          <Input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Rio Grande Electric"
          />
        </Field>
        <Field label="Trade">
          <Select value={inviteTrade} onChange={(e) => setInviteTrade(e.target.value)}>
            {TRADES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email">
          <Input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="pro@business.com"
            type="email"
          />
        </Field>
        <Field label="Phone (optional)">
          <PhoneInput
            value={invitePhone}
            onChange={(v) => setInvitePhone(v)}
          />
        </Field>
      </div>
      <p className="mt-2 text-xs text-muted">
        Email delivers a real invitation. Phone is captured for now — texting isn't live yet.
      </p>
      <div className="mt-3">
        <Btn
          variant="indigo"
          disabled={
            sending ||
            !inviteName.trim() ||
            (!inviteEmail.trim() && !invitePhone.trim())
          }
          onClick={async () => {
            setSending(true);
            try {
              await sendInvite(
                inviteName.trim(),
                invitePhone.trim() || null,
                inviteEmail.trim() || null,
                inviteTrade,
              );
              setInviteName("");
              setInvitePhone("");
              setInviteEmail("");
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? "Sending…" : "Send invite"}
        </Btn>
      </div>


      {invites.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Sent</div>
          <div className="mt-2 space-y-2">
            {invites.map((i) => (
              <div
                key={i.id}
                className="anim-fade-in flex items-center justify-between rounded-xl bg-soft px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  {i.trade && <TradeIcon trade={i.trade} size={14} className="text-muted" />}
                  <span className="truncate">
                    <span className="font-semibold">{i.to_pro_name}</span>
                    {i.trade && <span className="text-muted"> · {tradeLabel(i.trade)}</span>}
                    {(i.to_pro_email || i.to_pro_phone) && (
                      <span className="text-muted"> · {i.to_pro_email ?? i.to_pro_phone}</span>
                    )}
                  </span>
                </span>
                <Pill accent="amber">{i.status}</Pill>
              </div>
            ))}

          </div>
        </div>
      )}
    </Card>
  );
}
