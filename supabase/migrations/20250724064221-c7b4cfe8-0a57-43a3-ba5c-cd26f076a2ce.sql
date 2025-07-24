-- Fix RLS performance issues by optimizing auth.uid() calls
-- Replace direct auth.uid() calls with (select auth.uid()) for better performance

-- profiles table
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or Enterprise users can view all pro" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own profile or Enterprise users can view all pro" ON public.profiles
FOR SELECT USING (((select auth.uid()) = user_id) OR is_enterprise_or_super_admin());

-- meals table
DROP POLICY IF EXISTS "Users can create their own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can delete their own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can update their own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can view their own meals" ON public.meals;
DROP POLICY IF EXISTS "Super Admin can view all meals" ON public.meals;

CREATE POLICY "Users can create their own meals" ON public.meals
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own meals" ON public.meals
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own meals" ON public.meals
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own meals" ON public.meals
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super Admin can view all meals" ON public.meals
FOR SELECT USING (((select auth.uid()) = user_id) OR is_super_admin());

-- workouts table
DROP POLICY IF EXISTS "Users can create their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Super Admin can view all workouts" ON public.workouts;

CREATE POLICY "Users can create their own workouts" ON public.workouts
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own workouts" ON public.workouts
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own workouts" ON public.workouts
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own workouts" ON public.workouts
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super Admin can view all workouts" ON public.workouts
FOR SELECT USING (((select auth.uid()) = user_id) OR is_super_admin());

-- weight_history table
DROP POLICY IF EXISTS "Users can create their own weight entries" ON public.weight_history;
DROP POLICY IF EXISTS "Users can delete their own weight entries" ON public.weight_history;
DROP POLICY IF EXISTS "Users can update their own weight entries" ON public.weight_history;
DROP POLICY IF EXISTS "Users can view their own weight history" ON public.weight_history;
DROP POLICY IF EXISTS "Super Admin can view all weight history" ON public.weight_history;

CREATE POLICY "Users can create their own weight entries" ON public.weight_history
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own weight entries" ON public.weight_history
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own weight entries" ON public.weight_history
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own weight history" ON public.weight_history
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super Admin can view all weight history" ON public.weight_history
FOR SELECT USING (((select auth.uid()) = user_id) OR is_super_admin());

-- daily_goals table
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.daily_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.daily_goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON public.daily_goals;

CREATE POLICY "Users can insert their own goals" ON public.daily_goals
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own goals" ON public.daily_goals
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own goals" ON public.daily_goals
FOR SELECT USING ((select auth.uid()) = user_id);

-- sleep_tracking table
DROP POLICY IF EXISTS "Users can create their own sleep data" ON public.sleep_tracking;
DROP POLICY IF EXISTS "Users can delete their own sleep data" ON public.sleep_tracking;
DROP POLICY IF EXISTS "Users can update their own sleep data" ON public.sleep_tracking;
DROP POLICY IF EXISTS "Users can view their own sleep data" ON public.sleep_tracking;
DROP POLICY IF EXISTS "Super Admin can view all sleep data" ON public.sleep_tracking;

CREATE POLICY "Users can create their own sleep data" ON public.sleep_tracking
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own sleep data" ON public.sleep_tracking
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own sleep data" ON public.sleep_tracking
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own sleep data" ON public.sleep_tracking
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super Admin can view all sleep data" ON public.sleep_tracking
FOR SELECT USING (((select auth.uid()) = user_id) OR is_super_admin());

-- body_measurements table
DROP POLICY IF EXISTS "Users can create their own body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can delete their own body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can update their own body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can view their own body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Super Admin can view all body measurements" ON public.body_measurements;

CREATE POLICY "Users can create their own body measurements" ON public.body_measurements
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own body measurements" ON public.body_measurements
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own body measurements" ON public.body_measurements
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own body measurements" ON public.body_measurements
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super Admin can view all body measurements" ON public.body_measurements
FOR SELECT USING (((select auth.uid()) = user_id) OR is_super_admin());

-- Continue with other tables...

-- exercise_sessions table
DROP POLICY IF EXISTS "Users can create their own exercise sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can delete their own exercise sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can update their own exercise sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can view their own exercise sessions" ON public.exercise_sessions;

CREATE POLICY "Users can create their own exercise sessions" ON public.exercise_sessions
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own exercise sessions" ON public.exercise_sessions
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own exercise sessions" ON public.exercise_sessions
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own exercise sessions" ON public.exercise_sessions
FOR SELECT USING ((select auth.uid()) = user_id);

-- exercise_sets table
DROP POLICY IF EXISTS "Users can create their own exercise sets" ON public.exercise_sets;
DROP POLICY IF EXISTS "Users can delete their own exercise sets" ON public.exercise_sets;
DROP POLICY IF EXISTS "Users can update their own exercise sets" ON public.exercise_sets;
DROP POLICY IF EXISTS "Users can view their own exercise sets" ON public.exercise_sets;

CREATE POLICY "Users can create their own exercise sets" ON public.exercise_sets
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own exercise sets" ON public.exercise_sets
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own exercise sets" ON public.exercise_sets
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own exercise sets" ON public.exercise_sets
FOR SELECT USING ((select auth.uid()) = user_id);

-- ai_usage_limits table
DROP POLICY IF EXISTS "Users can insert their own AI usage limits" ON public.ai_usage_limits;
DROP POLICY IF EXISTS "Users can update their own AI usage limits" ON public.ai_usage_limits;
DROP POLICY IF EXISTS "Users can view their own AI usage limits" ON public.ai_usage_limits;

CREATE POLICY "Users can insert their own AI usage limits" ON public.ai_usage_limits
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own AI usage limits" ON public.ai_usage_limits
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own AI usage limits" ON public.ai_usage_limits
FOR SELECT USING ((select auth.uid()) = user_id);

-- user_points table
DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
DROP POLICY IF EXISTS "Super Admin can view all user points" ON public.user_points;

CREATE POLICY "Users can insert their own points" ON public.user_points
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own points" ON public.user_points
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own points" ON public.user_points
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super Admin can view all user points" ON public.user_points
FOR SELECT USING (((select auth.uid()) = user_id) OR is_super_admin());

-- user_trials table
DROP POLICY IF EXISTS "Users can create their own trials" ON public.user_trials;
DROP POLICY IF EXISTS "Users can update their own trials" ON public.user_trials;
DROP POLICY IF EXISTS "Users can view their own trials" ON public.user_trials;
DROP POLICY IF EXISTS "Super Admin can view all user trials" ON public.user_trials;

CREATE POLICY "Users can create their own trials" ON public.user_trials
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own trials" ON public.user_trials
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own trials" ON public.user_trials
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super Admin can view all user trials" ON public.user_trials
FOR SELECT USING (((select auth.uid()) = user_id) OR is_super_admin());

-- Continue with remaining tables that have similar patterns...

-- user_streaks table
DROP POLICY IF EXISTS "Users can insert their own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update their own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can view their own streaks" ON public.user_streaks;

CREATE POLICY "Users can insert their own streaks" ON public.user_streaks
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own streaks" ON public.user_streaks
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own streaks" ON public.user_streaks
FOR SELECT USING ((select auth.uid()) = user_id);

-- point_activities table
DROP POLICY IF EXISTS "Users can insert their own point activities" ON public.point_activities;
DROP POLICY IF EXISTS "Users can view their own point activities" ON public.point_activities;

CREATE POLICY "Users can insert their own point activities" ON public.point_activities
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own point activities" ON public.point_activities
FOR SELECT USING ((select auth.uid()) = user_id);

-- department_progress table
DROP POLICY IF EXISTS "Users can insert their own department progress" ON public.department_progress;
DROP POLICY IF EXISTS "Users can update their own department progress" ON public.department_progress;
DROP POLICY IF EXISTS "Users can view their own department progress" ON public.department_progress;

CREATE POLICY "Users can insert their own department progress" ON public.department_progress
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own department progress" ON public.department_progress
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own department progress" ON public.department_progress
FOR SELECT USING ((select auth.uid()) = user_id);

-- badges table
DROP POLICY IF EXISTS "Users can create their own badges" ON public.badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON public.badges;

CREATE POLICY "Users can create their own badges" ON public.badges
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own badges" ON public.badges
FOR SELECT USING ((select auth.uid()) = user_id);

-- meal_images table
DROP POLICY IF EXISTS "Users can create their own meal images" ON public.meal_images;
DROP POLICY IF EXISTS "Users can delete their own meal images" ON public.meal_images;
DROP POLICY IF EXISTS "Users can update their own meal images" ON public.meal_images;
DROP POLICY IF EXISTS "Users can view their own meal images" ON public.meal_images;

CREATE POLICY "Users can create their own meal images" ON public.meal_images
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own meal images" ON public.meal_images
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own meal images" ON public.meal_images
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own meal images" ON public.meal_images
FOR SELECT USING ((select auth.uid()) = user_id);

-- coach_conversations table
DROP POLICY IF EXISTS "Users can create their own coach conversations" ON public.coach_conversations;
DROP POLICY IF EXISTS "Users can delete their own coach conversations" ON public.coach_conversations;
DROP POLICY IF EXISTS "Users can update their own coach conversations" ON public.coach_conversations;
DROP POLICY IF EXISTS "Users can view their own coach conversations" ON public.coach_conversations;

CREATE POLICY "Users can create their own coach conversations" ON public.coach_conversations
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own coach conversations" ON public.coach_conversations
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own coach conversations" ON public.coach_conversations
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own coach conversations" ON public.coach_conversations
FOR SELECT USING ((select auth.uid()) = user_id);

-- coach_recommendations table
DROP POLICY IF EXISTS "Users can create their own coach recommendations" ON public.coach_recommendations;
DROP POLICY IF EXISTS "Users can update their own coach recommendations" ON public.coach_recommendations;
DROP POLICY IF EXISTS "Users can view their own coach recommendations" ON public.coach_recommendations;

CREATE POLICY "Users can create their own coach recommendations" ON public.coach_recommendations
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own coach recommendations" ON public.coach_recommendations
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own coach recommendations" ON public.coach_recommendations
FOR SELECT USING ((select auth.uid()) = user_id);

-- exercise_templates table
DROP POLICY IF EXISTS "Users can create their own exercise templates" ON public.exercise_templates;
DROP POLICY IF EXISTS "Users can delete their own exercise templates" ON public.exercise_templates;
DROP POLICY IF EXISTS "Users can update their own exercise templates" ON public.exercise_templates;
DROP POLICY IF EXISTS "Users can view their own templates and public ones" ON public.exercise_templates;

CREATE POLICY "Users can create their own exercise templates" ON public.exercise_templates
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own exercise templates" ON public.exercise_templates
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own exercise templates" ON public.exercise_templates
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own templates and public ones" ON public.exercise_templates
FOR SELECT USING (((select auth.uid()) = user_id) OR (is_public = true));

-- exercises table
DROP POLICY IF EXISTS "Users can create their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can view public exercises and own exercises" ON public.exercises;

CREATE POLICY "Users can create their own exercises" ON public.exercises
FOR INSERT WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete their own exercises" ON public.exercises
FOR DELETE USING (created_by = (select auth.uid()));

CREATE POLICY "Users can update their own exercises" ON public.exercises
FOR UPDATE USING (created_by = (select auth.uid()));

CREATE POLICY "Anyone can view public exercises and own exercises" ON public.exercises
FOR SELECT USING ((is_public = true) OR (created_by = (select auth.uid())));

-- saved_items table
DROP POLICY IF EXISTS "Users can create their own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can delete their own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can update their own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can view their own saved items" ON public.saved_items;

CREATE POLICY "Users can create their own saved items" ON public.saved_items
FOR INSERT WITH CHECK (((select auth.uid()))::text = (user_id)::text);

CREATE POLICY "Users can delete their own saved items" ON public.saved_items
FOR DELETE USING (((select auth.uid()))::text = (user_id)::text);

CREATE POLICY "Users can update their own saved items" ON public.saved_items
FOR UPDATE USING (((select auth.uid()))::text = (user_id)::text);

CREATE POLICY "Users can view their own saved items" ON public.saved_items
FOR SELECT USING (((select auth.uid()))::text = (user_id)::text);

-- subscribers table
DROP POLICY IF EXISTS "select_subscription_safe_no_recursion" ON public.subscribers;
DROP POLICY IF EXISTS "update_subscription_safe_no_recursion" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription_no_recursion" ON public.subscribers;

CREATE POLICY "select_subscription_safe_no_recursion" ON public.subscribers
FOR SELECT USING ((user_id = (select auth.uid())) OR (email = (select auth.email())));

CREATE POLICY "update_subscription_safe_no_recursion" ON public.subscribers
FOR UPDATE USING ((user_id = (select auth.uid())) OR (email = (select auth.email())));

CREATE POLICY "insert_subscription_no_recursion" ON public.subscribers
FOR INSERT WITH CHECK ((user_id = (select auth.uid())) OR (email = (select auth.email())) OR is_super_admin_by_email());

-- admin_logs table  
DROP POLICY IF EXISTS "Authenticated users can insert admin logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Authenticated users can view admin logs" ON public.admin_logs;

CREATE POLICY "Authenticated users can insert admin logs" ON public.admin_logs
FOR INSERT WITH CHECK ((select auth.uid()) = admin_user_id);

CREATE POLICY "Authenticated users can view admin logs" ON public.admin_logs
FOR SELECT USING ((select auth.uid()) IS NOT NULL);