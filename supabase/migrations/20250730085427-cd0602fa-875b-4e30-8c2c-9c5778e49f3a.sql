-- Create function for medical risk assessment
CREATE OR REPLACE FUNCTION public.assess_medical_risk(
  p_user_id UUID,
  p_conditions UUID[] DEFAULT '{}',
  p_custom_conditions TEXT[] DEFAULT '{}',
  p_medications UUID[] DEFAULT '{}',
  p_custom_medications TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_risk_level TEXT := 'low';
  v_recommendations TEXT[] := ARRAY[]::TEXT[];
  v_contraindications TEXT[] := ARRAY[]::TEXT[];
  v_considerations TEXT[] := ARRAY[]::TEXT[];
  v_condition_risk TEXT;
  v_medication_risk TEXT;
  condition_rec RECORD;
  medication_rec RECORD;
BEGIN
  -- Analyze medical conditions
  FOR condition_rec IN 
    SELECT risk_level, fitness_considerations, contraindications 
    FROM medical_conditions_library 
    WHERE id = ANY(p_conditions)
  LOOP
    -- Escalate risk level
    CASE 
      WHEN condition_rec.risk_level = 'critical' THEN v_risk_level := 'critical';
      WHEN condition_rec.risk_level = 'high' AND v_risk_level != 'critical' THEN v_risk_level := 'high';
      WHEN condition_rec.risk_level = 'medium' AND v_risk_level IN ('low', 'unknown') THEN v_risk_level := 'medium';
    END CASE;
    
    -- Collect considerations and contraindications
    IF condition_rec.fitness_considerations IS NOT NULL THEN
      v_considerations := array_append(v_considerations, condition_rec.fitness_considerations);
    END IF;
    
    IF condition_rec.contraindications IS NOT NULL THEN
      v_contraindications := array_cat(v_contraindications, condition_rec.contraindications);
    END IF;
  END LOOP;

  -- Analyze medications
  FOR medication_rec IN 
    SELECT risk_level, fitness_considerations, exercise_interactions 
    FROM medications_library 
    WHERE id = ANY(p_medications)
  LOOP
    -- Escalate risk level
    CASE 
      WHEN medication_rec.risk_level = 'critical' THEN v_risk_level := 'critical';
      WHEN medication_rec.risk_level = 'high' AND v_risk_level != 'critical' THEN v_risk_level := 'high';
      WHEN medication_rec.risk_level = 'medium' AND v_risk_level IN ('low', 'unknown') THEN v_risk_level := 'medium';
    END CASE;
    
    -- Collect considerations
    IF medication_rec.fitness_considerations IS NOT NULL THEN
      v_considerations := array_append(v_considerations, medication_rec.fitness_considerations);
    END IF;
    
    IF medication_rec.exercise_interactions IS NOT NULL THEN
      v_contraindications := array_cat(v_contraindications, medication_rec.exercise_interactions);
    END IF;
  END LOOP;

  -- Generate recommendations based on risk level
  CASE v_risk_level
    WHEN 'critical' THEN 
      v_recommendations := ARRAY[
        'Bitte konsultieren Sie unbedingt Ihren Arzt, bevor Sie diese App verwenden.',
        'Diese App ist möglicherweise nicht für Ihre gesundheitliche Situation geeignet.',
        'Verwenden Sie die App nur unter ärztlicher Aufsicht.'
      ];
    WHEN 'high' THEN
      v_recommendations := ARRAY[
        'Wir empfehlen Ihnen dringend, vor der Nutzung dieser App Ihren Arzt zu konsultieren.',
        'Verwenden Sie die App mit besonderer Vorsicht.',
        'Überwachen Sie Ihre Werte regelmäßig während des Trainings.'
      ];
    WHEN 'medium' THEN
      v_recommendations := ARRAY[
        'Bitte sprechen Sie mit Ihrem Arzt über Ihre Trainingspläne.',
        'Beginnen Sie langsam und steigern Sie die Intensität schrittweise.',
        'Hören Sie auf Ihren Körper und übertreiben Sie nicht.'
      ];
    ELSE
      v_recommendations := ARRAY[
        'Basierend auf Ihren Angaben können Sie die App voraussichtlich sicher nutzen.',
        'Beginnen Sie dennoch langsam und steigern Sie sich schrittweise.',
        'Bei Beschwerden konsultieren Sie einen Arzt.'
      ];
  END CASE;

  -- Update user medical profile
  INSERT INTO user_medical_profile (
    user_id, has_medical_conditions, takes_medications, 
    medical_conditions, custom_conditions, medications, custom_medications,
    risk_assessment, screening_completed_at
  ) VALUES (
    p_user_id, 
    array_length(p_conditions, 1) > 0 OR array_length(p_custom_conditions, 1) > 0,
    array_length(p_medications, 1) > 0 OR array_length(p_custom_medications, 1) > 0,
    p_conditions, p_custom_conditions, p_medications, p_custom_medications,
    jsonb_build_object(
      'risk_level', v_risk_level,
      'recommendations', v_recommendations,
      'considerations', v_considerations,
      'contraindications', v_contraindications,
      'assessment_date', now()
    ),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    has_medical_conditions = EXCLUDED.has_medical_conditions,
    takes_medications = EXCLUDED.takes_medications,
    medical_conditions = EXCLUDED.medical_conditions,
    custom_conditions = EXCLUDED.custom_conditions,
    medications = EXCLUDED.medications,
    custom_medications = EXCLUDED.custom_medications,
    risk_assessment = EXCLUDED.risk_assessment,
    screening_completed_at = EXCLUDED.screening_completed_at,
    updated_at = now();

  -- Update profiles table with risk level
  UPDATE profiles 
  SET medical_risk_level = v_risk_level,
      medical_screening_completed = true
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'risk_level', v_risk_level,
    'recommendations', v_recommendations,
    'considerations', v_considerations,
    'contraindications', v_contraindications
  );
END;
$$;