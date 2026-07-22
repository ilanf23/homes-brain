WITH tj AS (
  SELECT j.id AS job_id, j.home_id
  FROM public.jobs j
  JOIN public.homes h ON h.id = j.home_id
  WHERE h.address = 'TEST 123 Sample St, Austin, TX 78701 (email design test)'
  ORDER BY j.created_at DESC
  LIMIT 1
), upsert_eq AS (
  INSERT INTO public.equipment (home_id, type, make, model, serial, warranty_until, source, recall_status, label)
  SELECT tj.home_id, 'Water heater', 'Rheem', 'Performance Platinum 50 gal', 'RH-TEST-50', '2029-01-01'::date, 'pro', 'unknown', 'Garage water heater'
  FROM tj
  WHERE NOT EXISTS (
    SELECT 1 FROM public.equipment e WHERE e.home_id = tj.home_id AND lower(coalesce(e.type,'')) = 'water heater'
  )
  RETURNING id, home_id
)
UPDATE public.jobs j
SET equipment_id = COALESCE(
      (SELECT id FROM upsert_eq WHERE home_id = j.home_id),
      (SELECT e.id FROM public.equipment e WHERE e.home_id = j.home_id AND lower(coalesce(e.type,'')) = 'water heater' LIMIT 1)
    ),
    what_done = 'Flushed the tank, tested the pressure relief valve, and set the thermostat to 120°F. Everything is running well — I recommend a flush again next winter.',
    localized_content = '{}'::jsonb
FROM tj
WHERE j.id = tj.job_id;

UPDATE public.pros
SET owner_first_name = 'Diego'
WHERE email = 'appreview@homesbrain.com';