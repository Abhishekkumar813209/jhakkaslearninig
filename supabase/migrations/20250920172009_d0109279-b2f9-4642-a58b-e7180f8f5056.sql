-- Add support for multiple correct answers and images in questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS allow_multiple_correct BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Update options table to support multiple correct answers
-- (No change needed as we already support multiple is_correct = true)

-- Add image support to options as well
ALTER TABLE public.options
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for question images bucket
CREATE POLICY "Instructors can upload question images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-images' AND
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'teacher'::user_role))
);

CREATE POLICY "Anyone can view question images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'question-images');

CREATE POLICY "Instructors can update question images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question-images' AND
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'teacher'::user_role))
);

CREATE POLICY "Instructors can delete question images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-images' AND
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'teacher'::user_role))
);