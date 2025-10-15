-- Drop existing constraint that doesn't allow 'mcq' game type
ALTER TABLE topic_learning_content 
DROP CONSTRAINT IF EXISTS topic_learning_content_game_type_check;

-- Add new constraint with MCQ and other question types
ALTER TABLE topic_learning_content 
ADD CONSTRAINT topic_learning_content_game_type_check 
CHECK (
  game_type IS NULL OR 
  game_type = ANY (ARRAY[
    'mcq'::text,
    'true_false'::text,
    'assertion_reason'::text,
    'match_pairs'::text, 
    'drag_drop'::text, 
    'typing_race'::text, 
    'word_puzzle'::text, 
    'fill_blanks'::text, 
    'sequence_order'::text,
    'subjective'::text
  ])
);