-- Add XP breakdown columns to student_gamification table
ALTER TABLE student_gamification 
ADD COLUMN IF NOT EXISTS game_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS theory_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS exercise_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quest_xp INTEGER DEFAULT 0;

COMMENT ON COLUMN student_gamification.game_xp IS 'XP earned from gamified exercises';
COMMENT ON COLUMN student_gamification.theory_xp IS 'XP earned from theory reading (30/40/50 per topic)';
COMMENT ON COLUMN student_gamification.exercise_xp IS 'XP earned from practice exercises';
COMMENT ON COLUMN student_gamification.quest_xp IS 'XP earned from daily quests';