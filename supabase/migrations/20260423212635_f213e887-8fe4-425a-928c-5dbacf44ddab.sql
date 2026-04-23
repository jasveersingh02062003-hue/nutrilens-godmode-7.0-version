DROP POLICY IF EXISTS "Anyone can submit brand intake" ON public.brand_intake;

CREATE POLICY "Anyone can submit brand intake"
ON public.brand_intake
FOR INSERT
TO anon, authenticated
WITH CHECK (
  brand_name IS NOT NULL AND length(btrim(brand_name)) > 0
  AND contact_name IS NOT NULL AND length(btrim(contact_name)) > 0
  AND contact_email IS NOT NULL AND contact_email LIKE '%@%.%'
  AND status = 'new'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);