-- Geocoded coordinates for the pro dashboard customer map.
-- Populated by client-side Nominatim geocoding: at job-log time for new
-- homes, and lazily backfilled from the dashboard for older rows.
-- geocoded_at is stamped even when geocoding fails so a bad address is
-- not retried on every dashboard visit.
ALTER TABLE public.homes
  ADD COLUMN lat DOUBLE PRECISION,
  ADD COLUMN lng DOUBLE PRECISION,
  ADD COLUMN geocoded_at TIMESTAMPTZ;
