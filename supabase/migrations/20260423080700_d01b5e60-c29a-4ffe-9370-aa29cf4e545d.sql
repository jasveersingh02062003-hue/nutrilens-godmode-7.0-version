-- Blocker #7: optimistic locking on daily_logs

CREATE OR REPLACE FUNCTION public.upsert_daily_log(
  p_log_date text,
  p_log_data jsonb,
  p_expected_updated_at timestamptz
)
RETURNS TABLE (
  id uuid,
  log_date text,
  log_data jsonb,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing_updated_at timestamptz;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Check current row
  SELECT dl.id, dl.updated_at
  INTO v_id, v_existing_updated_at
  FROM public.daily_logs dl
  WHERE dl.user_id = v_user AND dl.log_date = p_log_date
  FOR UPDATE;

  IF FOUND THEN
    -- Optimistic lock check: only enforce when caller provided a timestamp
    IF p_expected_updated_at IS NOT NULL
       AND v_existing_updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'CONFLICT: server version is newer'
        USING ERRCODE = 'P0409',
              DETAIL = v_existing_updated_at::text;
    END IF;

    UPDATE public.daily_logs dl
    SET log_data = p_log_data,
        updated_at = now()
    WHERE dl.id = v_id;
  ELSE
    INSERT INTO public.daily_logs (user_id, log_date, log_data)
    VALUES (v_user, p_log_date, p_log_data);
  END IF;

  RETURN QUERY
  SELECT dl.id, dl.log_date, dl.log_data, dl.updated_at
  FROM public.daily_logs dl
  WHERE dl.user_id = v_user AND dl.log_date = p_log_date;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_daily_log(text, jsonb, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.upsert_daily_log(text, jsonb, timestamptz) TO authenticated;