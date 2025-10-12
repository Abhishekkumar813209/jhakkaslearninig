-- Fix existing parent roles
-- Update user_roles to 'parent' for users with @parent.app email domain
UPDATE user_roles ur
SET role = 'parent'
FROM profiles p
WHERE ur.user_id = p.id
  AND p.email LIKE '%@parent.app'
  AND ur.role <> 'admin';