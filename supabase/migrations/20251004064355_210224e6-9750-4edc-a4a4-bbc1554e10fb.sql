-- Add unique constraint to exam_templates if not exists
ALTER TABLE exam_templates DROP CONSTRAINT IF EXISTS exam_templates_exam_name_exam_type_key;
ALTER TABLE exam_templates ADD CONSTRAINT exam_templates_exam_name_exam_type_key UNIQUE (exam_name, exam_type);

-- Insert standard exam templates for popular exams
INSERT INTO exam_templates (exam_name, exam_type, standard_subjects, is_active) VALUES
  ('SSC CGL', 'SSC', '["Reasoning", "Quantitative Aptitude", "English", "General Knowledge"]'::jsonb, true),
  ('SSC CHSL', 'SSC', '["Reasoning", "Quantitative Aptitude", "English", "General Awareness"]'::jsonb, true),
  ('UPSC CSE Prelims', 'UPSC', '["General Studies Paper 1", "CSAT (Paper 2)"]'::jsonb, true),
  ('UPSC CSE Mains', 'UPSC', '["Essay", "General Studies I", "General Studies II", "General Studies III", "General Studies IV"]'::jsonb, true),
  ('IBPS PO', 'Banking', '["Reasoning", "Quantitative Aptitude", "English", "General Awareness", "Computer Awareness"]'::jsonb, true),
  ('SBI PO', 'Banking', '["Reasoning", "Quantitative Aptitude", "English", "General Awareness", "Data Analysis"]'::jsonb, true),
  ('CAT', 'Management', '["Quantitative Aptitude", "Data Interpretation & Logical Reasoning", "Verbal Ability & Reading Comprehension"]'::jsonb, true),
  ('IIT JEE', 'Engineering', '["Physics", "Chemistry", "Mathematics"]'::jsonb, true),
  ('NEET UG', 'Medical-UG', '["Physics", "Chemistry", "Biology"]'::jsonb, true),
  ('NEET PG', 'Medical-PG', '["General Medicine", "Surgery", "Obstetrics & Gynaecology", "Pediatrics", "Preventive & Social Medicine"]'::jsonb, true),
  ('CBSE Class 8', 'School', '["Mathematics", "Science", "Social Science", "English", "Hindi"]'::jsonb, true),
  ('CBSE Class 9', 'School', '["Mathematics", "Science", "Social Science", "English", "Hindi"]'::jsonb, true),
  ('CBSE Class 10', 'School', '["Mathematics", "Science", "Social Science", "English", "Hindi"]'::jsonb, true),
  ('CBSE Class 11 (PCM)', 'School', '["Physics", "Chemistry", "Mathematics", "English"]'::jsonb, true),
  ('CBSE Class 11 (PCB)', 'School', '["Physics", "Chemistry", "Biology", "English"]'::jsonb, true),
  ('CBSE Class 12 (PCM)', 'School', '["Physics", "Chemistry", "Mathematics", "English"]'::jsonb, true),
  ('CBSE Class 12 (PCB)', 'School', '["Physics", "Chemistry", "Biology", "English"]'::jsonb, true),
  ('ICSE Class 10', 'School', '["Mathematics", "Science", "Social Studies", "English"]'::jsonb, true),
  ('NDA', 'Defence', '["Mathematics", "General Ability Test"]'::jsonb, true),
  ('CDS', 'Defence', '["English", "General Knowledge", "Elementary Mathematics"]'::jsonb, true)
ON CONFLICT (exam_name, exam_type) DO UPDATE SET
  standard_subjects = EXCLUDED.standard_subjects,
  is_active = EXCLUDED.is_active,
  updated_at = now();