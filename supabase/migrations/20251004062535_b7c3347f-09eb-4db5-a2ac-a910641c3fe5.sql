-- Add mode column to batch_roadmaps for sequential vs parallel scheduling
ALTER TABLE batch_roadmaps 
ADD COLUMN mode text DEFAULT 'parallel' 
CHECK (mode IN ('sequential', 'parallel'));

-- Update existing roadmaps to use parallel mode
UPDATE batch_roadmaps SET mode = 'parallel' WHERE mode IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN batch_roadmaps.mode IS 'Roadmap scheduling mode: sequential (one subject at a time) or parallel (all subjects together)';