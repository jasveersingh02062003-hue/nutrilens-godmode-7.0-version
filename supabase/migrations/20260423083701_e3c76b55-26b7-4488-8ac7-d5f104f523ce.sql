-- Drop existing FKs (if present) and recreate with proper ON DELETE behavior
ALTER TABLE public.ad_impressions DROP CONSTRAINT IF EXISTS ad_impressions_campaign_id_fkey;
ALTER TABLE public.ad_impressions DROP CONSTRAINT IF EXISTS ad_impressions_creative_id_fkey;
ALTER TABLE public.ad_clicks DROP CONSTRAINT IF EXISTS ad_clicks_campaign_id_fkey;
ALTER TABLE public.ad_clicks DROP CONSTRAINT IF EXISTS ad_clicks_impression_id_fkey;
ALTER TABLE public.ad_conversions DROP CONSTRAINT IF EXISTS ad_conversions_campaign_id_fkey;
ALTER TABLE public.ad_creatives DROP CONSTRAINT IF EXISTS ad_creatives_campaign_id_fkey;
ALTER TABLE public.ad_targeting DROP CONSTRAINT IF EXISTS ad_targeting_campaign_id_fkey;
ALTER TABLE public.ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_brand_id_fkey;
ALTER TABLE public.brand_transactions DROP CONSTRAINT IF EXISTS brand_transactions_brand_id_fkey;
ALTER TABLE public.brand_members DROP CONSTRAINT IF EXISTS brand_members_brand_id_fkey;
ALTER TABLE public.brand_documents DROP CONSTRAINT IF EXISTS brand_documents_brand_id_fkey;

-- Clean orphans
DELETE FROM public.ad_impressions WHERE campaign_id NOT IN (SELECT id FROM public.ad_campaigns);
DELETE FROM public.ad_impressions WHERE creative_id NOT IN (SELECT id FROM public.ad_creatives);
DELETE FROM public.ad_clicks WHERE campaign_id NOT IN (SELECT id FROM public.ad_campaigns);
DELETE FROM public.ad_clicks WHERE impression_id IS NOT NULL AND impression_id NOT IN (SELECT id FROM public.ad_impressions);
DELETE FROM public.ad_conversions WHERE campaign_id NOT IN (SELECT id FROM public.ad_campaigns);
DELETE FROM public.ad_creatives WHERE campaign_id NOT IN (SELECT id FROM public.ad_campaigns);
DELETE FROM public.ad_targeting WHERE campaign_id NOT IN (SELECT id FROM public.ad_campaigns);
DELETE FROM public.ad_campaigns WHERE brand_id NOT IN (SELECT id FROM public.brand_accounts);
DELETE FROM public.brand_transactions WHERE brand_id NOT IN (SELECT id FROM public.brand_accounts);
DELETE FROM public.brand_members WHERE brand_id NOT IN (SELECT id FROM public.brand_accounts);
DELETE FROM public.brand_documents WHERE brand_id NOT IN (SELECT id FROM public.brand_accounts);

-- Recreate with cascade
ALTER TABLE public.ad_impressions
  ADD CONSTRAINT ad_impressions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  ADD CONSTRAINT ad_impressions_creative_id_fkey FOREIGN KEY (creative_id) REFERENCES public.ad_creatives(id) ON DELETE CASCADE;

ALTER TABLE public.ad_clicks
  ADD CONSTRAINT ad_clicks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  ADD CONSTRAINT ad_clicks_impression_id_fkey FOREIGN KEY (impression_id) REFERENCES public.ad_impressions(id) ON DELETE SET NULL;

ALTER TABLE public.ad_conversions
  ADD CONSTRAINT ad_conversions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.ad_creatives
  ADD CONSTRAINT ad_creatives_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.ad_targeting
  ADD CONSTRAINT ad_targeting_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT ad_campaigns_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brand_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.brand_transactions
  ADD CONSTRAINT brand_transactions_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brand_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.brand_members
  ADD CONSTRAINT brand_members_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brand_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.brand_documents
  ADD CONSTRAINT brand_documents_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brand_accounts(id) ON DELETE CASCADE;

-- Indexes for FK lookups
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign_id ON public.ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_creative_id ON public.ad_impressions(creative_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign_id ON public.ad_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_impression_id ON public.ad_clicks(impression_id);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_campaign_id ON public.ad_conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id ON public.ad_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_targeting_campaign_id ON public.ad_targeting(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_brand_id ON public.ad_campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_transactions_brand_id ON public.brand_transactions(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_brand_id ON public.brand_members(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_documents_brand_id ON public.brand_documents(brand_id);