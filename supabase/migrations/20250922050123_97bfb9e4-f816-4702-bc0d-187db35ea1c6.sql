-- Create guided_paths table if not exists (update existing)
CREATE TABLE IF NOT EXISTS public.guided_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  level TEXT NOT NULL, -- Foundation, Intermediate, Advanced
  duration_weeks INTEGER NOT NULL DEFAULT 0,
  target_students TEXT NOT NULL,
  objectives TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guided_path_chapters table
CREATE TABLE IF NOT EXISTS public.guided_path_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guided_path_id UUID NOT NULL REFERENCES public.guided_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_num INTEGER NOT NULL,
  estimated_hours INTEGER DEFAULT 0,
  topics TEXT[] DEFAULT '{}',
  playlist_id TEXT, -- YouTube playlist ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guided_path_resources table  
CREATE TABLE IF NOT EXISTS public.guided_path_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.guided_path_chapters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video', 'reading', 'practice', 'assessment')),
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  order_num INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_guided_paths table for enrollment
CREATE TABLE IF NOT EXISTS public.student_guided_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  guided_path_id UUID NOT NULL REFERENCES public.guided_paths(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progress INTEGER DEFAULT 0, -- 0-100
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, guided_path_id)
);

-- Enable RLS
ALTER TABLE public.guided_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_path_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_path_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guided_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guided_paths
CREATE POLICY "Admins can manage all guided paths" 
ON public.guided_paths FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view active guided paths" 
ON public.guided_paths FOR SELECT 
USING (is_active = true);

-- RLS Policies for chapters
CREATE POLICY "Admins can manage all chapters" 
ON public.guided_path_chapters FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view chapters of active paths" 
ON public.guided_path_chapters FOR SELECT 
USING (guided_path_id IN (
  SELECT id FROM public.guided_paths WHERE is_active = true
));

-- RLS Policies for resources
CREATE POLICY "Admins can manage all resources" 
ON public.guided_path_resources FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view resources of active paths" 
ON public.guided_path_resources FOR SELECT 
USING (chapter_id IN (
  SELECT gc.id FROM public.guided_path_chapters gc
  JOIN public.guided_paths gp ON gc.guided_path_id = gp.id
  WHERE gp.is_active = true
));

-- RLS Policies for student enrollments
CREATE POLICY "Students can enroll in guided paths" 
ON public.student_guided_paths FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their own enrollments" 
ON public.student_guided_paths FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress" 
ON public.student_guided_paths FOR UPDATE 
USING (student_id = auth.uid());

CREATE POLICY "Admins can view all enrollments" 
ON public.student_guided_paths FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create triggers for updated_at
CREATE TRIGGER update_guided_paths_updated_at
  BEFORE UPDATE ON public.guided_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guided_path_chapters_updated_at
  BEFORE UPDATE ON public.guided_path_chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();