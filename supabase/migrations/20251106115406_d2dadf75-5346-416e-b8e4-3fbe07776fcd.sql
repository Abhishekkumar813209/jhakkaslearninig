-- Drop old check constraint and add expanded one with all existing values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'topic_learning_content'
      AND tc.constraint_type = 'CHECK'
      AND tc.constraint_name = 'topic_learning_content_game_type_check'
  ) THEN
    ALTER TABLE public.topic_learning_content
    DROP CONSTRAINT topic_learning_content_game_type_check;
  END IF;

  -- Add new constraint with all existing values + match_columns alias
  ALTER TABLE public.topic_learning_content
  ADD CONSTRAINT topic_learning_content_game_type_check
  CHECK (
    game_type IN (
      'match_pairs',
      'match_columns',
      'drag_drop',
      'typing_race',
      'word_puzzle',
      'fill_blanks',
      'sequence_order',
      'mcq',
      'true_false',
      'assertion_reason'
    )
  );
END $$;
