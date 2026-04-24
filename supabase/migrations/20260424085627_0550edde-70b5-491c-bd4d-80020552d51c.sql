
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (audience = 'admin' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR is_owner(auth.uid())))
    OR (audience = 'brand' AND brand_id IS NOT NULL AND is_brand_member(brand_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (audience = 'admin' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR is_owner(auth.uid())))
    OR (audience = 'brand' AND brand_id IS NOT NULL AND is_brand_member(brand_id))
  );
