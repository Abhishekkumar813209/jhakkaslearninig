-- =====================================================
-- Migration: Normalize Question Bank Data
-- Purpose: 
--   1. Convert complex correct_answer objects to simple numbers (MCQ)
--   2. Strip HTML tags from question_text and options
-- =====================================================

-- Step 1: Create helper function to strip HTML tags in SQL
CREATE OR REPLACE FUNCTION strip_html_tags(text_with_html text)
RETURNS text AS $$
BEGIN
  IF text_with_html IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(text_with_html, '<[^>]+>', '', 'g'),
          '&nbsp;', ' ', 'g'
        ),
        '&amp;', '&', 'g'
      ),
      '&lt;', '<', 'g'
    ),
    '&gt;', '>', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Normalize correct_answer for MCQ questions (convert objects to plain numbers)
-- Note: correct_answer is TEXT type, needs casting to JSONB
UPDATE question_bank
SET correct_answer = CASE
  -- If it's already a number, keep it
  WHEN jsonb_typeof(correct_answer::jsonb) = 'number' THEN correct_answer
  -- If it's an object with "value" field, extract the value
  WHEN correct_answer::jsonb ? 'value' THEN (correct_answer::jsonb->>'value')
  -- If it's an object with "index" field, extract the index
  WHEN correct_answer::jsonb ? 'index' THEN (correct_answer::jsonb->>'index')
  -- Otherwise keep as is
  ELSE correct_answer
END
WHERE question_type = 'mcq'
  AND correct_answer IS NOT NULL
  AND correct_answer != 'null'
  AND correct_answer != ''
  AND jsonb_typeof(correct_answer::jsonb) = 'object';

-- Step 3: Clean HTML from question_text
UPDATE question_bank
SET question_text = strip_html_tags(question_text)
WHERE question_text LIKE '%<%';

-- Step 4: Clean HTML from options JSONB array
UPDATE question_bank
SET options = (
  SELECT jsonb_agg(strip_html_tags(elem::text))
  FROM jsonb_array_elements_text(options) AS elem
)
WHERE options IS NOT NULL
  AND options::text LIKE '%<%';

-- Step 5: Add comment for audit trail
COMMENT ON FUNCTION strip_html_tags IS 'Helper function to strip HTML tags from text. Used in question_bank data normalization.';

-- Step 6: Log migration completion
DO $$
DECLARE
  mcq_normalized_count INTEGER;
  html_cleaned_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM question_bank;
  
  -- Count MCQ questions that now have simple numeric answers
  SELECT COUNT(*) INTO mcq_normalized_count
  FROM question_bank
  WHERE question_type = 'mcq' 
    AND correct_answer IS NOT NULL
    AND correct_answer ~ '^[0-9]+$';  -- Only digits (simple number as text)
  
  SELECT COUNT(*) INTO html_cleaned_count
  FROM question_bank
  WHERE question_text NOT LIKE '%<%';
  
  RAISE NOTICE 'Migration completed on % questions:', total_count;
  RAISE NOTICE '  - MCQ questions with normalized answers (plain numbers): %', mcq_normalized_count;
  RAISE NOTICE '  - Questions with clean text (no HTML): %', html_cleaned_count;
END $$;