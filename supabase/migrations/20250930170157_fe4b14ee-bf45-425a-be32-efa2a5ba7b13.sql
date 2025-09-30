
-- Backfill student_analytics with existing test attempts
INSERT INTO student_analytics (student_id, tests_attempted, average_score, last_active_date)
SELECT 
  ta.student_id,
  COUNT(*) as tests_attempted,
  AVG(ta.percentage) as average_score,
  MAX(DATE(ta.submitted_at)) as last_active_date
FROM test_attempts ta
WHERE ta.status IN ('submitted', 'auto_submitted')
GROUP BY ta.student_id
ON CONFLICT (student_id) DO UPDATE SET
  tests_attempted = EXCLUDED.tests_attempted,
  average_score = EXCLUDED.average_score,
  last_active_date = EXCLUDED.last_active_date,
  updated_at = NOW();

-- Now calculate all rankings
SELECT calculate_zone_rankings();
