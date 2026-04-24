
-- =========================================================
-- P0-1: Lockdown brand_accounts & ad_campaigns RLS
-- =========================================================

-- 1. brand_accounts: drop the two over-broad SELECT policies
DROP POLICY IF EXISTS "Anyone can read active brands" ON public.brand_accounts;
DROP POLICY IF EXISTS "Authenticated can read all brands" ON public.brand_accounts;

-- Re-create a single tight read policy: brand members + staff only
CREATE POLICY "Brand members or staff read brands"
ON public.brand_accounts
FOR SELECT
TO authenticated
USING (
  public.is_brand_member(id)
  OR public.is_staff(auth.uid())
);

-- 2. ad_campaigns: drop the broad "anyone reads active" policy
DROP POLICY IF EXISTS "Anyone can read active campaigns" ON public.ad_campaigns;
-- "Brand or staff read campaigns" is already in place — leave it.

-- 3. ad_creatives: drop the broad public-read policy
DROP POLICY IF EXISTS "Anyone can read active creatives" ON public.ad_creatives;
-- "Brand or staff read creatives" is already in place — leave it.

-- 4. SECURITY DEFINER function for the consumer client to fetch
--    only the safe, servable fields it needs for in-app ad rendering.
--    NO budgets, NO rates, NO contact details exposed.
CREATE OR REPLACE FUNCTION public.get_servable_ads(
  p_min_pes integer DEFAULT 30,
  p_limit   integer DEFAULT 5
)
RETURNS TABLE (
  campaign_id     uuid,
  campaign_name   text,
  pes_score       integer,
  target_diet     text,
  brand_name      text,
  creative_id     uuid,
  headline        text,
  subtitle        text,
  cta_text        text,
  cta_url         text,
  image_url       text,
  min_protein_gap numeric,
  max_user_budget numeric,
  meal_context    text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id            AS campaign_id,
    c.campaign_name,
    c.pes_score,
    c.target_diet,
    b.brand_name,
    cr.id           AS creative_id,
    cr.headline,
    cr.subtitle,
    cr.cta_text,
    cr.cta_url,
    cr.image_url,
    t.min_protein_gap,
    t.max_user_budget,
    t.meal_context
  FROM public.ad_campaigns c
  JOIN public.brand_accounts b ON b.id = c.brand_id
  JOIN public.ad_creatives  cr ON cr.campaign_id = c.id AND cr.is_active = true
  LEFT JOIN public.ad_targeting t ON t.campaign_id = c.id
  WHERE c.status = 'active'
    AND b.status = 'active'
    AND c.pes_score >= COALESCE(p_min_pes, 0)
    AND c.start_date <= CURRENT_DATE
    AND c.end_date   >= CURRENT_DATE
    AND (c.budget_total = 0 OR c.budget_spent < c.budget_total)
  ORDER BY c.pes_score DESC
  LIMIT GREATEST(1, COALESCE(p_limit, 5));
$$;

REVOKE ALL ON FUNCTION public.get_servable_ads(integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_servable_ads(integer, integer) TO authenticated;
