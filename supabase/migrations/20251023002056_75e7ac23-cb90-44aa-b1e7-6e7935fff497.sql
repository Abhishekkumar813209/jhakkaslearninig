-- Make exercise_data optional/nullable since we use direct columns now
ALTER TABLE gamified_exercises 
ALTER COLUMN exercise_data DROP NOT NULL,
ALTER COLUMN exercise_data SET DEFAULT '{}'::jsonb;