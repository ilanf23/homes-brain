
-- 1. pros.trades: multi-select list of trade ids, defaulting to empty.
ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS trades text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill from the existing single `trade` column so live rows keep their selection.
UPDATE public.pros
SET trades = ARRAY[trade]
WHERE trade IS NOT NULL
  AND btrim(trade) <> ''
  AND (trades IS NULL OR array_length(trades, 1) IS NULL);

-- 2. Expand the trades catalog with common home-service categories.
--    ON CONFLICT keeps existing rows (labels + order) intact.
INSERT INTO public.trades (id, label, sort_order, active) VALUES
  ('water_treatment',   'Water treatment',        10, true),
  ('hvac',              'HVAC',                   20, true),
  ('plumbing',          'Plumbing',               30, true),
  ('electrical',        'Electrical',             40, true),
  ('appliance',         'Appliance repair',       50, true),
  ('roofing',           'Roofing',                60, true),
  ('pest_control',      'Pest control',           70, true),
  ('landscaping',       'Landscaping & lawn',     80, true),
  ('pool',              'Pool & spa',             90, true),
  ('garage_door',       'Garage door',           100, true),
  ('solar',             'Solar',                 110, true),
  ('chimney',           'Chimney & fireplace',   120, true),
  ('septic',            'Septic',                130, true),
  ('cleaning',          'Cleaning',              140, true),
  ('handyman',          'Handyman',              150, true),
  ('painting',          'Painting',              160, true),
  ('flooring',          'Flooring',              170, true),
  ('window_cleaning',   'Window cleaning',       180, true),
  ('gutter',            'Gutters',               190, true),
  ('pressure_washing',  'Pressure washing',      200, true),
  ('irrigation',        'Irrigation',            210, true),
  ('security',          'Security & smart home', 220, true),
  ('carpentry',         'Carpentry',             230, true),
  ('fencing',           'Fencing',               240, true),
  ('masonry',           'Masonry',               250, true),
  ('insulation',        'Insulation',            260, true),
  ('locksmith',         'Locksmith',             270, true),
  ('tree_care',         'Tree care',             280, true)
ON CONFLICT (id) DO NOTHING;
