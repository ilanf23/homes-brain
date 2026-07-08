
REVOKE ALL ON FUNCTION public.pro_serves_home(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pro_serves_home(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.pro_upsert_equipment(uuid, text, text, text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pro_upsert_equipment(uuid, text, text, text, text, text, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.equipment_set_updated_at() FROM PUBLIC, anon;
