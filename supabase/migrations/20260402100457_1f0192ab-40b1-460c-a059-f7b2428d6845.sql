CREATE TABLE public.event_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  start_date text NOT NULL,
  end_date text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plans" ON public.event_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.event_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.event_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.event_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER handle_event_plans_updated_at BEFORE UPDATE ON public.event_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();