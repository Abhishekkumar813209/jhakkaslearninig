-- Phase 1: Add wellness mode columns to existing tables
ALTER TABLE batch_roadmaps ADD COLUMN IF NOT EXISTS is_wellness_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE roadmap_chapters ADD COLUMN IF NOT EXISTS is_wellness_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE roadmap_topics ADD COLUMN IF NOT EXISTS is_wellness_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE gamified_exercises ADD COLUMN IF NOT EXISTS is_wellness_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS is_wellness_checkin BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS wellness_metadata JSONB DEFAULT '{}'::jsonb;

-- Add wellness XP columns to student_gamification
ALTER TABLE student_gamification ADD COLUMN IF NOT EXISTS wellness_xp INTEGER DEFAULT 0;
ALTER TABLE student_gamification ADD COLUMN IF NOT EXISTS wellness_streak_days INTEGER DEFAULT 0;
ALTER TABLE student_gamification ADD COLUMN IF NOT EXISTS wellness_longest_streak INTEGER DEFAULT 0;

-- Create wellness accountability partners table (multiplayer)
CREATE TABLE IF NOT EXISTS wellness_accountability_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  invite_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'ended')),
  roadmap_id UUID REFERENCES batch_roadmaps(id) ON DELETE CASCADE,
  can_see_details BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(student_id, partner_id, roadmap_id)
);

-- Create wellness support messages table
CREATE TABLE IF NOT EXISTS wellness_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_student_id UUID NOT NULL,
  to_student_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'encouragement' CHECK (message_type IN ('encouragement', 'sos', 'milestone_congrats')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Create wellness admin access table (only specific admin can manage)
CREATE TABLE IF NOT EXISTS wellness_admin_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT UNIQUE NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID
);

-- Grant access to specific admin email
INSERT INTO wellness_admin_access (admin_email, granted_by)
VALUES ('abhishek.kumar.chy21@itbhu.ac.in', auth.uid())
ON CONFLICT (admin_email) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE wellness_accountability_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_admin_access ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check wellness admin access
CREATE OR REPLACE FUNCTION public.is_wellness_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN wellness_admin_access waa ON p.email = waa.admin_email
    WHERE p.id = _user_id
      AND has_role(_user_id, 'admin'::user_role)
  );
$$;

-- RLS Policies for wellness roadmaps (admin management + student access)
DROP POLICY IF EXISTS "Wellness roadmaps admin management" ON batch_roadmaps;
CREATE POLICY "Wellness roadmaps admin management"
ON batch_roadmaps FOR ALL
USING (
  CASE 
    WHEN is_wellness_mode = TRUE 
    THEN is_wellness_admin(auth.uid()) OR batch_id IN (SELECT batch_id FROM profiles WHERE id = auth.uid())
    ELSE has_role(auth.uid(), 'admin'::user_role)
  END
);

-- RLS Policies for wellness chapters
DROP POLICY IF EXISTS "Wellness chapters cascade" ON roadmap_chapters;
CREATE POLICY "Wellness chapters cascade"
ON roadmap_chapters FOR ALL
USING (
  roadmap_id IN (
    SELECT id FROM batch_roadmaps 
    WHERE (is_wellness_mode = FALSE AND has_role(auth.uid(), 'admin'::user_role))
       OR (is_wellness_mode = TRUE AND (is_wellness_admin(auth.uid()) OR batch_id IN (SELECT batch_id FROM profiles WHERE id = auth.uid())))
  )
);

-- RLS Policies for wellness topics
DROP POLICY IF EXISTS "Wellness topics cascade" ON roadmap_topics;
CREATE POLICY "Wellness topics cascade"
ON roadmap_topics FOR ALL
USING (
  chapter_id IN (
    SELECT rc.id FROM roadmap_chapters rc
    JOIN batch_roadmaps br ON rc.roadmap_id = br.id
    WHERE (br.is_wellness_mode = FALSE AND has_role(auth.uid(), 'admin'::user_role))
       OR (br.is_wellness_mode = TRUE AND (is_wellness_admin(auth.uid()) OR br.batch_id IN (SELECT batch_id FROM profiles WHERE id = auth.uid())))
  )
);

-- RLS Policies for wellness exercises
DROP POLICY IF EXISTS "Wellness exercises cascade" ON gamified_exercises;
CREATE POLICY "Wellness exercises cascade"
ON gamified_exercises FOR ALL
USING (
  topic_content_id IN (
    SELECT tcm.id FROM topic_content_mapping tcm
    JOIN roadmap_topics rt ON tcm.topic_id = rt.id
    JOIN roadmap_chapters rc ON rt.chapter_id = rc.id
    JOIN batch_roadmaps br ON rc.roadmap_id = br.id
    WHERE (br.is_wellness_mode = FALSE)
       OR (br.is_wellness_mode = TRUE AND (is_wellness_admin(auth.uid()) OR br.batch_id IN (SELECT batch_id FROM profiles WHERE id = auth.uid())))
  )
);

-- RLS for accountability partners
CREATE POLICY "Students manage their own partnerships"
ON wellness_accountability_partners FOR ALL
USING (student_id = auth.uid() OR partner_id = auth.uid());

CREATE POLICY "Wellness admin can view all partnerships"
ON wellness_accountability_partners FOR SELECT
USING (is_wellness_admin(auth.uid()));

-- RLS for support messages
CREATE POLICY "Students can view their own messages"
ON wellness_support_messages FOR SELECT
USING (from_student_id = auth.uid() OR to_student_id = auth.uid());

CREATE POLICY "Students can send messages to partners"
ON wellness_support_messages FOR INSERT
WITH CHECK (
  from_student_id = auth.uid() 
  AND to_student_id IN (
    SELECT partner_id FROM wellness_accountability_partners 
    WHERE student_id = auth.uid() AND status = 'active'
    UNION
    SELECT student_id FROM wellness_accountability_partners 
    WHERE partner_id = auth.uid() AND status = 'active'
  )
);

-- RLS for wellness admin access
CREATE POLICY "Only specific admins can view wellness admin access"
ON wellness_admin_access FOR SELECT
USING (is_wellness_admin(auth.uid()));