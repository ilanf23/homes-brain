ALTER TABLE public.pros ADD COLUMN IF NOT EXISTS owner_first_name text;

CREATE OR REPLACE FUNCTION public.handle_new_pro_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', '');
BEGIN
  IF v_role = 'pro' THEN
    INSERT INTO public.pros (auth_user_id, business, trade, service_area, email, plan,
                             google_place_id, google_rating, phone, owner_first_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'business', 'My business'),
      COALESCE(NEW.raw_user_meta_data->>'trade', 'other'),
      NEW.raw_user_meta_data->>'service_area',
      NEW.email,
      'free',
      NEW.raw_user_meta_data->>'google_place_id',
      NULLIF(NEW.raw_user_meta_data->>'google_rating','')::numeric,
      NEW.raw_user_meta_data->>'phone',
      NULLIF(NEW.raw_user_meta_data->>'owner_first_name','')
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;