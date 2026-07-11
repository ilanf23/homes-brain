// Canonical HomesBrain event spine. Wraps logEvent to ensure actor + role are
// always set. Everything shipping into the analytics dashboard should route
// through `track` so the rollups stay honest.

import { logEvent } from "@/lib/hb";

export type ProEvent =
  | "pro_reached"
  | "pro_signed_up"
  | "pro_claimed"
  | "pro_setup_step_done"
  | "pro_first_job"
  | "pro_second_job"
  | "record_sent"
  | "record_viewed"
  | "review_requested"
  | "rebook_nudge_sent"
  | "rebooked"
  | "plan_upgraded";

export type HomeownerEvent =
  | "claim_invite_sent"
  | "claim_opened"
  | "home_claimed"
  | "homeowner_second_pro_added"
  | "guide_viewed"
  | "directory_viewed";

export type CadenceEvent = "nudge_sent" | "nudge_clicked";

export type CanonicalEvent = ProEvent | HomeownerEvent | CadenceEvent;

export type ActorType = "pro" | "homeowner" | "system";

/** Standardized event emit. Prefer this over logEvent for new call sites. */
export async function track(
  actorType: ActorType,
  actorId: string | null,
  event: CanonicalEvent | (string & {}),
  props: Record<string, unknown> = {},
): Promise<void> {
  const actor =
    actorType === "system"
      ? "system"
      : actorId
        ? `${actorType === "pro" ? "pro" : "homeowner"}:${actorId}`
        : null;
  await logEvent(actor, event, { ...props, role: actorType });
}
