
CREATE TABLE public.ad_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id),
  user_id uuid NOT NULL,
  conversion_type text NOT NULL DEFAULT 'add_to_plan',
  product_id uuid REFERENCES public.packed_products(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read conversions" ON public.ad_conversions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert conversions" ON public.ad_conversions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
