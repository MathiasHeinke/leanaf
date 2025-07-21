
-- Erweitere body_measurements Tabelle um Arme und Hals
ALTER TABLE public.body_measurements 
ADD COLUMN arms NUMERIC,
ADD COLUMN neck NUMERIC;

-- Erstelle Funktion um department_progress basierend auf point_activities zu aktualisieren
CREATE OR REPLACE FUNCTION update_department_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_department TEXT;
  v_current_points INTEGER := 0;
  v_current_level INTEGER := 1;
  v_new_level INTEGER;
BEGIN
  -- Bestimme Department basierend auf activity_type
  CASE NEW.activity_type
    WHEN 'workout_completed', 'exercise_logged' THEN
      v_department := 'training';
    WHEN 'meal_tracked', 'meal_tracked_with_photo', 'calorie_deficit_met', 'protein_goal_met' THEN
      v_department := 'nutrition';
    WHEN 'weight_measured', 'body_measurements', 'sleep_tracked', 'daily_login' THEN
      v_department := 'tracking';
    ELSE
      RETURN NEW; -- Unbekannte activity_type, nichts tun
  END CASE;

  -- Hole aktuelle department_progress oder erstelle neuen Eintrag
  INSERT INTO public.department_progress (user_id, department, level, points)
  VALUES (NEW.user_id, v_department, 1, 0)
  ON CONFLICT (user_id, department) DO NOTHING;

  -- Aktualisiere Punkte
  UPDATE public.department_progress 
  SET points = points + NEW.points_earned,
      updated_at = now()
  WHERE user_id = NEW.user_id AND department = v_department
  RETURNING points, level INTO v_current_points, v_current_level;

  -- Berechne neues Level (jedes Level braucht 50 mehr Punkte)
  v_new_level := (v_current_points / 50) + 1;

  -- Aktualisiere Level falls nötig
  IF v_new_level > v_current_level THEN
    UPDATE public.department_progress 
    SET level = v_new_level,
        updated_at = now()
    WHERE user_id = NEW.user_id AND department = v_department;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Erstelle Trigger der bei neuen point_activities ausgelöst wird
CREATE TRIGGER trigger_update_department_progress
  AFTER INSERT ON public.point_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_department_progress();

-- Backfill bestehende department_progress aus point_activities
INSERT INTO public.department_progress (user_id, department, level, points)
SELECT 
  pa.user_id,
  CASE 
    WHEN pa.activity_type IN ('workout_completed', 'exercise_logged') THEN 'training'
    WHEN pa.activity_type IN ('meal_tracked', 'meal_tracked_with_photo', 'calorie_deficit_met', 'protein_goal_met') THEN 'nutrition'
    WHEN pa.activity_type IN ('weight_measured', 'body_measurements', 'sleep_tracked', 'daily_login') THEN 'tracking'
  END as department,
  GREATEST(1, (SUM(pa.points_earned) / 50) + 1) as level,
  SUM(pa.points_earned) as points
FROM public.point_activities pa
WHERE pa.activity_type IN ('workout_completed', 'exercise_logged', 'meal_tracked', 'meal_tracked_with_photo', 'calorie_deficit_met', 'protein_goal_met', 'weight_measured', 'body_measurements', 'sleep_tracked', 'daily_login')
GROUP BY pa.user_id, 
  CASE 
    WHEN pa.activity_type IN ('workout_completed', 'exercise_logged') THEN 'training'
    WHEN pa.activity_type IN ('meal_tracked', 'meal_tracked_with_photo', 'calorie_deficit_met', 'protein_goal_met') THEN 'nutrition'
    WHEN pa.activity_type IN ('weight_measured', 'body_measurements', 'sleep_tracked', 'daily_login') THEN 'tracking'
  END
ON CONFLICT (user_id, department) 
DO UPDATE SET 
  points = EXCLUDED.points,
  level = EXCLUDED.level,
  updated_at = now();
