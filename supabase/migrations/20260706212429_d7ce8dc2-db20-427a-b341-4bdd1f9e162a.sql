
REVOKE EXECUTE ON FUNCTION public.homeowner_ensure(boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_home(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.homeowner_signup(text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_home_view() FROM anon;
REVOKE EXECUTE ON FUNCTION public.homeowner_update_home(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.homeowner_update_profile(text, text, text, boolean, boolean, boolean, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.homeowner_add_equipment(text, text, text, text, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.homeowner_update_equipment(uuid, text, text, text, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.homeowner_delete_equipment(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.homeowner_create_invite(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_homeowner_id() FROM anon;
