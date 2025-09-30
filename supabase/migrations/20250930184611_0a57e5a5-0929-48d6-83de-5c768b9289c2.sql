-- Fix ambiguous column reference in test_leaderboards view
DROP VIEW IF EXISTS test_leaderboards;

CREATE VIEW test_leaderboards AS
SELECT 
  ta.id,
  ta.test_id,
  ta.student_id,
  p.full_name as student_name,
  p.student_class,
  p.batch_id,
  ta.score,
  ta.percentage,
  ta.total_marks,
  ta.time_taken_minutes,
  ta.submitted_at,
  t.title as test_title,
  t.subject,
  ROW_NUMBER() OVER (
    PARTITION BY ta.test_id 
    ORDER BY ta.score DESC, ta.time_taken_minutes ASC
  ) as score_rank,
  ROW_NUMBER() OVER (
    PARTITION BY ta.test_id 
    ORDER BY ta.time_taken_minutes ASC
  ) as speed_rank,
  ROW_NUMBER() OVER (
    PARTITION BY ta.test_id 
    ORDER BY (ta.score::float / ta.total_marks * 100) DESC
  ) as accuracy_rank
FROM test_attempts ta
JOIN profiles p ON ta.student_id = p.id
JOIN tests t ON ta.test_id = t.id
WHERE ta.status IN ('submitted', 'auto_submitted')
  AND ta.percentage >= 60;