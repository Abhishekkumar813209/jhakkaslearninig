-- Create a function to fetch roadmaps accessible to the current user
-- Admins see all roadmaps; students see roadmaps for their batch
CREATE OR REPLACE FUNCTION public.get_accessible_roadmaps()
RETURNS TABLE(
  id uuid,
  batch_id uuid,
  created_by uuid,
  total_days integer,
  start_date date,
  end_date date,
  status roadmap_status,
  ai_generated_plan jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  selected_subjects jsonb,
  pdf_source_id uuid,
  title text,
  description text,
  exam_type text,
  exam_name text,
  batch_name text,
  batch_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    br.id,
    br.batch_id,
    br.created_by,
    br.total_days,
    br.start_date,
    br.end_date,
    br.status,
    br.ai_generated_plan,
    br.created_at,
    br.updated_at,
    br.selected_subjects,
    br.pdf_source_id,
    br.title,
    br.description,
    br.exam_type,
    br.exam_name,
    b.name as batch_name,
    b.level as batch_level
  FROM batch_roadmaps br
  LEFT JOIN batches b ON b.id = br.batch_id
  WHERE 
    CASE 
      WHEN has_role(auth.uid(), 'admin'::user_role) THEN true
      ELSE br.batch_id = (SELECT batch_id FROM profiles WHERE id = auth.uid())
    END
  ORDER BY br.created_at DESC;
$$;