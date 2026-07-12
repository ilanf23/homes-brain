
INSERT INTO public.plan_features (feature_key, label, description, tier, sort_order, active)
VALUES ('rebook_manual', 'Rebook reminders', 'See who''s due and nudge them back yourself, one customer at a time.', 'free', 35, true)
ON CONFLICT (feature_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  sort_order = EXCLUDED.sort_order,
  active = true;

UPDATE public.plan_features
SET label = 'Automated rebooking & win-backs',
    description = 'We work your whole book — seasonal, overdue, and win-back outreach, automatically.'
WHERE feature_key = 'rebooking_automation';
