
DROP POLICY "Service role can manage city prices" ON public.city_prices;

CREATE POLICY "Edge functions can insert city prices"
  ON public.city_prices FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Edge functions can update city prices"
  ON public.city_prices FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
