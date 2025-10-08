-- Delete school domain batches with NULL target_board or target_class
DELETE FROM batches 
WHERE exam_type = 'school' 
AND (target_board IS NULL OR target_class IS NULL);