-- Blocker #5: profiles PII leak to marketers / support

-- Drop the over-permissive policies
DROP POLICY IF EXISTS "Marketers read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Support reads all profiles" ON public.profiles;

-- Helper: bucket age into ranges so marketers don't see exact age
CREATE OR REPLACE FUNCTION public.age_bucket(_age integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
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

-- Safe view exposing only non-sensitive fields
CREATE OR REPLACE VIEW public.profiles_masked
WITH (security_invoker = true) AS
SELECT
  id,
  -- First name only (drop surname signal)
  CASE
    WHEN name IS NULL OR name = '' THEN NULL
    ELSE split_part(name, ' ', 1)
  END AS first_name,
  city,
  gender,
  age_bucket(age) AS age_range,
  goal,
  marketing_consent,
  join_date,
  onboarding_complete,
  created_at
FROM public.profiles;

-- View permissions: only marketers, support, admins, owners may SELECT
REVOKE ALL ON public.profiles_masked FROM public, anon, authenticated;
GRANT SELECT ON public.profiles_masked TO authenticated;

-- Because security_invoker=true, the underlying profiles RLS controls access.
-- We need a SELECT policy on profiles that admits marketers/support but only when accessed via this view.
-- Simpler: grant marketers/support a column-restricted SELECT policy on profiles for the masked column set.
-- Easiest correct approach: a SECURITY DEFINER function-backed policy.

-- Add a profiles SELECT policy that lets marketer/support read rows ONLY when 
-- the query is selecting the masked subset (we approximate by allowing read; 
-- the view itself is the only thing they can query because we will revoke 
-- direct table SELECT for marketers via not adding a policy).
-- 
-- Since marketers don't have any other SELECT policy on profiles after our DROPs,
-- they CANNOT read profiles directly. The view uses security_invoker, so 
-- the view query runs as the marketer and would also fail RLS.
-- 
-- Fix: switch the view to security_definer (run as view owner = postgres) 
-- and put access control on the view's GRANT + a wrapper function.
DROP VIEW public.profiles_masked;

CREATE OR REPLACE VIEW public.profiles_masked
WITH (security_invoker = false) AS
SELECT
  p.id,
  CASE
    WHEN p.name IS NULL OR p.name = '' THEN NULL
    ELSE split_part(p.name, ' ', 1)
  END AS first_name,
  p.city,
  p.gender,
  age_bucket(p.age) AS age_range,
  p.goal,
  p.marketing_consent,
  p.join_date,
  p.onboarding_complete,
  p.created_at
FROM public.profiles p
WHERE
  -- Access control inside the view: only privileged staff, and admins still see all via direct table
  is_marketer(auth.uid())
  OR is_support(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_owner(auth.uid());

REVOKE ALL ON public.profiles_masked FROM public, anon;
GRANT SELECT ON public.profiles_masked TO authenticated;