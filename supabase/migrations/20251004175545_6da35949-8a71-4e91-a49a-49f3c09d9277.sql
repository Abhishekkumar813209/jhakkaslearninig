-- Drop existing policies that conflict
DROP POLICY IF EXISTS "Students can view their own league" ON public.student_leagues;
DROP POLICY IF EXISTS "Students can view same league participants" ON public.student_leagues;
DROP POLICY IF EXISTS "System can manage student leagues" ON public.student_leagues;

-- Create leagues table (if not exists)
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier INTEGER NOT NULL,
  min_xp INTEGER NOT NULL,
  max_xp INTEGER,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student leagues tracking (if not exists)
CREATE TABLE IF NOT EXISTS public.student_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID REFERENCES public.leagues(id),
  week_start DATE NOT NULL,
  week_xp INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, week_start)
);

-- Create daily quests table (if not exists)
CREATE TABLE IF NOT EXISTS public.daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  coin_reward INTEGER NOT NULL,
  icon TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student quest progress (if not exists)
CREATE TABLE IF NOT EXISTS public.student_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.daily_quests(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, quest_id, date)
);

-- Enable RLS
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quest_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view leagues" ON public.leagues FOR SELECT USING (true);

CREATE POLICY "Students view own league" ON public.student_leagues FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "System manage leagues" ON public.student_leagues FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "View active quests" ON public.daily_quests FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage quests" ON public.daily_quests FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "View own quest progress" ON public.student_quest_progress FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Insert own quest progress" ON public.student_quest_progress FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Update own quest progress" ON public.student_quest_progress FOR UPDATE USING (student_id = auth.uid());