-- Backfill match_pair questions: mirror pairs from answer_data to question_data
-- This ensures Question Bank cards and previews can read pairs from question_data

UPDATE public.question_bank
SET question_data = jsonb_set(
  COALESCE(question_data, '{}'::jsonb),
  '{pairs}',
  (answer_data->'pairs'),
  true
)
WHERE question_type IN ('match_pair', 'match_pairs')
  AND (question_data->'pairs' IS NULL OR jsonb_typeof(question_data->'pairs') = 'null')
  AND answer_data->'pairs' IS NOT NULL
  AND jsonb_typeof(answer_data->'pairs') = 'array';

-- Log the backfill count
DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE '✅ Backfilled % match_pair questions with pairs data in question_data', affected_rows;
END $$;