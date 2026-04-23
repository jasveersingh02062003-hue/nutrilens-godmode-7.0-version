-- B1: GST invoice fields on brand accounts
ALTER TABLE public.brand_accounts
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb DEFAULT '{}'::jsonb;

-- B2: fraud protection columns
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS daily_click_cap integer NOT NULL DEFAULT 10;

ALTER TABLE public.ad_clicks
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false;

ALTER TABLE public.ad_impressions
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false;

-- Helpful indexes for fraud lookups
CREATE INDEX IF NOT EXISTS idx_ad_clicks_user_campaign_created
  ON public.ad_clicks (user_id, campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_clicks_user_created
  ON public.ad_clicks (user_id, created_at DESC);