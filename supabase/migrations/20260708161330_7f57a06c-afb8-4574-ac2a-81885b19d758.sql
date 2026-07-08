
CREATE OR REPLACE FUNCTION public.mark_record_viewed(p_record_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.records SET viewed_at = now()
  WHERE id = p_record_id AND viewed_at IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_record_viewed(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mark_record_viewed(uuid) TO authenticated;
