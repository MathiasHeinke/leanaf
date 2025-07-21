
-- Create points system tables
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  level_name TEXT NOT NULL DEFAULT 'Rookie',
  points_to_next_level INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create point activities tracking
CREATE TABLE public.point_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  activity_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create department-specific progress
CREATE TABLE public.department_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  department TEXT NOT NULL, -- 'training', 'nutrition', 'tracking'
  level INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, department)
);

-- Create streaks tracking
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  streak_type TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

-- Enable Row Level Security
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_points
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points" ON public.user_points
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points" ON public.user_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for point_activities
CREATE POLICY "Users can view their own point activities" ON public.point_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own point activities" ON public.point_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for department_progress
CREATE POLICY "Users can view their own department progress" ON public.department_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own department progress" ON public.department_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own department progress" ON public.department_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_streaks
CREATE POLICY "Users can view their own streaks" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update user points and level
CREATE OR REPLACE FUNCTION update_user_points_and_level(
  p_user_id UUID,
  p_points INTEGER,
  p_activity_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_multiplier NUMERIC DEFAULT 1.0
) RETURNS JSONB AS $$
DECLARE
  v_current_points INTEGER;
  v_current_level INTEGER;
  v_level_name TEXT;
  v_points_to_next INTEGER;
  v_new_level INTEGER;
  v_new_level_name TEXT;
  v_level_up BOOLEAN := FALSE;
  v_final_points INTEGER;
BEGIN
  -- Apply multiplier to points
  v_final_points := ROUND(p_points * p_multiplier);
  
  -- Insert point activity
  INSERT INTO public.point_activities (user_id, activity_type, points_earned, multiplier, description)
  VALUES (p_user_id, p_activity_type, v_final_points, p_multiplier, p_description);
  
  -- Get or create user points record
  INSERT INTO public.user_points (user_id, total_points, current_level, level_name, points_to_next_level)
  VALUES (p_user_id, 0, 1, 'Rookie', 100)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update total points
  UPDATE public.user_points 
  SET total_points = total_points + v_final_points,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Get current state
  SELECT total_points, current_level, level_name, points_to_next_level
  INTO v_current_points, v_current_level, v_level_name, v_points_to_next
  FROM public.user_points 
  WHERE user_id = p_user_id;
  
  -- Calculate new level
  v_new_level := v_current_level;
  v_new_level_name := v_level_name;
  
  -- Level progression logic
  WHILE v_current_points >= v_points_to_next LOOP
    v_new_level := v_new_level + 1;
    v_level_up := TRUE;
    
    -- Set level names and point requirements
    CASE v_new_level
      WHEN 2 THEN v_new_level_name := 'Bronze'; v_points_to_next := 200;
      WHEN 3 THEN v_new_level_name := 'Silver'; v_points_to_next := 350;
      WHEN 4 THEN v_new_level_name := 'Gold'; v_points_to_next := 550;
      WHEN 5 THEN v_new_level_name := 'Platinum'; v_points_to_next := 800;
      WHEN 6 THEN v_new_level_name := 'Diamond'; v_points_to_next := 1100;
      WHEN 7 THEN v_new_level_name := 'Master'; v_points_to_next := 1500;
      ELSE v_new_level_name := 'Grandmaster'; v_points_to_next := v_points_to_next + 500;
    END CASE;
  END LOOP;
  
  -- Update level if changed
  IF v_level_up THEN
    UPDATE public.user_points 
    SET current_level = v_new_level,
        level_name = v_new_level_name,
        points_to_next_level = v_points_to_next,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'total_points', v_current_points,
    'current_level', v_new_level,
    'level_name', v_new_level_name,
    'points_to_next_level', v_points_to_next,
    'level_up', v_level_up,
    'points_earned', v_final_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update streaks
CREATE OR REPLACE FUNCTION update_user_streak(
  p_user_id UUID,
  p_streak_type TEXT,
  p_activity_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_last_activity_date DATE;
BEGIN
  -- Get current streak data
  SELECT current_streak, longest_streak, last_activity_date
  INTO v_current_streak, v_longest_streak, v_last_activity_date
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, p_streak_type, 1, 1, p_activity_date);
    RETURN 1;
  END IF;
  
  -- Check if activity is consecutive
  IF v_last_activity_date IS NULL OR p_activity_date = v_last_activity_date + 1 THEN
    -- Continue or start streak
    v_current_streak := v_current_streak + 1;
  ELSIF p_activity_date > v_last_activity_date + 1 THEN
    -- Streak broken, reset
    v_current_streak := 1;
  END IF;
  
  -- Update longest streak if necessary
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Update record
  UPDATE public.user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = p_activity_date,
      updated_at = now()
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  RETURN v_current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
