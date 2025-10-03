-- Create exam_templates table
CREATE TABLE IF NOT EXISTS exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  standard_subjects JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chapter_library table
CREATE TABLE IF NOT EXISTS chapter_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  suggested_days INTEGER DEFAULT 3,
  difficulty TEXT DEFAULT 'medium',
  topics JSONB,
  is_custom BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create study_configurations table
CREATE TABLE IF NOT EXISTS study_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES batch_roadmaps(id) ON DELETE CASCADE,
  chapters_per_day INTEGER DEFAULT 3,
  study_days_per_week JSONB DEFAULT '[1,2,3,4,5,6]'::jsonb,
  parallel_study_enabled BOOLEAN DEFAULT true,
  weekly_subject_distribution JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to batch_roadmaps
ALTER TABLE batch_roadmaps 
ADD COLUMN IF NOT EXISTS exam_type TEXT,
ADD COLUMN IF NOT EXISTS exam_name TEXT,
ADD COLUMN IF NOT EXISTS selected_subjects JSONB,
ADD COLUMN IF NOT EXISTS pdf_source_id UUID REFERENCES content_sources(id);

-- Add columns to roadmap_chapters
ALTER TABLE roadmap_chapters
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selected_from_library BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chapter_library_id UUID REFERENCES chapter_library(id),
ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT true;

-- Enable RLS on new tables
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies for exam_templates
CREATE POLICY "Admins can manage exam templates"
  ON exam_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Everyone can view active exam templates"
  ON exam_templates FOR SELECT
  USING (is_active = true);

-- RLS policies for chapter_library
CREATE POLICY "Admins can manage chapter library"
  ON chapter_library FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Everyone can view active chapters"
  ON chapter_library FOR SELECT
  USING (is_active = true);

-- RLS policies for study_configurations
CREATE POLICY "Admins can manage study configurations"
  ON study_configurations FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_templates_type ON exam_templates(exam_type);
CREATE INDEX IF NOT EXISTS idx_chapter_library_subject ON chapter_library(exam_type, subject);
CREATE INDEX IF NOT EXISTS idx_study_configurations_roadmap ON study_configurations(roadmap_id);