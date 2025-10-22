-- Fix security warning: Add search_path to strip_html_tags function
CREATE OR REPLACE FUNCTION strip_html_tags(text_with_html text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
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
$$;