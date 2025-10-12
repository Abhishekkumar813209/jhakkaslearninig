-- Add foreign key constraints to parent_student_links table
-- This will enable PostgREST to automatically join with profiles table

-- Add foreign key for student_id referencing profiles
ALTER TABLE parent_student_links 
ADD CONSTRAINT parent_student_links_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add foreign key for parent_id referencing profiles
ALTER TABLE parent_student_links 
ADD CONSTRAINT parent_student_links_parent_id_fkey 
FOREIGN KEY (parent_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add helpful comments
COMMENT ON CONSTRAINT parent_student_links_student_id_fkey ON parent_student_links 
IS 'Links student_id to profiles table for automatic PostgREST joins';

COMMENT ON CONSTRAINT parent_student_links_parent_id_fkey ON parent_student_links 
IS 'Links parent_id to profiles table for automatic PostgREST joins';