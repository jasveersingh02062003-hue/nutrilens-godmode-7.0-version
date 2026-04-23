-- Blocker #2: ad_targeting cross-brand tampering

DROP POLICY IF EXISTS "Authenticated can insert targeting" ON public.ad_targeting;
DROP POLICY IF EXISTS "Authenticated can update targeting" ON public.ad_targeting;

-- Helper: find the brand_id of the parent campaign
CREATE OR REPLACE FUNCTION public.campaign_brand_id(_campaign_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT brand_id FROM public.ad_campaigns WHERE id = _campaign_id
$$;

CREATE POLICY "Brand members insert own targeting"
ON public.ad_targeting
FOR INSERT
TO authenticated
WITH CHECK (
  is_brand_member(campaign_brand_id(campaign_id))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Brand members update own targeting"
ON public.ad_targeting
FOR UPDATE
TO authenticated
USING (
  is_brand_member(campaign_brand_id(campaign_id))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  is_brand_member(campaign_brand_id(campaign_id))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);