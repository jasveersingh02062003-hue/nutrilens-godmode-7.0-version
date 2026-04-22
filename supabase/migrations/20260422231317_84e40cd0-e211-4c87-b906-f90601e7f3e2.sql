
-- Helper functions (now safe — enum values committed)
CREATE OR REPLACE FUNCTION public.is_marketer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'marketer'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_support(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'support'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner'::public.app_role)
$$;

-- Profiles
CREATE POLICY "Marketers read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_marketer(auth.uid()));
CREATE POLICY "Support reads all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_support(auth.uid()));

-- Consent
CREATE POLICY "Marketers read all consent" ON public.consent_records
  FOR SELECT TO authenticated USING (public.is_marketer(auth.uid()) OR public.is_support(auth.uid()));

-- Events
CREATE POLICY "Marketers read all events" ON public.events
  FOR SELECT TO authenticated USING (public.is_marketer(auth.uid()));

-- Feedback
CREATE POLICY "Support read feedback" ON public.feedback
  FOR SELECT TO authenticated USING (public.is_support(auth.uid()));
CREATE POLICY "Support update feedback" ON public.feedback
  FOR UPDATE TO authenticated USING (public.is_support(auth.uid())) WITH CHECK (public.is_support(auth.uid()));

-- user_roles: owners can manage
CREATE POLICY "Owners manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- cost_constants
CREATE TABLE public.cost_constants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text NOT NULL UNIQUE,
  monthly_cost_inr numeric NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.cost_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read cost constants" ON public.cost_constants
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role) OR public.is_owner(auth.uid()));

CREATE POLICY "Admins manage cost constants" ON public.cost_constants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role) OR public.is_owner(auth.uid()));

CREATE TRIGGER cost_constants_updated_at
  BEFORE UPDATE ON public.cost_constants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- api_usage: admins/owners can insert
CREATE POLICY "Admins insert api usage" ON public.api_usage
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role) OR public.is_owner(auth.uid()));

-- brand_intake
CREATE TABLE public.brand_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  website text,
  monthly_budget_inr numeric,
  categories text[] DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'new',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit brand intake" ON public.brand_intake
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read brand intake" ON public.brand_intake
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role) OR public.is_owner(auth.uid()));

CREATE POLICY "Admins update brand intake" ON public.brand_intake
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role) OR public.is_owner(auth.uid()));
