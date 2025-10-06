-- Add intake duration columns to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS intake_start_date DATE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS intake_end_date DATE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_current_intake BOOLEAN DEFAULT true;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS auto_assign_enabled BOOLEAN DEFAULT true;

-- Create function to get active intake batch for auto-assignment
CREATE OR REPLACE FUNCTION get_active_intake_batch(
  p_exam_domain TEXT,
  p_exam_name TEXT,
  p_student_class TEXT,
  p_signup_date DATE
) RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
BEGIN
  -- Find batch where signup date falls within intake period
  SELECT id INTO v_batch_id
  FROM batches
  WHERE exam_type = p_exam_domain
    AND exam_name = p_exam_name
    AND (target_class::TEXT = p_student_class OR target_class IS NULL)
    AND is_active = true
    AND auto_assign_enabled = true
    AND intake_start_date IS NOT NULL
    AND intake_end_date IS NOT NULL
    AND p_signup_date BETWEEN intake_start_date AND intake_end_date
    AND current_strength < max_capacity
  ORDER BY intake_start_date DESC
  LIMIT 1;
  
  -- If no batch found with intake period, find nearest ongoing batch
  IF v_batch_id IS NULL THEN
    SELECT id INTO v_batch_id
    FROM batches
    WHERE exam_type = p_exam_domain
      AND exam_name = p_exam_name
      AND (target_class::TEXT = p_student_class OR target_class IS NULL)
      AND is_active = true
      AND auto_assign_enabled = true
      AND current_strength < max_capacity
      AND start_date <= p_signup_date
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;
  
  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update batch strength on profile changes
CREATE OR REPLACE FUNCTION update_batch_strength()
RETURNS TRIGGER AS $$
BEGIN
  -- If batch_id changed from NULL to a value, increment
  IF NEW.batch_id IS NOT NULL AND (OLD.batch_id IS NULL OR OLD.batch_id != NEW.batch_id) THEN
    UPDATE batches 
    SET current_strength = current_strength + 1
    WHERE id = NEW.batch_id;
    
    -- Check if batch is 90% full and send notification
    PERFORM check_batch_capacity(NEW.batch_id);
  END IF;
  
  -- If batch_id changed from a value to NULL, decrement
  IF OLD.batch_id IS NOT NULL AND (NEW.batch_id IS NULL OR NEW.batch_id != OLD.batch_id) THEN
    UPDATE batches 
    SET current_strength = GREATEST(0, current_strength - 1)
    WHERE id = OLD.batch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for batch strength updates
DROP TRIGGER IF EXISTS trigger_update_batch_strength ON profiles;
CREATE TRIGGER trigger_update_batch_strength
AFTER UPDATE OF batch_id ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_batch_strength();

-- Create function to check batch capacity and log notification
CREATE OR REPLACE FUNCTION check_batch_capacity(p_batch_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_strength INTEGER;
  v_max_capacity INTEGER;
  v_batch_name TEXT;
  v_capacity_percent NUMERIC;
BEGIN
  SELECT current_strength, max_capacity, name
  INTO v_current_strength, v_max_capacity, v_batch_name
  FROM batches
  WHERE id = p_batch_id;
  
  IF v_max_capacity > 0 THEN
    v_capacity_percent := (v_current_strength::NUMERIC / v_max_capacity::NUMERIC) * 100;
    
    -- If batch is 90% or more full, log it
    IF v_capacity_percent >= 90 THEN
      RAISE NOTICE 'Batch "%" is % full (% / %)', 
        v_batch_name, 
        ROUND(v_capacity_percent, 1), 
        v_current_strength, 
        v_max_capacity;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;