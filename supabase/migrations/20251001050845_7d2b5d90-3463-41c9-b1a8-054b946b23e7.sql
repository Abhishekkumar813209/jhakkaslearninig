-- Security Fix Part 5: Fix reorder_lectures function

-- Fix reorder_lectures function - add search_path
CREATE OR REPLACE FUNCTION public.reorder_lectures(course_id_param uuid, lecture_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(lecture_ids, 1) LOOP
    UPDATE lectures 
    SET order_num = i 
    WHERE id = lecture_ids[i] AND course_id = course_id_param;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reorder_lectures IS 'Security: Reorders lectures - uses SECURITY DEFINER with search_path protection';