
-- 1. Brand Accounts
CREATE TABLE public.brand_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  contact_email text,
  logo_url text,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active brands" ON public.brand_accounts FOR SELECT TO authenticated USING (status = 'active');

-- 2. Ad Campaigns
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brand_accounts(id) ON DELETE CASCADE NOT NULL,
  campaign_name text NOT NULL,
  placement_slot text NOT NULL DEFAULT 'hero_banner',
  budget_total numeric NOT NULL DEFAULT 0,
  budget_spent numeric NOT NULL DEFAULT 0,
  pricing_model text NOT NULL DEFAULT 'fixed',
  cpc_rate numeric DEFAULT 0,
  cpm_rate numeric DEFAULT 0,
  pes_score numeric NOT NULL DEFAULT 0,
  target_categories text[] DEFAULT '{}',
  target_diet text NOT NULL DEFAULT 'all',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active campaigns" ON public.ad_campaigns FOR SELECT TO authenticated USING (status = 'active');

-- 3. Ad Creatives
CREATE TABLE public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  image_url text,
  headline text NOT NULL,
  subtitle text,
  cta_text text DEFAULT 'Learn More',
  cta_url text,
  format text NOT NULL DEFAULT 'native',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active creatives" ON public.ad_creatives FOR SELECT TO authenticated USING (is_active = true);

-- 4. Ad Placements (slot definitions)
CREATE TABLE public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id text UNIQUE NOT NULL,
  location_name text NOT NULL,
  format text NOT NULL DEFAULT 'native',
  max_ads integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active placements" ON public.ad_placements FOR SELECT TO authenticated USING (is_active = true);

-- 5. Ad Impressions (tracking)
CREATE TABLE public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  creative_id uuid REFERENCES public.ad_creatives(id) ON DELETE CASCADE NOT NULL,
  placement_slot text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can log impressions" ON public.ad_impressions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Ad Clicks (tracking)
CREATE TABLE public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impression_id uuid REFERENCES public.ad_impressions(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can log clicks" ON public.ad_clicks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Seed default placement slots
INSERT INTO public.ad_placements (slot_id, location_name, format, max_ads) VALUES
  ('hero_banner', 'Market Shop - Hero Carousel', 'banner', 1),
  ('category_promoted', 'Category Page - Promoted Pick', 'native', 1),
  ('search_boost', 'Search Results - Top Position', 'native', 2),
  ('compare_sidebar', 'Compare Tab - Sidebar Card', 'native', 1),
  ('post_meal_nudge', 'Post-Meal Suggestion', 'nudge', 1);

-- Add updated_at triggers
CREATE TRIGGER set_brand_accounts_updated_at BEFORE UPDATE ON public.brand_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_ad_campaigns_updated_at BEFORE UPDATE ON public.ad_campaigns FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
