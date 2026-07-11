// Mock freemium plan helpers. NO real payments — see /pro/plan.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  return data as string;
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
