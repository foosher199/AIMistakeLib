-- ============================================================================
-- 草稿/待处理题目表
-- 图片识别后的临时存储，用户保存后才移入 mistake_questions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mistake_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  answer TEXT NOT NULL,
  explanation TEXT,
  confidence NUMERIC,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 启用 Row Level Security
ALTER TABLE public.mistake_drafts ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能看到自己的草稿
CREATE POLICY "Users can view own drafts" ON public.mistake_drafts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts" ON public.mistake_drafts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON public.mistake_drafts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON public.mistake_drafts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 匿名用户也可以操作（如果有匿名登录场景）
CREATE POLICY "Anonymous users can view own drafts" ON public.mistake_drafts
  FOR SELECT TO anon
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can insert own drafts" ON public.mistake_drafts
  FOR INSERT TO anon
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can delete own drafts" ON public.mistake_drafts
  FOR DELETE TO anon
  USING (auth.uid() = user_id);

-- 索引：加速按用户查询
CREATE INDEX IF NOT EXISTS idx_mistake_drafts_user_id ON public.mistake_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_drafts_created_at ON public.mistake_drafts(created_at DESC);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mistake_drafts_updated_at
  BEFORE UPDATE ON public.mistake_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
