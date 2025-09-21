-- Create learning_paths table to store user's custom learning paths
CREATE TABLE public.learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  estimated_completion_date DATE,
  is_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create playlists table to store YouTube playlists added by users  
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_playlist_id TEXT NOT NULL,
  chapter TEXT,
  video_count INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  order_num INTEGER DEFAULT 1,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new columns to existing lectures table
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_paths
CREATE POLICY "Students can view their own learning paths" 
ON public.learning_paths FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can create their own learning paths" 
ON public.learning_paths FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own learning paths" 
ON public.learning_paths FOR UPDATE 
USING (student_id = auth.uid());

CREATE POLICY "Students can delete their own learning paths" 
ON public.learning_paths FOR DELETE 
USING (student_id = auth.uid());

-- RLS Policies for playlists
CREATE POLICY "Students can view playlists in their learning paths" 
ON public.playlists FOR SELECT 
USING (learning_path_id IN (
  SELECT id FROM public.learning_paths WHERE student_id = auth.uid()
));

CREATE POLICY "Students can create playlists in their learning paths" 
ON public.playlists FOR INSERT 
WITH CHECK (learning_path_id IN (
  SELECT id FROM public.learning_paths WHERE student_id = auth.uid()
));

CREATE POLICY "Students can update playlists in their learning paths" 
ON public.playlists FOR UPDATE 
USING (learning_path_id IN (
  SELECT id FROM public.learning_paths WHERE student_id = auth.uid()
));

CREATE POLICY "Students can delete playlists in their learning paths" 
ON public.playlists FOR DELETE 
USING (learning_path_id IN (
  SELECT id FROM public.learning_paths WHERE student_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_learning_paths_student_id ON public.learning_paths(student_id);
CREATE INDEX idx_playlists_learning_path_id ON public.playlists(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_lectures_playlist_id ON public.lectures(playlist_id);

-- Create updated_at triggers
CREATE TRIGGER update_learning_paths_updated_at
    BEFORE UPDATE ON public.learning_paths
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();