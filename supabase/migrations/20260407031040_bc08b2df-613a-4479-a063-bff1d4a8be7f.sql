
-- Create packed product category enum
CREATE TYPE public.packed_product_category AS ENUM (
  'protein_drink', 'protein_bar', 'ready_to_eat', 'frozen',
  'spread', 'supplement', 'beverage', 'snack'
);

-- Price history table for trend charts
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  item_name text NOT NULL,
  avg_price numeric NOT NULL,
  price_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'static',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_city_item ON public.price_history (city, item_name);
CREATE INDEX idx_price_history_date ON public.price_history (price_date);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price history" ON public.price_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Edge functions can insert price history" ON public.price_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Edge functions can update price history" ON public.price_history
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Packed products table
CREATE TABLE public.packed_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  product_name text NOT NULL,
  category packed_product_category NOT NULL,
  mrp numeric NOT NULL,
  selling_price numeric,
  serving_size text,
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  fiber numeric DEFAULT 0,
  sugar numeric DEFAULT 0,
  pes_score numeric DEFAULT 0,
  cost_per_gram_protein numeric DEFAULT 0,
  allergens jsonb DEFAULT '[]'::jsonb,
  platforms jsonb DEFAULT '[]'::jsonb,
  image_url text,
  is_verified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_packed_products_category ON public.packed_products (category);
CREATE INDEX idx_packed_products_pes ON public.packed_products (pes_score DESC);

ALTER TABLE public.packed_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read packed products" ON public.packed_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Edge functions can insert packed products" ON public.packed_products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Edge functions can update packed products" ON public.packed_products
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Add updated_at trigger to packed_products
CREATE TRIGGER handle_packed_products_updated_at
  BEFORE UPDATE ON public.packed_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
