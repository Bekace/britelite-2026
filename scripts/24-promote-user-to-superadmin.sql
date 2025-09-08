-- Promote a user to superadmin role
-- Replace 'your-email@example.com' with your actual email address

UPDATE profiles 
SET role = 'superadmin' 
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'your-email@example.com';
