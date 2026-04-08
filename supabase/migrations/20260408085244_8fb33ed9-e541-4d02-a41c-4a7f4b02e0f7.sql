ALTER TABLE public.packed_products ADD COLUMN IF NOT EXISTS barcode text;
CREATE INDEX IF NOT EXISTS idx_packed_products_barcode ON public.packed_products (barcode) WHERE barcode IS NOT NULL;