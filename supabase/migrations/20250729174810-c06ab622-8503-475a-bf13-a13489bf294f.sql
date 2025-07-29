-- Delete user account mathias@mathiasheinke.de and all related data
-- First delete from user_points to avoid foreign key constraint
DELETE FROM user_points WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';

-- Delete from other related tables that might reference this user
DELETE FROM profiles WHERE id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM meals WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM workouts WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM weight_history WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM coach_conversations WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM subscribers WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM point_activities WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM badges WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM ai_usage_limits WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM exercise_sessions WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM exercise_sets WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';

-- Finally delete the user from auth.users
DELETE FROM auth.users WHERE id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';