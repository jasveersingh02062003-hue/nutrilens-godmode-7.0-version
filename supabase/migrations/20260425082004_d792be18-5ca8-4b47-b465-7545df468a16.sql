-- ===== Item 1: Tighten brand-kyc storage policies =====
-- Drop the permissive INSERT policy that allowed any auth'd user to upload anywhere.
DROP POLICY IF EXISTS "Brand members upload KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins read KYC docs" ON storage.objects;

-- Folder convention: <brand_id>/<filename>
-- so (storage.foldername(name))[1] is the brand_id text.

-- SELECT: brand members read their own folder; admins read all.
CREATE POLICY "Brand members read own KYC docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-kyc'
  AND (
    (
      (storage.foldername(name))[1] IS NOT NULL
      AND is_brand_member(((storage.foldername(name))[1])::uuid)
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
  )
);

-- INSERT: brand members upload only into their own brand folder.
CREATE POLICY "Brand members upload own KYC docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-kyc'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    is_brand_member(((storage.foldername(name))[1])::uuid)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
  )
);

-- UPDATE: same scoping as INSERT.
CREATE POLICY "Brand members update own KYC docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-kyc'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    is_brand_member(((storage.foldername(name))[1])::uuid)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'brand-kyc'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    is_brand_member(((storage.foldername(name))[1])::uuid)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
  )
);

-- DELETE: admins only (preserve audit trail; brands cannot self-delete KYC docs).
CREATE POLICY "Admins delete KYC docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-kyc'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
  )
);

-- ===== Item 3 (small): harden price_alert_notifications realtime =====
-- REPLICA IDENTITY FULL ensures RLS policies see all columns at broadcast time
-- so the auth.uid() = user_id check applies correctly per-row.
ALTER TABLE public.price_alert_notifications REPLICA IDENTITY FULL;