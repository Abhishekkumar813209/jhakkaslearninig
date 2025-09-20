-- Add support for multiple correct answers and images in questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS allow_multiple_correct BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Add image support to options as well
ALTER TABLE public.options
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for question images bucket (only admin role exists)
CREATE POLICY "Admins can upload question images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-images' AND
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Anyone can view question images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'question-images');

CREATE POLICY "Admins can update question images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question-images' AND
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can delete question images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-images' AND
  has_role(auth.uid(), 'admin'::user_role)
);