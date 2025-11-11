-- Update existing data to use singular forms
UPDATE topic_learning_content 
SET game_type = 'match_pair' 
WHERE game_type = 'match_pairs';

UPDATE gamified_exercises 
SET exercise_type = 'match_pair'::exercise_type 
WHERE exercise_type::text = 'match_pairs';