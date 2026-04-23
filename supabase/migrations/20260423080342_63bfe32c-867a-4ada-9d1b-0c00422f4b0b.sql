-- Blocker #1: ad_campaigns cross-brand tampering

DROP POLICY IF EXISTS "Authenticated can insert campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Authenticated can update campaigns" ON public.ad_campaigns;

-- Brand members can create campaigns for their own brand
CREATE POLICY "Brand members insert own campaigns"
ON public.ad_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  is_brand_member(brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Brand members can update only their own brand's campaigns
CREATE POLICY "Brand members update own campaigns"
ON public.ad_campaigns
FOR UPDATE
TO authenticated
USING (
  is_brand_member(brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  is_brand_member(brand_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);