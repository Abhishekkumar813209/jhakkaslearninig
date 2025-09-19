-- Add foreign key constraint between courses and profiles tables
ALTER TABLE public.courses 
ADD CONSTRAINT fk_courses_instructor_id 
FOREIGN KEY (instructor_id) REFERENCES public.profiles(id);