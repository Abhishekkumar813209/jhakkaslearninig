-- Migration to normalize exam types data
-- Update existing batches.exam_type to match exam_types.code

UPDATE batches SET exam_type = 'school' WHERE exam_type = 'School Education';
UPDATE batches SET exam_type = 'engineering' WHERE exam_type = 'Engineering Entrance';
UPDATE batches SET exam_type = 'medical-ug' WHERE exam_type = 'Medical Entrance' AND exam_name ILIKE '%UG%';
UPDATE batches SET exam_type = 'medical-pg' WHERE exam_type = 'Medical Entrance' AND exam_name ILIKE '%PG%';
UPDATE batches SET exam_type = 'ssc' WHERE exam_type = 'SSC Exams';
UPDATE batches SET exam_type = 'banking' WHERE exam_type = 'Banking Exams';
UPDATE batches SET exam_type = 'upsc' WHERE exam_type = 'UPSC Exams';
UPDATE batches SET exam_type = 'railway' WHERE exam_type = 'Railway Exams';
UPDATE batches SET exam_type = 'defence' WHERE exam_type = 'Defence Exams';
UPDATE batches SET exam_type = 'custom' WHERE exam_type = 'Custom Exam';