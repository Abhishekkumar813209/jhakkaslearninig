-- Add exam_type and allowed_classes to zones table
ALTER TABLE zones ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'school';
ALTER TABLE zones ADD COLUMN IF NOT EXISTS allowed_classes JSONB DEFAULT '["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"]'::jsonb;

-- Add exam_type and allowed_classes to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'school';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS allowed_classes JSONB DEFAULT '["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"]'::jsonb;

-- Add foreign key constraints to exam_types
ALTER TABLE zones 
  ADD CONSTRAINT fk_zones_exam_type 
  FOREIGN KEY (exam_type) REFERENCES exam_types(code) ON DELETE SET NULL;

ALTER TABLE schools 
  ADD CONSTRAINT fk_schools_exam_type 
  FOREIGN KEY (exam_type) REFERENCES exam_types(code) ON DELETE SET NULL;

-- Update existing zones to 'school' exam type for board students
UPDATE zones 
SET exam_type = 'school', 
    allowed_classes = '["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"]'::jsonb
WHERE exam_type IS NULL OR exam_type = 'school';

-- Update existing schools to 'school' exam type
UPDATE schools 
SET exam_type = 'school',
    allowed_classes = '["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"]'::jsonb
WHERE exam_type IS NULL OR exam_type = 'school';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zones_exam_type ON zones(exam_type);
CREATE INDEX IF NOT EXISTS idx_schools_exam_type ON schools(exam_type);