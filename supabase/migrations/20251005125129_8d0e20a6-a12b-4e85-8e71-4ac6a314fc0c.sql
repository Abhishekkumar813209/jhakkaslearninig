-- Add is_active column to student_roadmaps table
ALTER TABLE student_roadmaps
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update Aanand's roadmap to ensure it's active
UPDATE student_roadmaps
SET is_active = true
WHERE student_id = '0abec614-340e-4b6b-a415-93c8ad4165f4'
  AND batch_roadmap_id = '7571b684-78fd-4ba0-9343-0c71bb8fa75e';

-- Configure SSC batch for automatic roadmap assignment
UPDATE batches
SET linked_roadmap_id = '7571b684-78fd-4ba0-9343-0c71bb8fa75e',
    auto_assign_roadmap = true
WHERE id = 'd616c8c9-1908-49b4-8391-2434dccf11a3';