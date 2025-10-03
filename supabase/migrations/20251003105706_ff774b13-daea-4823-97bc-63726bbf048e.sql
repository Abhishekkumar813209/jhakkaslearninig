-- Sprint 1: Database Schema Updates

-- Add exam-related columns to batches table
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS exam_type text,
ADD COLUMN IF NOT EXISTS exam_name text,
ADD COLUMN IF NOT EXISTS target_class student_class,
ADD COLUMN IF NOT EXISTS target_board education_board,
ADD COLUMN IF NOT EXISTS linked_roadmap_id uuid REFERENCES public.batch_roadmaps(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_assign_roadmap boolean DEFAULT false;

-- Add exam-related columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS exam_domain text,
ADD COLUMN IF NOT EXISTS target_exam text,
ADD COLUMN IF NOT EXISTS preparation_level text;

-- Create exam_domains reference table
CREATE TABLE IF NOT EXISTS public.exam_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name text NOT NULL UNIQUE,
  category text NOT NULL,
  description text,
  available_exams jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_domains
CREATE POLICY "Everyone can view active exam domains"
  ON public.exam_domains
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage exam domains"
  ON public.exam_domains
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Insert default exam domains
INSERT INTO public.exam_domains (domain_name, category, description, available_exams) VALUES
('School Education', 'academic', 'Regular school curriculum based batches', '[
  {"name": "CBSE", "classes": ["6", "7", "8", "9", "10", "11", "12"]},
  {"name": "ICSE", "classes": ["6", "7", "8", "9", "10", "11", "12"]},
  {"name": "State Board", "classes": ["6", "7", "8", "9", "10", "11", "12"]}
]'::jsonb),
('SSC Exams', 'competitive', 'Staff Selection Commission exams', '[
  {"name": "SSC CGL", "level": "Graduate"},
  {"name": "SSC CHSL", "level": "12th Pass"},
  {"name": "SSC MTS", "level": "10th Pass"},
  {"name": "SSC GD", "level": "10th Pass"}
]'::jsonb),
('Banking Exams', 'competitive', 'Banking sector recruitment exams', '[
  {"name": "IBPS PO", "level": "Graduate"},
  {"name": "IBPS Clerk", "level": "Graduate"},
  {"name": "SBI PO", "level": "Graduate"},
  {"name": "SBI Clerk", "level": "Graduate"},
  {"name": "RBI Grade B", "level": "Graduate"}
]'::jsonb),
('UPSC Exams', 'competitive', 'Union Public Service Commission exams', '[
  {"name": "UPSC CSE Prelims", "level": "Graduate"},
  {"name": "UPSC CSE Mains", "level": "Graduate"},
  {"name": "UPSC CDS", "level": "Graduate"},
  {"name": "UPSC NDA", "level": "12th Pass"}
]'::jsonb),
('Engineering Entrance', 'entrance', 'Engineering college entrance exams', '[
  {"name": "JEE Main", "level": "12th/12th Pass"},
  {"name": "JEE Advanced", "level": "12th/12th Pass"},
  {"name": "BITSAT", "level": "12th/12th Pass"}
]'::jsonb),
('Medical Entrance', 'entrance', 'Medical college entrance exams', '[
  {"name": "NEET UG", "level": "12th/12th Pass"},
  {"name": "AIIMS", "level": "12th/12th Pass"}
]'::jsonb),
('Custom Exam', 'custom', 'Custom exam preparation batches', '[]'::jsonb)
ON CONFLICT (domain_name) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_batches_exam_type ON public.batches(exam_type);
CREATE INDEX IF NOT EXISTS idx_batches_target_class ON public.batches(target_class);
CREATE INDEX IF NOT EXISTS idx_batches_linked_roadmap ON public.batches(linked_roadmap_id);
CREATE INDEX IF NOT EXISTS idx_profiles_exam_domain ON public.profiles(exam_domain);
CREATE INDEX IF NOT EXISTS idx_profiles_target_exam ON public.profiles(target_exam);

-- Add trigger for updated_at on exam_domains
CREATE TRIGGER update_exam_domains_updated_at
  BEFORE UPDATE ON public.exam_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();