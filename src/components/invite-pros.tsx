import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, mockSend, suggestTradeGaps, TRADES, tradeLabel } from "@/lib/hb";
import { Btn, Card, Eyebrow, Field, Input, Pill, Select } from "@/lib/ui";
import { TradeIcon } from "@/components/svg";

type InviteRow = { id: string; to_pro_name: string; trade: string | null; status: string };

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
  const [inviteTrade, setInviteTrade] = useState<string>("electrical");

  useEffect(() => {
    if (!homeownerId) return;
    (async () => {
      const { data } = await supabase.rpc("get_home_view", { p_homeowner_id: homeownerId });
      const view = data as { invites?: InviteRow[] } | null;
      setInvites((view?.invites ?? []) as InviteRow[]);
    })();
  }, [homeownerId, homeId]);

  const gaps = useMemo(() => suggestTradeGaps(knownTrades).slice(0, 3), [knownTrades]);

  async function sendInvite(toName: string, toPhone: string | null, trade: string | null) {
    if (!homeownerId) return;
    const { data, error } = await supabase.rpc("homeowner_create_invite", {
      p_homeowner_id: homeownerId,
      p_to_pro_name: toName,
      p_to_pro_phone: toPhone ?? "",
      p_trade: trade ?? "",
    });
    if (!error && data) {
      setInvites((prev) => [
        { id: data as string, to_pro_name: toName, trade, status: "pending" },
        ...prev,
      ]);
    }
    if (toPhone) {
      await mockSend({
        channel: "sms",
        to: toPhone,
        body: `A homeowner invited you to add their home to HomesBrain. Tap to claim: ${window.location.origin}/pro/signup (Reply STOP to opt out.)`,
        kind: "invite",
      });
    }
    await logEvent(`homeowner:${homeownerId}`, "pro_invited", { trade });
    if (prosCount + invites.length + 1 === 2) {
      await logEvent(`homeowner:${homeownerId}`, "second_pro_added", {});
    }
    onToast(`Invite sent to ${toName}`);
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
                onClick={() => sendInvite(`Your ${tradeLabel(g).toLowerCase()} pro`, null, g)}
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

      <div className="mt-5 grid sm:grid-cols-3 gap-3 items-end">
        <Field label="Pro name">
          <Input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Rio Grande Electric"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            placeholder="512-847-1928"
            type="tel"
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
      </div>
      <div className="mt-3">
        <Btn
          variant="indigo"
          disabled={!inviteName || !invitePhone}
          onClick={() => {
            sendInvite(inviteName, invitePhone, inviteTrade);
            setInviteName("");
            setInvitePhone("");
          }}
        >
          Send invite
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
                <span className="flex items-center gap-2">
                  {i.trade && <TradeIcon trade={i.trade} size={14} className="text-muted" />}
                  {i.to_pro_name}{" "}
                  {i.trade && <span className="text-muted">· {tradeLabel(i.trade)}</span>}
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
