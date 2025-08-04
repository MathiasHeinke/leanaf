-- Add avatar columns to profiles table
ALTER TABLE profiles ADD COLUMN profile_avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN avatar_type TEXT DEFAULT 'preset';
ALTER TABLE profiles ADD COLUMN avatar_preset_id TEXT;