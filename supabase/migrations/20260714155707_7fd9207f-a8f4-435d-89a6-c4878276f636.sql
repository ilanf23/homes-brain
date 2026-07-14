ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS no_follow_up boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_handled_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS jobs_follow_up_open_idx
  ON public.jobs (pro_id, next_service_date)
  WHERE follow_up_handled_at IS NULL AND no_follow_up = false;