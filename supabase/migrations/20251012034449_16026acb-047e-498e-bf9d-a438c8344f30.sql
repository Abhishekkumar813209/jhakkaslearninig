-- Add phone_number column to profiles table for easy access
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create index for faster phone number searches
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);

-- Update existing parent profiles to extract phone from email
UPDATE profiles
SET phone_number = REPLACE(email, '@parent.app', '')
WHERE email LIKE '%@parent.app';