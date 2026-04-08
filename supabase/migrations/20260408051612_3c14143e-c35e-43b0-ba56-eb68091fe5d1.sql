
CREATE TABLE public.ad_targeting (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  min_protein_gap numeric DEFAULT 0,
  max_user_budget numeric DEFAULT 0,
  cities text[] DEFAULT '{}',
  meal_context text DEFAULT 'any',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_targeting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read targeting" ON public.ad_targeting FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert targeting" ON public.ad_targeting FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update targeting" ON public.ad_targeting FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Add new placement slots to ad_placements
INSERT INTO public.ad_placements (slot_id, location_name, format, max_ads) VALUES
  ('dashboard_protein_nudge', 'Dashboard — Protein Gap Nudge', 'nudge', 1),
  ('dashboard_smart_pick', 'Dashboard — Smart Pick Card', 'native', 1),
  ('post_meal_suggestion', 'Post Meal — Complete Nutrition', 'nudge', 1)
ON CONFLICT DO NOTHING;
