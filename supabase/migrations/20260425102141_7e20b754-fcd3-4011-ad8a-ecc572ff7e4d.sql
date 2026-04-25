-- P0.3: Cap daily_logs.log_data at 100 KB to prevent JSONB bloat.
-- We use a trigger (not a CHECK constraint) because pg_column_size is STABLE,
-- not IMMUTABLE, so it cannot be used inside CHECK.

CREATE OR REPLACE FUNCTION public.guard_daily_logs_size()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_size int;
  v_max  int := 102400; -- 100 KB
BEGIN
  v_size := pg_column_size(NEW.log_data);
  IF v_size > v_max THEN
    RAISE EXCEPTION
      'daily_logs.log_data is too large (% bytes, max % bytes). Trim historical entries before saving.',
      v_size, v_max
      USING ERRCODE = '54000'; -- program_limit_exceeded
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_daily_logs_size_trg ON public.daily_logs;
CREATE TRIGGER guard_daily_logs_size_trg
BEFORE INSERT OR UPDATE OF log_data ON public.daily_logs
FOR EACH ROW
EXECUTE FUNCTION public.guard_daily_logs_size();