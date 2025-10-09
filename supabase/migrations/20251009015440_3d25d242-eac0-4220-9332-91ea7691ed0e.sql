-- Phase 12.1: Add exam-domain awareness to student_leagues
ALTER TABLE student_leagues 
ADD COLUMN exam_domain TEXT,
ADD COLUMN student_class TEXT,
ADD COLUMN exam_name TEXT;

-- Migrate existing data from profiles
UPDATE student_leagues sl
SET 
  exam_domain = p.exam_domain,
  student_class = p.student_class::TEXT,
  exam_name = p.target_exam
FROM profiles p
WHERE sl.student_id = p.id;

-- Create composite unique index for domain-aware leagues
CREATE UNIQUE INDEX idx_student_leagues_domain_unique 
ON student_leagues(student_id, league_week_start, exam_domain, student_class);

-- Phase 10: Add exam-domain awareness to subject_analytics
ALTER TABLE subject_analytics
ADD COLUMN exam_domain TEXT,
ADD COLUMN student_class TEXT;

-- Migrate existing data from profiles
UPDATE subject_analytics sa
SET 
  exam_domain = p.exam_domain,
  student_class = p.student_class::TEXT
FROM profiles p
WHERE sa.student_id = p.id;

-- Create index for domain-aware subject rankings
CREATE INDEX idx_subject_analytics_domain 
ON subject_analytics(subject, exam_domain, student_class, average_score DESC);

-- Phase 11: Add exam-domain awareness to student_gamification
ALTER TABLE student_gamification
ADD COLUMN exam_domain TEXT,
ADD COLUMN student_class TEXT;

-- Migrate existing data from profiles
UPDATE student_gamification sg
SET 
  exam_domain = p.exam_domain,
  student_class = p.student_class::TEXT
FROM profiles p
WHERE sg.student_id = p.id;

-- Create index for domain-aware XP rankings
CREATE INDEX idx_student_gamification_domain 
ON student_gamification(exam_domain, student_class, total_xp DESC);