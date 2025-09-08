-- First, drop the existing role check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Create a new constraint that allows 'user', 'admin', and 'superadmin'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'admin', 'superadmin'));

-- Now promote your user to superadmin (replace with your actual email)
UPDATE profiles 
SET role = 'superadmin' 
WHERE email = 'bekace.multimedia@gmail.com';

-- Verify the update
SELECT email, role FROM profiles WHERE email = 'bekace.multimedia@gmail.com';
