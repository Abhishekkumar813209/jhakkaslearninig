-- Phase 5: Add theory tracking columns to student_roadmap_progress table
ALTER TABLE public.student_roadmap_progress
ADD COLUMN IF NOT EXISTS theory_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS theory_xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS theory_completed_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_student_progress_theory 
ON public.student_roadmap_progress(student_id, theory_completed);

-- Add comment for documentation
COMMENT ON COLUMN public.student_roadmap_progress.theory_completed IS 'Whether student has completed reading 80% of theory content';
COMMENT ON COLUMN public.student_roadmap_progress.theory_xp_earned IS 'XP earned from reading theory (20 XP)';
COMMENT ON COLUMN public.student_roadmap_progress.theory_completed_at IS 'Timestamp when theory was marked complete';