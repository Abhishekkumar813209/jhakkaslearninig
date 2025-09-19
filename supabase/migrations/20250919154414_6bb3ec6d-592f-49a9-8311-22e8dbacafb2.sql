-- Add unique constraint on user_id first
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Now add admin role to current user for testing
INSERT INTO public.user_roles (user_id, role) 
VALUES ('4f3ef101-0bcb-4671-9fb0-07a6ec197b18', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';