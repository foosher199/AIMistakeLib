-- Private source images and durable question-image relationships.

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mistake-private-images',
  'mistake-private-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.mistake_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  original_filename TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'orphaned', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mistake_question_images (
  question_id UUID NOT NULL REFERENCES public.mistake_questions(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.mistake_images(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, image_id)
);

ALTER TABLE public.mistake_drafts
  ADD COLUMN IF NOT EXISTS source_image_id UUID
  REFERENCES public.mistake_images(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS mistake_images_user_created_idx
  ON public.mistake_images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mistake_question_images_image_idx
  ON public.mistake_question_images(image_id);
CREATE INDEX IF NOT EXISTS mistake_drafts_source_image_idx
  ON public.mistake_drafts(source_image_id);

ALTER TABLE public.mistake_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_question_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own images" ON public.mistake_images;
CREATE POLICY "Users can view own images" ON public.mistake_images
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own image metadata" ON public.mistake_images;
CREATE POLICY "Users can update own image metadata" ON public.mistake_images
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own question image links" ON public.mistake_question_images;
CREATE POLICY "Users can view own question image links" ON public.mistake_question_images
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.mistake_questions q
      WHERE q.id = question_id AND q.user_id = auth.uid()
    )
  );

-- Writes are performed by authenticated API routes after ownership checks.
DROP POLICY IF EXISTS "Users can link own questions and images" ON public.mistake_question_images;
CREATE POLICY "Users can link own questions and images" ON public.mistake_question_images
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mistake_questions q
      WHERE q.id = question_id AND q.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.mistake_images i
      WHERE i.id = image_id AND i.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can unlink own question images" ON public.mistake_question_images;
CREATE POLICY "Users can unlink own question images" ON public.mistake_question_images
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.mistake_questions q
      WHERE q.id = question_id AND q.user_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.mistake_images FROM anon;
REVOKE ALL ON TABLE public.mistake_question_images FROM anon;
GRANT SELECT, UPDATE ON TABLE public.mistake_images TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.mistake_question_images TO authenticated;
