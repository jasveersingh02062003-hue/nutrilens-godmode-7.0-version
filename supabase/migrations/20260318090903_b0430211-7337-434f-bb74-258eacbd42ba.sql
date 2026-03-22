-- Profiles table to store all user data
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  gender text,
  occupation text,
  job_type text,
  work_activity text,
  exercise_routine text,
  sleep_hours text,
  stress_level text,
  cooking_habits text,
  eating_out text,
  caffeine text,
  alcohol text,
  activity_level text,
  height_cm numeric,
  weight_kg numeric,
  dob text,
  age integer,
  goal text,
  target_weight numeric,
  goal_speed numeric,
  dietary_prefs jsonb DEFAULT '[]'::jsonb,
  health_conditions jsonb DEFAULT '[]'::jsonb,
  women_health jsonb DEFAULT '[]'::jsonb,
  men_health jsonb DEFAULT '{}'::jsonb,
  medications text,
  meal_times jsonb DEFAULT '{"breakfast":"08:00","lunch":"13:00","dinner":"20:00","snacks":"16:00"}'::jsonb,
  water_goal integer DEFAULT 8,
  onboarding_complete boolean DEFAULT false,
  daily_calories integer,
  daily_protein integer,
  daily_carbs integer,
  daily_fat integer,
  bmi numeric,
  bmr numeric,
  tdee numeric,
  conditions jsonb DEFAULT '{}'::jsonb,
  budget jsonb DEFAULT '{}'::jsonb,
  coach_settings jsonb DEFAULT '{"enabled":true,"frequency":"medium","tone":"friendly","topics":[]}'::jsonb,
  notification_settings jsonb DEFAULT '{}'::jsonb,
  learning jsonb DEFAULT '{}'::jsonb,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER on_profile_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();