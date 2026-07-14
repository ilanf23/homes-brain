-- Address-keyed unit roster for log-a-job.
--
-- A home is keyed by address and shared across pros. When a pro is invited to a
-- home another pro already services, they have no customer, job, or created-home
-- row on it yet, so pro_serves_home() is false and a direct equipment SELECT
-- returns nothing. They retype a unit the home already knows, and a duplicate
-- equipment row lands on the record.
--
-- This RPC is the narrow exception: it reveals unit IDENTITY for an address
-- (what is installed), never the other pro's job notes or who they are.

CREATE OR REPLACE FUNCTION public.home_units_for_address(p_address text)
RETURNS TABLE (
  id uuid,
  type text,
  make text,
  model text,
  warranty_until date,
  attributes jsonb,
  last_job_at timestamptz,
  job_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.type,
    e.make,
    e.model,
    e.warranty_until,
    e.attributes,
    max(j.created_at) AS last_job_at,
    count(j.id)       AS job_count
  FROM public.equipment e
  JOIN public.homes h ON h.id = e.home_id
  LEFT JOIN public.jobs j ON j.equipment_id = e.id
  -- Signed-in pros only. Never anon: this answers "what is installed at this
  -- address", which is not something the open web should be able to ask.
  WHERE public.my_pro_id() IS NOT NULL
    AND lower(btrim(h.address)) = lower(btrim(p_address))
  GROUP BY e.id, e.type, e.make, e.model, e.warranty_until, e.attributes, e.created_at
  ORDER BY e.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.home_units_for_address(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.home_units_for_address(text) TO authenticated, service_role;
