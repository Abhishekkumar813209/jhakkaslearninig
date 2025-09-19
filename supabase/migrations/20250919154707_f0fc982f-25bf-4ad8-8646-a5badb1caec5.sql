-- First remove duplicates by keeping only one role per user (preferring admin role)
DELETE FROM public.user_roles 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM public.user_roles 
  ORDER BY user_id, 
    CASE 
      WHEN role = 'admin' THEN 1 
      WHEN role = 'instructor' THEN 2 
      ELSE 3 
    END
);

-- Now add the unique constraint
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Add admin role to current user for testing
INSERT INTO public.user_roles (user_id, role) 
VALUES ('4f3ef101-0bcb-4671-9fb0-07a6ec197b18', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';