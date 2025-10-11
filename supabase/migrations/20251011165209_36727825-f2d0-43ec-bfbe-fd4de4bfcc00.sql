-- Step 1: Backfill existing student_gamification records with data from profiles
UPDATE student_gamification sg
SET 
  exam_domain = p.exam_domain,
  exam_name = COALESCE(p.target_exam, 'default'),
  student_class = p.student_class::TEXT,
  updated_at = NOW()
FROM profiles p
WHERE sg.student_id = p.id
  AND (sg.exam_domain IS NULL OR sg.student_class IS NULL OR sg.exam_name IS NULL);

-- Step 2: Create trigger to auto-sync when profile updates
CREATE OR REPLACE FUNCTION sync_student_gamification_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When profile is updated, sync to student_gamification
  UPDATE student_gamification
  SET 
    exam_domain = NEW.exam_domain,
    exam_name = COALESCE(NEW.target_exam, 'default'),
    student_class = NEW.student_class::TEXT,
    updated_at = NOW()
  WHERE student_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS sync_gamification_on_profile_update ON profiles;
CREATE TRIGGER sync_gamification_on_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.exam_domain IS DISTINCT FROM NEW.exam_domain OR
    OLD.target_exam IS DISTINCT FROM NEW.target_exam OR
    OLD.student_class IS DISTINCT FROM NEW.student_class
  )
  EXECUTE FUNCTION sync_student_gamification_from_profile();

-- Step 3: Update create_student_gamification trigger to sync data on insert
CREATE OR REPLACE FUNCTION public.create_student_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exam_domain TEXT;
  v_student_class TEXT;
  v_exam_name TEXT;
BEGIN
  -- Get data from profiles
  SELECT exam_domain, student_class::TEXT, COALESCE(target_exam, 'default')
  INTO v_exam_domain, v_student_class, v_exam_name
  FROM profiles
  WHERE id = NEW.id;
  
  -- Insert with proper data
  INSERT INTO public.student_gamification (
    student_id, 
    exam_domain, 
    student_class, 
    exam_name
  )
  VALUES (
    NEW.id, 
    v_exam_domain, 
    v_student_class, 
    v_exam_name
  )
  ON CONFLICT (student_id) DO UPDATE SET
    exam_domain = EXCLUDED.exam_domain,
    student_class = EXCLUDED.student_class,
    exam_name = EXCLUDED.exam_name,
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$;