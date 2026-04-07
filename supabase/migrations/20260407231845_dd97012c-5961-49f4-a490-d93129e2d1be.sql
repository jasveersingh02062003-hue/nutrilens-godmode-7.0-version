
-- Allow authenticated users to insert brands (admin-only in practice)
CREATE POLICY "Authenticated can insert brands" ON public.brand_accounts FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update brands
CREATE POLICY "Authenticated can update brands" ON public.brand_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow authenticated to insert campaigns
CREATE POLICY "Authenticated can insert campaigns" ON public.ad_campaigns FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated to update campaigns (pause/activate)
CREATE POLICY "Authenticated can update campaigns" ON public.ad_campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Read all campaigns (not just active) for admin
CREATE POLICY "Authenticated can read all campaigns" ON public.ad_campaigns FOR SELECT TO authenticated USING (true);

-- Allow authenticated to insert creatives
CREATE POLICY "Authenticated can insert creatives" ON public.ad_creatives FOR INSERT TO authenticated WITH CHECK (true);

-- Read all creatives for admin
CREATE POLICY "Authenticated can read all creatives" ON public.ad_creatives FOR SELECT TO authenticated USING (true);

-- Read all brands for admin
CREATE POLICY "Authenticated can read all brands" ON public.brand_accounts FOR SELECT TO authenticated USING (true);

-- Read impressions and clicks for reporting
CREATE POLICY "Authenticated can read impressions" ON public.ad_impressions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read clicks" ON public.ad_clicks FOR SELECT TO authenticated USING (true);
