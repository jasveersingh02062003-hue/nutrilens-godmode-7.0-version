-- =========================================================
-- P0-2: Lockdown meal-photos storage bucket
-- =========================================================

-- 1. Flip bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'meal-photos';

-- 2. Drop any pre-existing policies on meal-photos to start clean
DROP POLICY IF EXISTS "meal-photos public read" ON storage.objects;
DROP POLICY IF EXISTS "meal-photos owner read" ON storage.objects;
DROP POLICY IF EXISTS "meal-photos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "meal-photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "meal-photos owner delete" ON storage.objects;
DROP POLICY IF EXISTS "meal-photos staff read" ON storage.objects;

-- 3. Owner-folder RLS: path must start with the user's UID
CREATE POLICY "meal-photos owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "meal-photos owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "meal-photos owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'meal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "meal-photos owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Staff moderation read access
CREATE POLICY "meal-photos staff read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meal-photos'
  AND public.is_staff(auth.uid())
);