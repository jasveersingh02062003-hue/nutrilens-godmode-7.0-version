
-- Composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_city_prices_lookup ON city_prices(city, item_name, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON price_history(city, item_name, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_reports_lookup ON price_reports(city, item_name, reported_at DESC);

-- Add is_verified to price_reports
ALTER TABLE price_reports ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Price alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  city TEXT NOT NULL,
  threshold_price DECIMAL(10,2) NOT NULL,
  comparison_type TEXT NOT NULL DEFAULT 'below',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts" ON price_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON price_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON price_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON price_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);
