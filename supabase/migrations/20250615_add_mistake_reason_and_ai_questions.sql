-- ============================================================================
-- 新增错题错因分析字段 + AI 生成练习题目表
-- 日期: 2026-06-15
-- ============================================================================

-- 1. 为 mistake_questions 表新增错因分析相关字段
ALTER TABLE public.mistake_questions
ADD COLUMN IF NOT EXISTS mistake_reason TEXT[] DEFAULT '{}';

ALTER TABLE public.mistake_questions
ADD COLUMN IF NOT EXISTS mistake_reason_detail TEXT;

ALTER TABLE public.mistake_questions
ADD COLUMN IF NOT EXISTS mistake_reason_advice TEXT;

COMMENT ON COLUMN public.mistake_questions.mistake_reason IS '错因标签数组，如：{概念不清,计算失误}';
COMMENT ON COLUMN public.mistake_questions.mistake_reason_detail IS '错因一句话说明';
COMMENT ON COLUMN public.mistake_questions.mistake_reason_advice IS '针对性改进建议';

-- 2. 创建 AI 生成练习题目表
CREATE TABLE IF NOT EXISTS public.ai_generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_question_id UUID REFERENCES public.mistake_questions(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  answer TEXT NOT NULL,
  explanation TEXT,
  feedback_status TEXT NOT NULL DEFAULT 'pending' CHECK (feedback_status IN ('pending', 'valid', 'invalid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_generated_questions IS 'AI 根据错题生成的举一反三练习题目';
COMMENT ON COLUMN public.ai_generated_questions.source_question_id IS '关联的原始错题 ID';
COMMENT ON COLUMN public.ai_generated_questions.feedback_status IS '题目质量状态：pending 待校验/valid 校验通过/invalid 用户反馈不合理';

-- 3. 启用 RLS
ALTER TABLE public.ai_generated_questions ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：认证用户只能操作自己的 AI 生成题目
CREATE POLICY "Users can view own ai questions" ON public.ai_generated_questions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai questions" ON public.ai_generated_questions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai questions" ON public.ai_generated_questions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai questions" ON public.ai_generated_questions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. 匿名用户策略
CREATE POLICY "Anonymous users can view own ai questions" ON public.ai_generated_questions
  FOR SELECT TO anon
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can insert own ai questions" ON public.ai_generated_questions
  FOR INSERT TO anon
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can update own ai questions" ON public.ai_generated_questions
  FOR UPDATE TO anon
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can delete own ai questions" ON public.ai_generated_questions
  FOR DELETE TO anon
  USING (auth.uid() = user_id);

-- 6. 索引
CREATE INDEX IF NOT EXISTS idx_ai_generated_questions_user_id ON public.ai_generated_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_questions_source_question_id ON public.ai_generated_questions(source_question_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_questions_created_at ON public.ai_generated_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistake_questions_mistake_reason ON public.mistake_questions USING gin (mistake_reason);

-- 7. 自动更新 updated_at（复用已有函数，但单独创建触发器）
CREATE TRIGGER update_ai_generated_questions_updated_at
  BEFORE UPDATE ON public.ai_generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
