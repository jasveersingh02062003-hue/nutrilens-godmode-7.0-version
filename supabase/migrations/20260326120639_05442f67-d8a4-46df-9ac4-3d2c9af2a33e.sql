
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

CREATE TABLE public.price_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city text NOT NULL,
  item_name text NOT NULL,
  price_per_unit numeric NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  reported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
  ON public.price_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all reports"
  ON public.price_reports FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.city_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  item_name text NOT NULL,
  avg_price numeric NOT NULL,
  min_price numeric,
  max_price numeric,
  report_count int DEFAULT 0,
  source text NOT NULL DEFAULT 'crowdsource',
  price_date date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city, item_name, price_date, source)
);

ALTER TABLE public.city_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read city prices"
  ON public.city_prices FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage city prices"
  ON public.city_prices FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_city_prices_lookup ON public.city_prices(city, item_name, price_date DESC);
CREATE INDEX idx_price_reports_city_item ON public.price_reports(city, item_name, reported_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.city_prices;
