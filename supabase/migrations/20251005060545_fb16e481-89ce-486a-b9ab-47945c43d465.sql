-- Update existing SSC roadmap to have proper exam_type
UPDATE batch_roadmaps 
SET 
  exam_type = 'ssc', 
  exam_name = 'SSC CGL',
  updated_at = now()
WHERE id = '7571b684-78fd-4ba0-9343-0c71bb8fa75e';