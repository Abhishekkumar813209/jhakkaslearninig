-- Add correct_answer column to generated_questions table
ALTER TABLE public.generated_questions
ADD COLUMN IF NOT EXISTS correct_answer JSONB;

-- Add comment to explain format
COMMENT ON COLUMN public.generated_questions.correct_answer IS 
'Stores correct answer in appropriate format:
- MCQ: {"index": 2}
- True/False: {"value": true}
- Fill Blank: {"text": "atmosphere", "answers": ["atmosphere", "air"]}
- Match Column: {"pairs": [{"left": 0, "right": 2}, {"left": 1, "right": 0}]}
- Assertion-Reason: {"index": 0}';