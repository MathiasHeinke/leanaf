-- Coach-Zugriff auf alle User-Daten: Policies für vollständigen Read-Access

-- Coaches können alle Profile einsehen (für ganzheitliche Beratung)
CREATE POLICY "Coaches can view all profiles for coaching" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = profiles.user_id
  )
  OR 
  -- System-Level Coach Access für Edge Functions
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Mahlzeiten einsehen (für Ernährungsberatung)
CREATE POLICY "Coaches can view all meals for nutrition coaching" ON public.meals
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = meals.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Körpermessungen einsehen (für Fortschrittsanalyse)
CREATE POLICY "Coaches can view all body measurements for progress analysis" ON public.body_measurements
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = body_measurements.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle täglichen Ziele einsehen (für Zielabstimmung)
CREATE POLICY "Coaches can view all daily goals for coaching" ON public.daily_goals
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = daily_goals.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Workouts einsehen (für Trainingsplanung)
CREATE POLICY "Coaches can view all workouts for training coaching" ON public.workouts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = workouts.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Exercise Sessions einsehen (für Trainingsanalyse)
CREATE POLICY "Coaches can view all exercise sessions for training analysis" ON public.exercise_sessions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = exercise_sessions.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Exercise Sets einsehen (für detaillierte Trainingsanalyse)
CREATE POLICY "Coaches can view all exercise sets for detailed analysis" ON public.exercise_sets
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = exercise_sets.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Point Activities einsehen (für Motivationsanalyse)
CREATE POLICY "Coaches can view all point activities for motivation coaching" ON public.point_activities
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = point_activities.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle User Points einsehen (für Gamification-Beratung)
CREATE POLICY "Coaches can view all user points for gamification coaching" ON public.user_points
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = user_points.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Department Progress einsehen (für Bereichs-spezifische Beratung)
CREATE POLICY "Coaches can view all department progress for specialized coaching" ON public.department_progress
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = department_progress.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle Badges einsehen (für Achievement-Tracking)
CREATE POLICY "Coaches can view all badges for achievement coaching" ON public.badges
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = badges.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle User Streaks einsehen (für Consistency-Coaching)
CREATE POLICY "Coaches can view all user streaks for consistency coaching" ON public.user_streaks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = user_streaks.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle User Trials einsehen (für Trial-Management)
CREATE POLICY "Coaches can view all user trials for trial coaching" ON public.user_trials
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = user_trials.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Coaches können alle User Food Corrections einsehen (für Ernährungs-Feedback)
CREATE POLICY "Coaches can view all user food corrections for nutrition coaching" ON public.user_food_corrections
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = user_food_corrections.user_id
  )
  OR 
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);