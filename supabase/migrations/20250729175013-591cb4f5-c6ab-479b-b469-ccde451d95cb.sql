-- Delete user account mathias.heinke@ekd-solar.de completely
-- Delete from all related tables first to avoid foreign key constraints

DELETE FROM department_progress WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM user_points WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM profiles WHERE id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM meals WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM workouts WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM weight_history WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM coach_conversations WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM subscribers WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM point_activities WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM badges WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM ai_usage_limits WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM exercise_sessions WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM exercise_sets WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM coach_memory WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM daily_goals WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM body_measurements WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM user_streaks WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM coach_recommendations WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM coach_ratings WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM feature_requests WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM feature_votes WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM bug_reports WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM user_tracking_preferences WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM user_trials WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';
DELETE FROM exercise_templates WHERE user_id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';

-- Finally delete the user from auth.users
DELETE FROM auth.users WHERE id = '88698ff3-92c0-4c96-b6c9-00c2c11cf85f';