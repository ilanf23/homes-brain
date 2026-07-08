-- Per-field visibility on the customer-facing record.
-- In the Send step a pro can uncheck optional rows (equipment, make/model,
-- next service, recall) to keep them off the public record. The underlying
-- job/equipment data stays intact: e.g. an unchecked next_service still drives
-- the pro's due-for-service reminders, it just does not show to the homeowner.
ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS hidden_fields text[] NOT NULL DEFAULT '{}';

-- Surface hidden_fields on the public record so /r/:id can skip those rows.
CREATE OR REPLACE FUNCTION public.get_public_record(p_record_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT json_build_object(
    'id', r.id,
    'viewed_at', r.viewed_at,
    'created_at', r.created_at,
    'hidden_fields', COALESCE(r.hidden_fields, '{}'),
    'job', json_build_object(
      'what_done', j.what_done,
      'next_service_date', j.next_service_date,
      'created_at', j.created_at,
      'pro', (SELECT json_build_object('id',p.id,'business',p.business,'trade',p.trade,
                                       'google_rating',p.google_rating,'google_place_id',p.google_place_id,
                                       'logo',p.logo)
                FROM public.pros p WHERE p.id = j.pro_id),
      'home', (SELECT json_build_object('id',h.id,'address',h.address,
                                        'claimed_by_homeowner',h.claimed_by_homeowner)
                 FROM public.homes h WHERE h.id = j.home_id),
      'equipment', (SELECT json_build_object('type',e.type,'make',e.make,'model',e.model,
                                             'warranty_until',e.warranty_until,'recall_status',e.recall_status)
                      FROM public.equipment e WHERE e.id = j.equipment_id),
      'customer', (SELECT json_build_object('name',c.name)
                     FROM public.customers c WHERE c.id = j.customer_id)
    )
  )
  FROM public.records r JOIN public.jobs j ON j.id = r.job_id
  WHERE r.id = p_record_id
$$;

GRANT EXECUTE ON FUNCTION public.get_public_record(uuid) TO anon, authenticated;
