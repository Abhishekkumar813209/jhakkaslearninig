-- Enable realtime updates for gamified_exercises table
ALTER TABLE public.gamified_exercises REPLICA IDENTITY FULL;

-- Add gamified_exercises to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.gamified_exercises;