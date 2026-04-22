CREATE TABLE public.monika_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monika_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own conversations"
  ON public.monika_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own conversations"
  ON public.monika_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own conversations"
  ON public.monika_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_monika_conv_user_created
  ON public.monika_conversations (user_id, created_at DESC);