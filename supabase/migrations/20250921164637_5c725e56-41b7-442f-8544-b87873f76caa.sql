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

-- Create lectures table to store individual videos from playlists
CREATE TABLE public.lectures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  order_num INTEGER NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create video_progress table to track student's viewing progress
CREATE TABLE public.video_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  watch_time_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, lecture_id)
);

-- Enable RLS on all tables
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for lectures
CREATE POLICY "Students can view lectures in their playlists" 
ON public.lectures FOR SELECT 
USING (playlist_id IN (
  SELECT p.id FROM public.playlists p
  JOIN public.learning_paths lp ON p.learning_path_id = lp.id
  WHERE lp.student_id = auth.uid()
));

-- RLS Policies for video_progress
CREATE POLICY "Students can view their own video progress" 
ON public.video_progress FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can create their own video progress" 
ON public.video_progress FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own video progress" 
ON public.video_progress FOR UPDATE 
USING (student_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_learning_paths_student_id ON public.learning_paths(student_id);
CREATE INDEX idx_playlists_learning_path_id ON public.playlists(learning_path_id);
CREATE INDEX idx_lectures_playlist_id ON public.lectures(playlist_id);
CREATE INDEX idx_video_progress_student_lecture ON public.video_progress(student_id, lecture_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learning_paths_updated_at
    BEFORE UPDATE ON public.learning_paths
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();