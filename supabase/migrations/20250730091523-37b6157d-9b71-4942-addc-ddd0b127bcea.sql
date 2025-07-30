-- Fix the assess_medical_risk function to handle takes_medications properly
CREATE OR REPLACE FUNCTION assess_medical_risk(
  p_user_id UUID,
  p_conditions TEXT[],
  p_custom_conditions TEXT[],
  p_medications TEXT[],
  p_custom_medications TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk_level TEXT := 'low';
  v_recommendations TEXT[] := ARRAY[]::TEXT[];
  v_considerations TEXT[] := ARRAY[]::TEXT[];
  v_contraindications TEXT[] := ARRAY[]::TEXT[];
  v_condition_record RECORD;
  v_medication_record RECORD;
  v_has_conditions BOOLEAN;
  v_takes_medications BOOLEAN;
  v_result JSONB;
BEGIN
  -- Determine if user has conditions or takes medications
  v_has_conditions := (array_length(p_conditions, 1) > 0 OR array_length(p_custom_conditions, 1) > 0);
  v_takes_medications := (array_length(p_medications, 1) > 0 OR array_length(p_custom_medications, 1) > 0);

  -- Analyze medical conditions
  IF array_length(p_conditions, 1) > 0 THEN
    FOR v_condition_record IN 
      SELECT * FROM medical_conditions_library 
      WHERE id = ANY(p_conditions)
    LOOP
      -- Determine highest risk level
      IF v_condition_record.risk_level = 'critical' THEN
        v_risk_level := 'critical';
      ELSIF v_condition_record.risk_level = 'high' AND v_risk_level != 'critical' THEN
        v_risk_level := 'high';
      ELSIF v_condition_record.risk_level = 'medium' AND v_risk_level NOT IN ('critical', 'high') THEN
        v_risk_level := 'medium';
      END IF;

      -- Add fitness considerations
      IF v_condition_record.fitness_considerations IS NOT NULL THEN
        v_considerations := array_append(v_considerations, v_condition_record.fitness_considerations);
      END IF;

      -- Add contraindications
      IF v_condition_record.contraindications IS NOT NULL THEN
        v_contraindications := array_cat(v_contraindications, v_condition_record.contraindications);
      END IF;
    END LOOP;
  END IF;

  -- Analyze medications
  IF array_length(p_medications, 1) > 0 THEN
    FOR v_medication_record IN 
      SELECT * FROM medications_library 
      WHERE id = ANY(p_medications)
    LOOP
      -- Determine highest risk level
      IF v_medication_record.risk_level = 'critical' THEN
        v_risk_level := 'critical';
      ELSIF v_medication_record.risk_level = 'high' AND v_risk_level != 'critical' THEN
        v_risk_level := 'high';
      ELSIF v_medication_record.risk_level = 'medium' AND v_risk_level NOT IN ('critical', 'high') THEN
        v_risk_level := 'medium';
      END IF;

      -- Add fitness considerations
      IF v_medication_record.fitness_considerations IS NOT NULL THEN
        v_considerations := array_append(v_considerations, v_medication_record.fitness_considerations);
      END IF;

      -- Add exercise interactions as contraindications
      IF v_medication_record.exercise_interactions IS NOT NULL THEN
        v_contraindications := array_cat(v_contraindications, v_medication_record.exercise_interactions);
      END IF;
    END LOOP;
  END IF;

  -- Generate recommendations based on risk level
  CASE v_risk_level
    WHEN 'low' THEN
      v_recommendations := ARRAY[
        'Regelmäßiges moderates Training empfohlen',
        'Auf Körpersignale achten',
        'Langsame Steigerung der Intensität'
      ];
    WHEN 'medium' THEN
      v_recommendations := ARRAY[
        'Ärztliche Rücksprache vor Trainingsbeginn empfohlen',
        'Moderates Training mit regelmäßiger Überwachung',
        'Spezielle Übungsanpassungen berücksichtigen'
      ];
    WHEN 'high' THEN
      v_recommendations := ARRAY[
        'Ärztliche Freigabe erforderlich vor Trainingsbeginn',
        'Nur überwachtes Training',
        'Regelmäßige medizinische Kontrollen'
      ];
    WHEN 'critical' THEN
      v_recommendations := ARRAY[
        'Training nur unter ärztlicher Aufsicht',
        'Spezialisierte medizinische Betreuung erforderlich',
        'Individuelle Therapiepläne notwendig'
      ];
  END CASE;

  -- Create result object
  v_result := jsonb_build_object(
    'risk_level', v_risk_level,
    'recommendations', array_to_json(v_recommendations),
    'considerations', array_to_json(v_considerations),
    'contraindications', array_to_json(v_contraindications)
  );

  -- Insert or update user medical profile
  INSERT INTO user_medical_profile (
    user_id,
    has_medical_conditions,
    takes_medications,
    medical_conditions,
    custom_conditions,
    medications,
    custom_medications,
    risk_assessment,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_has_conditions,
    v_takes_medications,
    p_conditions,
    p_custom_conditions,
    p_medications,
    p_custom_medications,
    v_result,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    has_medical_conditions = v_has_conditions,
    takes_medications = v_takes_medications,
    medical_conditions = p_conditions,
    custom_conditions = p_custom_conditions,
    medications = p_medications,
    custom_medications = p_custom_medications,
    risk_assessment = v_result,
    updated_at = NOW();

  -- Update profile with medical screening completion and risk level
  UPDATE profiles 
  SET 
    medical_screening_completed = true,
    medical_risk_level = v_risk_level,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_result;
END;
$$;