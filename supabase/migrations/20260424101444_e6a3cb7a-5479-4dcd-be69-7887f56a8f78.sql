-- Add per-creative quick-commerce CTAs
ALTER TABLE public.ad_creatives
  ADD COLUMN IF NOT EXISTS zepto_url     text,
  ADD COLUMN IF NOT EXISTS blinkit_url   text,
  ADD COLUMN IF NOT EXISTS instamart_url text,
  ADD COLUMN IF NOT EXISTS amazon_url    text;

-- Block Amazon-only creatives (admins/service role bypass)
CREATE OR REPLACE FUNCTION public.guard_creative_qc_required()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := current_setting('role', true) = 'service_role';
  v_is_admin boolean := has_role(auth.uid(),'admin'::app_role)
                       OR has_role(auth.uid(),'super_admin'::app_role)
                       OR is_owner(auth.uid());
  v_has_qc boolean;
  v_has_amazon boolean;
  v_has_legacy_cta boolean;
BEGIN
  IF v_is_service OR v_is_admin THEN
    RETURN NEW;
  END IF;

  v_has_qc := COALESCE(NEW.zepto_url,'') <> ''
              OR COALESCE(NEW.blinkit_url,'') <> ''
              OR COALESCE(NEW.instamart_url,'') <> '';
  v_has_amazon := COALESCE(NEW.amazon_url,'') <> '';
  v_has_legacy_cta := COALESCE(NEW.cta_url,'') <> '';

  -- If Amazon is provided, at least one quick-commerce link is mandatory
  IF v_has_amazon AND NOT v_has_qc THEN
    RAISE EXCEPTION 'Amazon-only creatives are not allowed. Add at least one of Zepto / Blinkit / Instamart.'
      USING ERRCODE = '42501';
  END IF;

  -- If no QC and no Amazon and no legacy cta_url provided either → still allow
  -- (some creatives are pure brand awareness with no purchase CTA)
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_creative_qc_required ON public.ad_creatives;
CREATE TRIGGER trg_guard_creative_qc_required
  BEFORE INSERT OR UPDATE ON public.ad_creatives
  FOR EACH ROW EXECUTE FUNCTION public.guard_creative_qc_required();