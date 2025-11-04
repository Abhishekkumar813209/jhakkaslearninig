-- Add left_column and right_column arrays to question_bank table
-- These columns store the items for match_column question types

ALTER TABLE public.question_bank
ADD COLUMN IF NOT EXISTS left_column text[],
ADD COLUMN IF NOT EXISTS right_column text[];