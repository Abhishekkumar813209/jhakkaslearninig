-- Create a function to execute raw SQL queries (SELECT only, for admin AI assistant)
-- This is used by the admin-ai-assistant edge function to query database structure and data

CREATE OR REPLACE FUNCTION public.exec_raw_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Security check: only allow SELECT statements
  IF NOT (sql_query ~* '^\s*SELECT') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Execute the query and return as JSONB
  EXECUTE format('SELECT jsonb_agg(row_to_json(t.*)) FROM (%s) t', sql_query) INTO result;
  
  -- Return empty array if no results
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    -- Return error as JSON
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;