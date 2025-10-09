-- Drop old triggers that reference student_xp_coins
DROP TRIGGER IF EXISTS on_auth_user_created_xp_coins ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_xp_coins ON public.profiles;

-- Update create_student_gamification function to use correct table
CREATE OR REPLACE FUNCTION public.create_student_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam_domain TEXT;
  v_student_class TEXT;
  v_exam_name TEXT;
BEGIN
  SELECT exam_domain, student_class::TEXT, target_exam 
  INTO v_exam_domain, v_student_class, v_exam_name
  FROM profiles
  WHERE id = NEW.id;
  
  INSERT INTO public.student_gamification (student_id, exam_domain, student_class, exam_name)
  VALUES (NEW.id, v_exam_domain, v_student_class, v_exam_name)
  ON CONFLICT (student_id) DO UPDATE SET
    exam_domain = v_exam_domain,
    student_class = v_student_class,
    exam_name = v_exam_name;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_gamification ON public.profiles;
CREATE TRIGGER on_profile_created_gamification
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_student_gamification();

-- Update create_student_hearts function
CREATE OR REPLACE FUNCTION public.create_student_hearts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_hearts (student_id)
  VALUES (NEW.id)
  ON CONFLICT (student_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate hearts trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_hearts ON public.profiles;
CREATE TRIGGER on_profile_created_hearts
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_student_hearts();