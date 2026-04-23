-- Replace SECURITY DEFINER view with a SECURITY DEFINER function (linter-approved pattern)

DROP VIEW IF EXISTS public.profiles_masked;

-- Pin search_path on age_bucket
CREATE OR REPLACE FUNCTION public.age_bucket(_age integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _age IS NULL THEN NULL
    WHEN _age < 18 THEN 'under_18'
    WHEN _age < 25 THEN '18-24'
    WHEN _age < 35 THEN '25-34'
    WHEN _age < 45 THEN '35-44'
    WHEN _age < 55 THEN '45-54'
    WHEN _age < 65 THEN '55-64'
    ELSE '65+'
  END
$$;

-- Function returns masked profile rows; access controlled inside.
CREATE OR REPLACE FUNCTION public.get_masked_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  city text,
  gender text,
  age_range text,
  goal text,
  marketing_consent boolean,
  join_date text,
  onboarding_complete boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    is_marketer(auth.uid())
    OR is_support(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    CASE
      WHEN p.name IS NULL OR p.name = '' THEN NULL
      ELSE split_part(p.name, ' ', 1)
    END AS first_name,
    p.city,
    p.gender,
    public.age_bucket(p.age) AS age_range,
    p.goal,
    p.marketing_consent,
    p.join_date,
    p.onboarding_complete,
    p.created_at
  FROM public.profiles p;
END;
$$;

REVOKE ALL ON FUNCTION public.get_masked_profiles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_masked_profiles() TO authenticated;

-- Also a single-row variant for detail pages
CREATE OR REPLACE FUNCTION public.get_masked_profile(_user_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  city text,
  gender text,
  age_range text,
  goal text,
  marketing_consent boolean,
  join_date text,
  onboarding_complete boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    is_marketer(auth.uid())
    OR is_support(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    CASE
      WHEN p.name IS NULL OR p.name = '' THEN NULL
      ELSE split_part(p.name, ' ', 1)
    END AS first_name,
    p.city,
    p.gender,
    public.age_bucket(p.age) AS age_range,
    p.goal,
    p.marketing_consent,
    p.join_date,
    p.onboarding_complete,
    p.created_at
  FROM public.profiles p
  WHERE p.id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_masked_profile(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_masked_profile(uuid) TO authenticated;