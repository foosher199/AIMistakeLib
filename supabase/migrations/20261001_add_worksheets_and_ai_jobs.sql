-- Saved worksheets, durable AI jobs, and private-image lifecycle helpers.

CREATE TABLE IF NOT EXISTS public.mistake_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '错题复习卷',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mistake_worksheet_questions (
  worksheet_id UUID NOT NULL REFERENCES public.mistake_worksheets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.mistake_questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (worksheet_id, question_id),
  UNIQUE (worksheet_id, position)
);

CREATE TABLE IF NOT EXISTS public.mistake_ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('image_recognition')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  image_id UUID REFERENCES public.mistake_images(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('vision', 'text', 'baidu_understanding', 'baidu_paper_cut')),
  idempotency_key TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS mistake_worksheets_user_updated_idx
  ON public.mistake_worksheets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS mistake_worksheet_questions_question_idx
  ON public.mistake_worksheet_questions(question_id);
CREATE INDEX IF NOT EXISTS mistake_ai_jobs_user_created_idx
  ON public.mistake_ai_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mistake_ai_jobs_status_updated_idx
  ON public.mistake_ai_jobs(status, updated_at);

ALTER TABLE public.mistake_worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_worksheet_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_ai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own worksheets" ON public.mistake_worksheets;
CREATE POLICY "Users can manage own worksheets" ON public.mistake_worksheets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own worksheet questions" ON public.mistake_worksheet_questions;
CREATE POLICY "Users can view own worksheet questions" ON public.mistake_worksheet_questions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.mistake_worksheets w
      WHERE w.id = worksheet_id AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add own worksheet questions" ON public.mistake_worksheet_questions;
CREATE POLICY "Users can add own worksheet questions" ON public.mistake_worksheet_questions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mistake_worksheets w
      WHERE w.id = worksheet_id AND w.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.mistake_questions q
      WHERE q.id = question_id AND q.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove own worksheet questions" ON public.mistake_worksheet_questions;
CREATE POLICY "Users can remove own worksheet questions" ON public.mistake_worksheet_questions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.mistake_worksheets w
      WHERE w.id = worksheet_id AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own AI jobs" ON public.mistake_ai_jobs;
CREATE POLICY "Users can view own AI jobs" ON public.mistake_ai_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.mistake_ai_jobs FROM anon, authenticated;
GRANT SELECT ON TABLE public.mistake_ai_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mistake_worksheets TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.mistake_worksheet_questions TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_orphaned_mistake_images(
  p_older_than INTERVAL DEFAULT interval '1 hour'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.mistake_images image
  SET status = 'orphaned', updated_at = now()
  WHERE image.status = 'active'
    AND image.created_at < now() - p_older_than
    AND NOT EXISTS (
      SELECT 1 FROM public.mistake_question_images link
      WHERE link.image_id = image.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.mistake_drafts draft
      WHERE draft.source_image_id = image.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.mistake_ai_jobs job
      WHERE job.image_id = image.id
        AND job.status IN ('queued', 'processing')
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_orphaned_mistake_images(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_orphaned_mistake_images(INTERVAL) TO service_role;
