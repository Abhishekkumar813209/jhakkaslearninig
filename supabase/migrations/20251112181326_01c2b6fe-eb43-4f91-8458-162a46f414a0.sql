-- Change XP columns from INTEGER to NUMERIC(10,2) for decimal precision
ALTER TABLE student_gamification 
  ALTER COLUMN game_xp TYPE NUMERIC(10,2) USING game_xp::NUMERIC(10,2),
  ALTER COLUMN theory_xp TYPE NUMERIC(10,2) USING theory_xp::NUMERIC(10,2),
  ALTER COLUMN exercise_xp TYPE NUMERIC(10,2) USING exercise_xp::NUMERIC(10,2),
  ALTER COLUMN daily_attendance_xp TYPE NUMERIC(10,2) USING daily_attendance_xp::NUMERIC(10,2),
  ALTER COLUMN social_share_xp TYPE NUMERIC(10,2) USING social_share_xp::NUMERIC(10,2),
  ALTER COLUMN referral_xp TYPE NUMERIC(10,2) USING referral_xp::NUMERIC(10,2),
  ALTER COLUMN quest_xp TYPE NUMERIC(10,2) USING quest_xp::NUMERIC(10,2);

-- Update default values to NUMERIC
ALTER TABLE student_gamification 
  ALTER COLUMN game_xp SET DEFAULT 0.0,
  ALTER COLUMN theory_xp SET DEFAULT 0.0,
  ALTER COLUMN exercise_xp SET DEFAULT 0.0,
  ALTER COLUMN daily_attendance_xp SET DEFAULT 0.0,
  ALTER COLUMN social_share_xp SET DEFAULT 0.0,
  ALTER COLUMN referral_xp SET DEFAULT 0.0,
  ALTER COLUMN quest_xp SET DEFAULT 0.0;