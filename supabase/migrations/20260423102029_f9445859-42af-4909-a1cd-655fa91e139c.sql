-- ===== city_prices =====
DROP POLICY IF EXISTS "Edge functions can insert city prices" ON public.city_prices;
DROP POLICY IF EXISTS "Edge functions can update city prices" ON public.city_prices;

CREATE POLICY "Staff can insert city prices"
ON public.city_prices FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update city prices"
ON public.city_prices FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ===== packed_products =====
DROP POLICY IF EXISTS "Edge functions can insert packed products" ON public.packed_products;
DROP POLICY IF EXISTS "Edge functions can update packed products" ON public.packed_products;

CREATE POLICY "Staff can insert packed products"
ON public.packed_products FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update packed products"
ON public.packed_products FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ===== price_history =====
DROP POLICY IF EXISTS "Edge functions can insert price history" ON public.price_history;
DROP POLICY IF EXISTS "Edge functions can update price history" ON public.price_history;

CREATE POLICY "Staff can insert price history"
ON public.price_history FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update price history"
ON public.price_history FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ===== ad_creatives =====
DROP POLICY IF EXISTS "Authenticated can insert creatives" ON public.ad_creatives;

CREATE POLICY "Brand members insert own creatives"
ON public.ad_creatives FOR INSERT TO authenticated
WITH CHECK (
  public.is_brand_member(public.campaign_brand_id(campaign_id))
  OR public.is_staff(auth.uid())
);

CREATE POLICY "Brand members update own creatives"
ON public.ad_creatives FOR UPDATE TO authenticated
USING (
  public.is_brand_member(public.campaign_brand_id(campaign_id))
  OR public.is_staff(auth.uid())
)
WITH CHECK (
  public.is_brand_member(public.campaign_brand_id(campaign_id))
  OR public.is_staff(auth.uid())
);

-- ===== price_alert_notifications =====
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.price_alert_notifications;

-- service_role bypasses RLS automatically; this restricts authenticated-user writes to staff
CREATE POLICY "Staff can insert price alert notifications"
ON public.price_alert_notifications FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));