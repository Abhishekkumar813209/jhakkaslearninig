-- ========================================
-- Phase 1: PDF Content Extraction + AI Processing
-- Database Schema Setup (Fixed - Using TEXT for difficulty)
-- ========================================

-- 1. Create Storage Bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-pdfs', 
  'content-pdfs', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Admins can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-pdfs' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can view PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'content-pdfs' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'content-pdfs' AND has_role(auth.uid(), 'admin'::user_role));

-- ========================================
-- 2. Content Sources Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf_upload', 'ai_generated')),
  file_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content sources"
ON public.content_sources FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- ========================================
-- 3. Study Content Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.study_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  content_type TEXT DEFAULT 'theory' CHECK (content_type IN ('theory', 'summary', 'key_points', 'explanation')),
  content TEXT NOT NULL,
  order_num INTEGER DEFAULT 1,
  target_class student_class,
  target_board education_board,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_content_source ON public.study_content(source_id);
CREATE INDEX idx_study_content_subject ON public.study_content(subject);
CREATE INDEX idx_study_content_chapter ON public.study_content(chapter_name);
CREATE INDEX idx_study_content_topic ON public.study_content(topic_name);
CREATE INDEX idx_study_content_approved ON public.study_content(is_approved);
CREATE INDEX idx_study_content_target ON public.study_content(target_class, target_board);

ALTER TABLE public.study_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all study content"
ON public.study_content FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view approved content"
ON public.study_content FOR SELECT
TO authenticated
USING (is_approved = true);

-- ========================================
-- 4. Generated Questions Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
  study_content_id UUID REFERENCES public.study_content(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'fill_up', 'true_false', 'match_column', 'subjective')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks INTEGER DEFAULT 1,
  subject TEXT,
  chapter_name TEXT,
  topic_name TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_questions_source ON public.generated_questions(source_id);
CREATE INDEX idx_generated_questions_study_content ON public.generated_questions(study_content_id);
CREATE INDEX idx_generated_questions_type ON public.generated_questions(question_type);
CREATE INDEX idx_generated_questions_difficulty ON public.generated_questions(difficulty);
CREATE INDEX idx_generated_questions_approved ON public.generated_questions(is_approved);
CREATE INDEX idx_generated_questions_subject ON public.generated_questions(subject);

ALTER TABLE public.generated_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all questions"
ON public.generated_questions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view approved questions"
ON public.generated_questions FOR SELECT
TO authenticated
USING (is_approved = true);

-- ========================================
-- 5. Content Approval Queue Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.content_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('study_content', 'question')),
  content_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  admin_feedback TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_queue_status ON public.content_approval_queue(status);
CREATE INDEX idx_approval_queue_source ON public.content_approval_queue(source_id);
CREATE INDEX idx_approval_queue_type ON public.content_approval_queue(content_type);

ALTER TABLE public.content_approval_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage approval queue"
ON public.content_approval_queue FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- ========================================
-- 6. Triggers for updated_at timestamps
-- ========================================
CREATE TRIGGER update_content_sources_updated_at
  BEFORE UPDATE ON public.content_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_content_updated_at
  BEFORE UPDATE ON public.study_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_questions_updated_at
  BEFORE UPDATE ON public.generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_queue_updated_at
  BEFORE UPDATE ON public.content_approval_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();