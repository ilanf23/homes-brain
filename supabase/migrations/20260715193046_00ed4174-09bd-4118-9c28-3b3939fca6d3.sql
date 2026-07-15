CREATE OR REPLACE FUNCTION public.get_home_view()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ho_id uuid := public.my_homeowner_id();
BEGIN
  IF v_ho_id IS NULL THEN
    IF auth.uid() IS NOT NULL THEN v_ho_id := public.homeowner_ensure(NULL); END IF;
  END IF;
  IF v_ho_id IS NULL THEN RETURN NULL; END IF;

  RETURN (
    WITH homes_all AS (
      SELECT * FROM public.homes
       WHERE claimed_by_homeowner = v_ho_id
       ORDER BY claimed_at ASC NULLS LAST, id ASC
    ),
    home_ids AS (SELECT id FROM homes_all)
    SELECT json_build_object(
      'homeowner', (SELECT row_to_json(ho) FROM public.homeowners ho WHERE ho.id = v_ho_id),
      'home',      (SELECT row_to_json(h) FROM homes_all h LIMIT 1),
      'homes',     COALESCE((SELECT json_agg(row_to_json(h)) FROM homes_all h), '[]'::json),
      'equipment', COALESCE((SELECT json_agg(row_to_json(e) ORDER BY e.created_at DESC)
                               FROM public.equipment e
                              WHERE e.home_id IN (SELECT id FROM home_ids)), '[]'::json),
      'jobs',      COALESCE((SELECT json_agg(row_to_json(j) ORDER BY j.created_at DESC)
                               FROM public.jobs j
                              WHERE j.home_id IN (SELECT id FROM home_ids)), '[]'::json),
      'pros',      COALESCE((SELECT json_agg(json_build_object('id',p.id,'business',p.business,'trade',p.trade,
                                                                'logo',p.logo,'google_rating',p.google_rating))
                               FROM public.pros p
                              WHERE p.id IN (SELECT DISTINCT pro_id FROM public.jobs
                                              WHERE home_id IN (SELECT id FROM home_ids))),
                            '[]'::json),
      'invites',   COALESCE((SELECT json_agg(row_to_json(i) ORDER BY i.created_at DESC)
                               FROM public.invites i
                              WHERE i.home_id IN (SELECT id FROM home_ids)), '[]'::json),
      'records',   COALESCE((SELECT json_agg(json_build_object(
                                  'id',r.id,'public_url',r.public_url,'viewed_at',r.viewed_at,
                                  'created_at',r.created_at,'job_id',r.job_id,
                                  'home_id',j.home_id,'hidden_fields',r.hidden_fields)
                                ORDER BY r.created_at DESC)
                               FROM public.records r
                               JOIN public.jobs j ON j.id = r.job_id
                              WHERE j.home_id IN (SELECT id FROM home_ids)), '[]'::json)
    )
  );
END $function$;