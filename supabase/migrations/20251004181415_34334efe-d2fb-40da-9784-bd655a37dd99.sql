-- Step 1: Populate leagues table with 5 tiers
INSERT INTO leagues (name, tier, min_xp, max_xp, color, icon) VALUES
  ('Bronze League', 1, 0, 999, 'text-orange-700', 'Shield'),
  ('Silver League', 2, 1000, 2999, 'text-gray-400', 'Award'),
  ('Gold League', 3, 3000, 5999, 'text-yellow-500', 'Crown'),
  ('Platinum League', 4, 6000, 9999, 'text-cyan-400', 'Gem'),
  ('Diamond League', 5, 10000, NULL, 'text-purple-500', 'Sparkles')
ON CONFLICT DO NOTHING;

-- Step 2: Populate daily_quests table with 6 default quests
INSERT INTO daily_quests (title, description, quest_type, target_value, xp_reward, coin_reward, icon) VALUES
  ('Complete a Lesson', 'Complete any lesson or topic today', 'lesson_complete', 1, 50, 10, 'BookOpen'),
  ('Take a Practice Test', 'Attempt any practice test', 'test_attempt', 1, 100, 20, 'FileText'),
  ('Daily Study Streak', 'Maintain your study streak', 'daily_login', 1, 30, 5, 'Flame'),
  ('Help Other Students', 'Answer questions or participate in discussions', 'help_others', 3, 75, 15, 'Users'),
  ('Complete a Chapter', 'Finish all topics in a chapter', 'chapter_complete', 1, 150, 30, 'CheckCircle'),
  ('Perfect Score', 'Score 100% on any test', 'perfect_score', 1, 200, 50, 'Trophy')
ON CONFLICT DO NOTHING;