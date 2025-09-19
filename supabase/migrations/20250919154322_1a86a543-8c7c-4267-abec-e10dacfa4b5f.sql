-- Check if user has admin role, if not assign it for testing
-- First, let's see what user roles exist
-- Add admin role to current user for testing
INSERT INTO public.user_roles (user_id, role) 
VALUES ('4f3ef101-0bcb-4671-9fb0-07a6ec197b18', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Also add instructor role as fallback
INSERT INTO public.user_roles (user_id, role) 
VALUES ('4f3ef101-0bcb-4671-9fb0-07a6ec197b18', 'instructor')
ON CONFLICT (user_id) DO NOTHING;