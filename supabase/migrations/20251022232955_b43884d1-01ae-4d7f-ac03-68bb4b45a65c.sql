-- Fix security warning for strip_html_tags function
-- Add search_path to prevent function search path mutable warning

ALTER FUNCTION strip_html_tags(text) SET search_path = 'public';

COMMENT ON FUNCTION strip_html_tags IS 'Helper function to strip HTML tags from text. Used in question_bank data normalization. Security: search_path set to public.';