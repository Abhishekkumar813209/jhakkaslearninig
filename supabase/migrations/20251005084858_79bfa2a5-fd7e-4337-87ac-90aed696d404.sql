-- Update the audit log trigger to handle NULL performed_by for system operations
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  changed_fields jsonb;
  current_user_id uuid;
BEGIN
  changed_fields = jsonb_build_object(
    'old', row_to_json(OLD),
    'new', row_to_json(NEW)
  );
  
  -- Use auth.uid() if available, otherwise use system user (NEW.id for migrations)
  current_user_id := COALESCE(auth.uid(), NEW.id);
  
  INSERT INTO public.profile_audit_log (
    profile_id,
    action,
    performed_by,
    changed_fields,
    success
  ) VALUES (
    NEW.id,
    'update',
    current_user_id,
    changed_fields,
    true
  );
  
  RETURN NEW;
END;
$function$;

-- Now assign Aanand to SSC batch
UPDATE profiles
SET batch_id = 'd616c8c9-1908-49b4-8391-2434dccf11a3'
WHERE id = '0abec614-340e-4b6b-a415-93c8ad4165f4';

-- Create student_roadmap entry for Aanand with SSC CGL roadmap
INSERT INTO student_roadmaps (student_id, batch_roadmap_id, progress, status)
VALUES ('0abec614-340e-4b6b-a415-93c8ad4165f4', '7571b684-78fd-4ba0-9343-0c71bb8fa75e', 0, 'not_started')
ON CONFLICT (student_id, batch_roadmap_id) DO NOTHING;