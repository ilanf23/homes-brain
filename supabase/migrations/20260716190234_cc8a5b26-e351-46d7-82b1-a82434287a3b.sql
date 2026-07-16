CREATE OR REPLACE FUNCTION public.hb_normalize_address(a text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
  SELECT lower(btrim(regexp_replace(regexp_replace(coalesce(a, ''), '[.,#]', ' ', 'g'), '\s+', ' ', 'g')))
$function$;