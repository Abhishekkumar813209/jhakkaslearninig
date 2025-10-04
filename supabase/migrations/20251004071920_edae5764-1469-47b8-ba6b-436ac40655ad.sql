-- Make timeline columns nullable for manual time allocation
ALTER TABLE batch_roadmaps 
ALTER COLUMN total_days DROP NOT NULL;

ALTER TABLE roadmap_chapters 
ALTER COLUMN day_start DROP NOT NULL,
ALTER COLUMN day_end DROP NOT NULL,
ALTER COLUMN estimated_days DROP NOT NULL;