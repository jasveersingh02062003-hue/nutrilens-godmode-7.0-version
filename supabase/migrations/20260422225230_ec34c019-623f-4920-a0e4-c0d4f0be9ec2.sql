
-- 1. Add brand_manager role to existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'brand_manager';

-- 2. Events table (analytics log)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_user_created ON public.events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.events(created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins read all events"
  ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Consent records (DPDP)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  purpose text NOT NULL, -- 'marketing' | 'analytics' | 'personalization' | 'third_party_sharing'
  granted boolean NOT NULL,
  source text NOT NULL DEFAULT 'app', -- where consent was captured
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_user ON public.consent_records(user_id, purpose, created_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own consent"
  ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own consent"
  ON public.consent_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all consent"
  ON public.consent_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Brand members
CREATE TABLE IF NOT EXISTS public.brand_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'manager', -- 'owner' | 'manager' | 'viewer'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_brand_members_user ON public.brand_members(user_id);

ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;

-- Helper function to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_brand_member(_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_id = _brand_id AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Members read own brand membership"
  ON public.brand_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage brand members"
  ON public.brand_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 5. Brand transactions (wallet ledger)
CREATE TABLE IF NOT EXISTS public.brand_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,             -- positive = credit/top-up, negative = debit/spend
  type text NOT NULL,                  -- 'topup' | 'charge' | 'refund' | 'adjustment'
  reference text,                      -- invoice id, campaign id, etc.
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_brand_tx_brand_created ON public.brand_transactions(brand_id, created_at DESC);

ALTER TABLE public.brand_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand members read own transactions"
  ON public.brand_transactions FOR SELECT TO authenticated
  USING (public.is_brand_member(brand_id) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage brand transactions"
  ON public.brand_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 6. Brand documents (KYC)
CREATE TABLE IF NOT EXISTS public.brand_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  doc_type text NOT NULL,              -- 'pan' | 'gst' | 'incorporation' | 'other'
  storage_path text NOT NULL,          -- path inside private bucket 'brand-kyc'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  notes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brand_docs_brand ON public.brand_documents(brand_id, created_at DESC);

ALTER TABLE public.brand_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand members read own docs"
  ON public.brand_documents FOR SELECT TO authenticated
  USING (public.is_brand_member(brand_id) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Brand members upload own docs"
  ON public.brand_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_brand_member(brand_id) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage brand docs"
  ON public.brand_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 7. Private storage bucket for KYC docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-kyc', 'brand-kyc', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read KYC docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-kyc' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Brand members upload KYC docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-kyc'
    AND auth.uid() IS NOT NULL
  );
