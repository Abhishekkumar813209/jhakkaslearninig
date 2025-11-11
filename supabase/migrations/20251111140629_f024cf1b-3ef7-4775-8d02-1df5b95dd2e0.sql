-- Standardize question_bank to singular game types + add missing types

-- Step 1: Drop old constraint
ALTER TABLE public.question_bank 
DROP CONSTRAINT IF EXISTS question_bank_question_type_check;

-- Step 2: Migrate plural to singular
UPDATE public.question_bank
SET question_type = 'match_pair'
WHERE question_type = 'match_pairs';

-- Step 3: Add comprehensive constraint including ALL existing types
ALTER TABLE public.question_bank
ADD CONSTRAINT question_bank_question_type_check
CHECK (question_type IN (
  'mcq', 
  'true_false', 
  'match_column', 
  'match_pair',         -- SINGULAR (was match_pairs)
  'drag_drop', 
  'sequence_order', 
  'word_puzzle', 
  'fill_blank',         -- SINGULAR (was fill_blanks)
  'typing_race',
  'assertion_reason',
  'short_answer'        -- MISSING TYPE (204 rows!)
));

-- Step 4: Guard trigger for auto-normalization
CREATE OR REPLACE FUNCTION public.normalize_question_bank_type()
RETURNS trigger AS $$
BEGIN
  IF NEW.question_type = 'match_pairs' THEN
    NEW.question_type := 'match_pair';
  ELSIF NEW.question_type = 'match_columns' THEN
    NEW.question_type := 'match_column';
  ELSIF NEW.question_type = 'fill_blanks' THEN
    NEW.question_type := 'fill_blank';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_normalize_question_bank_type ON public.question_bank;

CREATE TRIGGER trg_normalize_question_bank_type
BEFORE INSERT OR UPDATE ON public.question_bank
FOR EACH ROW
EXECUTE FUNCTION public.normalize_question_bank_type();