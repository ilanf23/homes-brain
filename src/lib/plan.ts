// Mock freemium plan helpers. NO real payments — see /pro/plan.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * REVERSIBLE FEATURE GATING KILL-SWITCH.
 *
 * While `ALL_FEATURES_FREE` is true, every pro is treated as fully entitled:
 * `isProEntitled()` returns true, `useCurrentPlan()` reports `isPro: true`,
 * and the <PlanLock*> components render nothing. The `plans` / `plan_features`
 * tables and the `pro.plan` column are untouched, so flipping this flag back
 * to `false` restores the original gating behaviour.
 */
export const ALL_FEATURES_FREE = true;

/** Single source of truth for "does this pro have paid-tier access?" */
export function isProEntitled(pro?: { plan?: string | null } | null): boolean {
  if (ALL_FEATURES_FREE) return true;
  return pro?.plan === "pro";
}

export type Plan = {
  id: string;
  name: string;
  price_monthly: number;
  tagline: string | null;
  sort_order: number;
  active: boolean;
  founding_price: number | null;
  standard_price: number | null;
  founding_cap: number | null;
};

export type FoundingSlots = { taken: number; cap: number; remaining: number };

export type PlanFeature = {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  tier: "free" | "pro";
  sort_order: number;
  active: boolean;
};

export const DEMO_NOTICE =
  "Demo — you won't be charged. No card required. Payments come later.";
export const DEMO_SHORT = "Demo — not charged";

export async function fetchPlans(): Promise<Plan[]> {
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as Plan[];
}

export async function fetchPlanFeatures(): Promise<PlanFeature[]> {
  const { data } = await supabase
    .from("plan_features")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as PlanFeature[];
}

export async function mockSetPlan(plan: "free" | "pro"): Promise<string> {
  const { data, error } = await supabase.rpc("mock_set_plan", { p_plan: plan });
  if (error) throw error;
  if (plan === "pro") {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (uid) {
      const { data: p } = await supabase
        .from("pros")
        .select("id,founding_member,locked_price")
        .eq("auth_user_id", uid)
        .maybeSingle();
      if (p?.id) {
        const { logEvent } = await import("@/lib/hb");
        await logEvent(`pro:${p.id}`, "plan_upgraded", {
          role: "pro",
          plan: "pro",
          founding_member: !!(p as { founding_member?: boolean }).founding_member,
          locked_price: (p as { locked_price?: number | null }).locked_price ?? null,
        });
      }
    }
  }
  return data as string;
}

export async function fetchFoundingSlots(): Promise<FoundingSlots> {
  const { data } = await supabase.rpc("founding_slots");
  const raw = (data ?? { taken: 0, cap: 1000, remaining: 1000 }) as {
    taken?: number;
    cap?: number;
    remaining?: number;
  };
  return {
    taken: raw.taken ?? 0,
    cap: raw.cap ?? 1000,
    remaining: raw.remaining ?? 1000,
  };
}

export type MyPlanInfo = {
  plan: string;
  founding_member: boolean;
  locked_price: number | null;
};

export async function fetchMyPlanInfo(): Promise<MyPlanInfo | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("pros")
    .select("plan,plan_status,founding_member,locked_price")
    .eq("auth_user_id", uid)
    .maybeSingle();
  if (!data) return null;
  const isPro = data.plan === "pro" && data.plan_status === "active";
  return {
    plan: isPro ? "pro" : "free",
    founding_member: !!(data as { founding_member?: boolean }).founding_member,
    locked_price: (data as { locked_price?: number | null }).locked_price ?? null,
  };
}

/** Read the current pro's plan reactively. Returns null while loading. */
export function useCurrentPlan(): {
  plan: string | null;
  isPro: boolean;
  reload: () => Promise<void>;
} {
  const [plan, setPlan] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) {
      setPlan("free");
      return;
    }
    const { data } = await supabase
      .from("pros")
      .select("plan,plan_status")
      .eq("auth_user_id", uid)
      .maybeSingle();
    setPlan(
      data?.plan === "pro" && data?.plan_status === "active" ? "pro" : "free",
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { plan, isPro: plan === "pro", reload };
}
