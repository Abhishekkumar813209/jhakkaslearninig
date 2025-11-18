-- ============================================
-- PHASE 1: CENTRALIZED QUESTION BANK MIGRATION
-- ============================================

-- 1. Add columns to chapter_library for comprehensive topic storage
ALTER TABLE chapter_library
ADD COLUMN IF NOT EXISTS full_topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS topics_strategy TEXT DEFAULT 'comprehensive';

COMMENT ON COLUMN chapter_library.full_topics IS 'Comprehensive AI-generated topic list (10-15 topics) stored as JSONB array';
COMMENT ON COLUMN chapter_library.topics_strategy IS 'Strategy used: comprehensive, focused, or custom';

-- 2. Add chapter_library_id foreign key to roadmap_chapters
ALTER TABLE roadmap_chapters
ADD COLUMN IF NOT EXISTS chapter_library_id UUID REFERENCES chapter_library(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_chapters_library_id ON roadmap_chapters(chapter_library_id);

COMMENT ON COLUMN roadmap_chapters.chapter_library_id IS 'Links roadmap chapter to centralized chapter library';

-- 3. Extend question_bank for centralized questions
ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS chapter_library_id UUID REFERENCES chapter_library(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS centralized_topic_name TEXT,
ADD COLUMN IF NOT EXISTS is_centralized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS applicable_classes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS applicable_exams TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_question_bank_library_id ON question_bank(chapter_library_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_centralized_topic ON question_bank(centralized_topic_name) WHERE is_centralized = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_bank_is_centralized ON question_bank(is_centralized);

COMMENT ON COLUMN question_bank.chapter_library_id IS 'FK to chapter_library for centralized questions';
COMMENT ON COLUMN question_bank.centralized_topic_name IS 'Standardized topic name from chapter_library.full_topics';
COMMENT ON COLUMN question_bank.is_centralized IS 'TRUE if question is in centralized bank (batch_id = NULL)';
COMMENT ON COLUMN question_bank.applicable_classes IS 'Array of class levels this question applies to (e.g., [''11'', ''12''])';
COMMENT ON COLUMN question_bank.applicable_exams IS 'Array of exam types this question is relevant for (e.g., [''JEE Main'', ''JEE Advanced''])';

-- 4. Create batch_question_assignments junction table
CREATE TABLE IF NOT EXISTS batch_question_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  roadmap_topic_id UUID NOT NULL REFERENCES roadmap_topics(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  chapter_library_id UUID REFERENCES chapter_library(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assignment_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, roadmap_topic_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_assignments_batch ON batch_question_assignments(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_assignments_topic ON batch_question_assignments(roadmap_topic_id);
CREATE INDEX IF NOT EXISTS idx_batch_assignments_question ON batch_question_assignments(question_id);
CREATE INDEX IF NOT EXISTS idx_batch_assignments_library ON batch_question_assignments(chapter_library_id);
CREATE INDEX IF NOT EXISTS idx_batch_assignments_active ON batch_question_assignments(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE batch_question_assignments IS 'Junction table linking centralized questions to batch topics';

-- 5. Create centralized_topic_mappings table
CREATE TABLE IF NOT EXISTS centralized_topic_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_topic_id UUID NOT NULL REFERENCES roadmap_topics(id) ON DELETE CASCADE,
  chapter_library_id UUID NOT NULL REFERENCES chapter_library(id) ON DELETE CASCADE,
  centralized_topic_name TEXT NOT NULL,
  mapping_confidence TEXT DEFAULT 'exact_match' CHECK (mapping_confidence IN ('exact_match', 'fuzzy_match', 'manual_override')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roadmap_topic_id, chapter_library_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_mappings_roadmap ON centralized_topic_mappings(roadmap_topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_mappings_library ON centralized_topic_mappings(chapter_library_id);
CREATE INDEX IF NOT EXISTS idx_topic_mappings_name ON centralized_topic_mappings(centralized_topic_name);

COMMENT ON TABLE centralized_topic_mappings IS 'Maps roadmap topics to centralized chapter library topics';

-- 6. RLS Policies for new tables

-- batch_question_assignments policies
ALTER TABLE batch_question_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all assignments"
ON batch_question_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students view assignments for their batch"
ON batch_question_assignments
FOR SELECT
TO authenticated
USING (
  batch_id IN (
    SELECT batch_id FROM profiles WHERE id = auth.uid()
  )
  AND is_active = TRUE
);

-- centralized_topic_mappings policies
ALTER TABLE centralized_topic_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all topic mappings"
ON centralized_topic_mappings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students view mappings for their roadmaps"
ON centralized_topic_mappings
FOR SELECT
TO authenticated
USING (
  roadmap_topic_id IN (
    SELECT rt.id FROM roadmap_topics rt
    JOIN roadmap_chapters rc ON rt.chapter_id = rc.id
    JOIN batch_roadmaps br ON rc.roadmap_id = br.id
    JOIN profiles p ON br.batch_id = p.batch_id
    WHERE p.id = auth.uid()
  )
);

-- 7. Update existing question_bank RLS to allow centralized questions
CREATE POLICY "Students view centralized questions assigned to their batch"
ON question_bank
FOR SELECT
TO authenticated
USING (
  is_centralized = TRUE
  AND id IN (
    SELECT question_id FROM batch_question_assignments
    WHERE batch_id IN (
      SELECT batch_id FROM profiles WHERE id = auth.uid()
    )
    AND is_active = TRUE
  )
);

-- 8. Trigger to auto-update centralized_topic_mappings.updated_at
CREATE OR REPLACE FUNCTION update_topic_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_topic_mapping_timestamp
BEFORE UPDATE ON centralized_topic_mappings
FOR EACH ROW
EXECUTE FUNCTION update_topic_mapping_timestamp();