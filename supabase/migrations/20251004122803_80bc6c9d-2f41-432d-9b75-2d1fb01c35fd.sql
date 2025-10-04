-- Create exam_types table
CREATE TABLE IF NOT EXISTS public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon_name TEXT,
  color_class TEXT,
  available_exams JSONB DEFAULT '[]'::jsonb,
  requires_class BOOLEAN DEFAULT false,
  requires_board BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active exam types"
ON public.exam_types
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage exam types"
ON public.exam_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Seed initial exam types
INSERT INTO public.exam_types (code, display_name, category, icon_name, color_class, available_exams, requires_class, requires_board, display_order) VALUES
('school', 'School/Board Exams', 'school', 'GraduationCap', 'bg-blue-500', '["CBSE", "ICSE", "State Board"]'::jsonb, true, true, 1),
('engineering', 'Engineering (IIT JEE)', 'competitive', 'Wrench', 'bg-purple-500', '["JEE Main", "JEE Advanced", "BITSAT", "VITEEE", "SRMJEEE"]'::jsonb, false, false, 2),
('medical-ug', 'Medical UG (NEET UG)', 'competitive', 'Heart', 'bg-red-500', '["NEET UG", "AIIMS", "JIPMER"]'::jsonb, false, false, 3),
('medical-pg', 'Medical PG (NEET PG)', 'competitive', 'Stethoscope', 'bg-pink-500', '["NEET PG", "INI CET", "FMGE"]'::jsonb, false, false, 4),
('ssc', 'SSC (Staff Selection)', 'government', 'Briefcase', 'bg-green-500', '["SSC CGL", "SSC CHSL", "SSC MTS", "SSC GD"]'::jsonb, false, false, 5),
('banking', 'Banking', 'government', 'Building2', 'bg-yellow-500', '["IBPS PO", "IBPS Clerk", "SBI PO", "SBI Clerk", "RBI Grade B"]'::jsonb, false, false, 6),
('upsc', 'UPSC (Civil Services)', 'government', 'Scale', 'bg-indigo-500', '["Civil Services", "IES", "CDS", "CAPF"]'::jsonb, false, false, 7),
('railway', 'Railway', 'government', 'Train', 'bg-orange-500', '["RRB NTPC", "RRB Group D", "RRB ALP", "RRB JE"]'::jsonb, false, false, 8),
('defence', 'Defence', 'government', 'Shield', 'bg-teal-500', '["NDA", "CDS", "AFCAT", "Navy SSR", "Army Clerk"]'::jsonb, false, false, 9),
('custom', 'Custom Exam', 'custom', 'Star', 'bg-gray-500', '[]'::jsonb, false, false, 10);

-- Create index for faster queries
CREATE INDEX idx_exam_types_code ON public.exam_types(code);
CREATE INDEX idx_exam_types_category ON public.exam_types(category);
CREATE INDEX idx_exam_types_active ON public.exam_types(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_exam_types_updated_at
BEFORE UPDATE ON public.exam_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();