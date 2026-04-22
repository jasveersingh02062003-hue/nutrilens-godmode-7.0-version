-- marketing_consent column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  target_table text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Authenticated insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);

-- api_usage
CREATE TABLE IF NOT EXISTS public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text NOT NULL CHECK (vendor IN ('firecrawl','lovable_ai','whatsapp','supabase','other')),
  units numeric NOT NULL DEFAULT 0,
  cost_inr numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read api usage"
  ON public.api_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_api_usage_created ON public.api_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_vendor ON public.api_usage (vendor, created_at DESC);

-- feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins update feedback"
  ON public.feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback (user_id, created_at DESC);

-- Admin-read RLS on existing user-data tables
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins read all daily logs"
  ON public.daily_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins read all weight logs"
  ON public.weight_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins read all water logs"
  ON public.water_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins read all supplement logs"
  ON public.supplement_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins read all event plans"
  ON public.event_plans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins read all achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins read all monika conversations"
  ON public.monika_conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));
