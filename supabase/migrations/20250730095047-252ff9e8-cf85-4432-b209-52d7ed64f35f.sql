-- Fix the perform_medical_risk_assessment function to handle NULL arrays properly
CREATE OR REPLACE FUNCTION public.perform_medical_risk_assessment(p_user_id uuid, p_conditions uuid[], p_custom_conditions text[], p_medications uuid[], p_custom_medications text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_risk_level TEXT := 'low';
    v_recommendations TEXT[] := ARRAY[]::TEXT[];
    v_considerations TEXT[] := ARRAY[]::TEXT[];
    v_contraindications TEXT[] := ARRAY[]::TEXT[];
    v_condition_record RECORD;
    v_medication_record RECORD;
    v_result JSON;
    v_has_conditions BOOLEAN := FALSE;
    v_takes_medications BOOLEAN := FALSE;
BEGIN
    -- Safely check if user has conditions (handle NULL arrays)
    v_has_conditions := (COALESCE(array_length(p_conditions, 1), 0) > 0) OR (COALESCE(array_length(p_custom_conditions, 1), 0) > 0);
    v_takes_medications := (COALESCE(array_length(p_medications, 1), 0) > 0) OR (COALESCE(array_length(p_custom_medications, 1), 0) > 0);

    -- Analyze selected medical conditions
    FOR v_condition_record IN 
        SELECT * FROM medical_conditions_library 
        WHERE id = ANY(COALESCE(p_conditions, ARRAY[]::uuid[]))
    LOOP
        -- Upgrade risk level based on condition severity
        IF v_condition_record.risk_level = 'critical' THEN
            v_risk_level := 'critical';
        ELSIF v_condition_record.risk_level = 'high' AND v_risk_level != 'critical' THEN
            v_risk_level := 'high';
        ELSIF v_condition_record.risk_level = 'medium' AND v_risk_level NOT IN ('high', 'critical') THEN
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

    -- Analyze selected medications
    FOR v_medication_record IN 
        SELECT * FROM medications_library 
        WHERE id = ANY(COALESCE(p_medications, ARRAY[]::uuid[]))
    LOOP
        -- Upgrade risk level based on medication severity
        IF v_medication_record.risk_level = 'critical' THEN
            v_risk_level := 'critical';
        ELSIF v_medication_record.risk_level = 'high' AND v_risk_level != 'critical' THEN
            v_risk_level := 'high';
        ELSIF v_medication_record.risk_level = 'medium' AND v_risk_level NOT IN ('high', 'critical') THEN
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

    -- Generate risk-specific recommendations
    CASE v_risk_level
        WHEN 'low' THEN
            v_recommendations := ARRAY[
                'Regelmäßige körperliche Aktivität wird empfohlen',
                'Achten Sie auf eine ausgewogene Ernährung',
                'Bei neuen Symptomen konsultieren Sie einen Arzt'
            ];
        WHEN 'medium' THEN
            v_recommendations := ARRAY[
                'Konsultieren Sie vor Beginn eines Trainingsprogramms einen Arzt',
                'Starten Sie mit leichten Aktivitäten und steigern Sie langsam',
                'Überwachen Sie Ihre Körperreaktionen während des Trainings'
            ];
        WHEN 'high' THEN
            v_recommendations := ARRAY[
                'Ärztliche Freigabe vor Trainingsbeginn erforderlich',
                'Training nur unter professioneller Anleitung',
                'Regelmäßige medizinische Kontrollen empfohlen'
            ];
        WHEN 'critical' THEN
            v_recommendations := ARRAY[
                'Sofortige ärztliche Konsultation erforderlich',
                'Training nur nach ausdrücklicher ärztlicher Freigabe',
                'Engmaschige medizinische Überwachung notwendig'
            ];
    END CASE;

    -- Build result JSON
    v_result := json_build_object(
        'risk_level', v_risk_level,
        'recommendations', v_recommendations,
        'considerations', v_considerations,
        'contraindications', v_contraindications
    );

    -- Save or update user medical profile with explicit boolean values
    INSERT INTO user_medical_profile (
        user_id,
        has_medical_conditions,
        takes_medications,
        medical_conditions,
        medications,
        custom_conditions,
        custom_medications,
        risk_assessment,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_has_conditions,
        v_takes_medications,
        COALESCE(p_conditions, ARRAY[]::uuid[]),
        COALESCE(p_medications, ARRAY[]::uuid[]),
        COALESCE(p_custom_conditions, ARRAY[]::text[]),
        COALESCE(p_custom_medications, ARRAY[]::text[]),
        v_result,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        has_medical_conditions = EXCLUDED.has_medical_conditions,
        takes_medications = EXCLUDED.takes_medications,
        medical_conditions = EXCLUDED.medical_conditions,
        medications = EXCLUDED.medications,
        custom_conditions = EXCLUDED.custom_conditions,
        custom_medications = EXCLUDED.custom_medications,
        risk_assessment = EXCLUDED.risk_assessment,
        updated_at = NOW();

    RETURN v_result;
END;
$function$;