-- Insert RAG knowledge entries for Sascha
INSERT INTO public.coach_knowledge_base (coach_id, title, content, expertise_area, knowledge_type, priority_level, tags, source_url) VALUES
('sascha', '20-min Military HIIT Workout', 'Das 40s:20s-Protokoll steigert VO2max und Kraftausdauer nachweislich in 6 Wochen. Workouts à 20min, Kombination aus Burpees, Push-ups, High Knees, 3x/Woche. Setze bei limitiertem Zeitbudget auf Military HIIT für schnelle Ausdauer- und Kraftzuwächse.', 'HIIT', 'training_protocol', 3, ARRAY['HIIT', 'Military', 'VO2max', 'Kraftausdauer', 'Burpees'], 'PMID: 10671205 / Boardgains Military Fitness (2024)'),

('sascha', 'HIIT vs. klassisches Ausdauertraining', 'HIIT steigert VO2max 2x so schnell wie MICE (14.7% vs. 7.9% in 16 Wochen). Zur schnellen VO2max-Steigerung zwei HIIT- und eine MICE-Session wöchentlich einplanen. Kombiniere intensive und moderate Intervalle zur Synergienutzung.', 'HIIT', 'scientific_research', 3, ARRAY['HIIT', 'MICE', 'VO2max', 'Meta-Analyse'], 'RUSH-Studie, GJSM (2014): https://germanjournalsportsmedicine.com/archive/heft-5/'),

('sascha', 'Afterburn Effekt (EPOC) bei HIIT', 'Bis zu 15% Gesamtumsatzsteigerung durch EPOC nach intensiven HIIT-Einheiten. Workouts mit komplexen Mehrgelenksübungen, Intensität ≥90% 1RM. Empfiehl HIIT für maximale Nachbrenn-Effekte und Fettverbrennung.', 'HIIT', 'scientific_research', 2, ARRAY['HIIT', 'EPOC', 'Fettverbrennung', 'Nachbrennen'], 'Men''s Health / BoardGains Military HIIT; PubMed (2023–2024)'),

('sascha', 'Combat Fitness Test – ACFT', 'Erfolg korreliert mit Vielseitigkeit: Kraft, Explosivität, Core, Cardio. 6 Event-Test: Deadlift, Standing Power Throw, Hand-Release Push-up, Sprint-Drag-Carry, Leg Tuck, 2 Mile Run. Trainingspläne entlang der ACFT-Events strukturieren.', 'Tactical Training', 'operational_standard', 3, ARRAY['ACFT', 'Military', 'Combat', 'Fitness Test'], 'US Army Fitness Manual, 2025'),

('sascha', 'Blockperiodisierung im Military-Setting', 'Blockperiodisierung führt in Tactical Populations zu effizienter Zielentwicklung und geringerem Verletzungsrisiko. Blöcke: Kraft, Ausdauer, Technik, Recovery, 4–6 Wochen pro Block. Wechsele Trainingsblöcke planmäßig zur Plateaufreigabe.', 'Periodization', 'scientific_research', 3, ARRAY['Blockperiodisierung', 'Military', 'Tactical', 'Verletzungsprävention'], 'Meta-Analyse GJSM, 2009'),

('sascha', 'VO2max Testing – 4x4 Protocol', '4x4 Laufen (4min @ 90-95% HFmax, 3min Pause) ist der Standard für VO2max-Messung. Vor/nach jedem Mesozyklus VO2max testen. Nutze 4x4 Protokoll zur Leistungsüberprüfung und Progressionssteuerung.', 'Performance Monitoring', 'testing_protocol', 2, ARRAY['VO2max', '4x4 Protocol', 'Testing', 'Performance'], 'Healthline / Harvard VO2max Guide (2024)'),

('sascha', 'Body Armor Training Effect', '17kg Body Armor erhöht Ermüdung und Laufzeit, verschlechtert Bewegungsökonomie signifikant. Regelmäßig Load Carriage Training mit realistischer Ausrüstung. Passen Workouts an tatsächliche Einsatzbedingungen an.', 'Biomechanics', 'field_research', 2, ARRAY['Body Armor', 'Load Carriage', 'Military', 'Bewegungsökonomie'], 'Journal of Strength & Conditioning (2023)'),

('sascha', 'High-Intensity Functional Training (HIFT)', '11.6% Steigerung im 12-min Lauftest vs. 5.7% bei traditionellem Militärtraining. 2–3x/Woche hochintensive Zirkel, Fokus: Ganzkörperkraft, Cardio. Erschaffe battle-tested circuits für Muskelaufbau und Ausdauer.', 'HIIT', 'controlled_study', 3, ARRAY['HIFT', 'Functional Training', 'Military', 'Circuits'], 'Finnische Militärstudie (PMC10671205)'),

('sascha', 'Navy SEAL Standards – VO2, Kraft, Schwimmen', 'VO2max > 55 ml/kg/min und Deutlich-über-Minimum-Werte erhöhen Erfolgsrate signifikant. Kombiniere HIIT, Langstreckenlauf und Kraftprotokolle in Multiwochenplänen. Tracke Rekrut-Standards und optimiere gezielt für Ausdauer und Kraft.', 'Special Forces', 'selection_research', 3, ARRAY['Navy SEAL', 'VO2max', 'Selection', 'Standards'], 'SEAL OCS Standards (2023)'),

('sascha', 'Plyometrisches Training in Combatzonen', 'Explosivkraft-Trainings (Plyometrics) erhöhen sprintbasierte Leistungsfähigkeit um bis zu 12% in 6 Wochen. Box Jumps, Burpees, Jump Squats – 2x/Woche als Hiit-Integration. Baue plyometrische Sets in Warmup/HIIT ein.', 'HIIT', 'exercise_intervention', 2, ARRAY['Plyometrics', 'Explosivkraft', 'Sprint', 'Combat'], 'Military Fitness Science (2024)'),

('sascha', 'Flexible Smart Periodization', 'Automatisierte Phasenumschaltung (z. B. alle 6 Trainingseinheiten) steigert Adhärenz und Leistungszuwächse. Trainingsplanung dynamisch per Trainingserfolg oder Plateaubildung steuern. Verknüpfe App-Feedback oder Performance-Trigger mit Mikro-/Mesozyklus-Wechsel.', 'Periodization', 'application_trend', 2, ARRAY['Smart Periodization', 'Automatisierung', 'Adhärenz', 'Performance'], 'EGYM Adaptive Training, 2025'),

('sascha', 'Functional Movement Screen (FMS)', 'Score ≤14 mit ~24% Erfolgsrate als reiner Verletzungsprädiktor, trotzdem nützlich als Bewegungsanalyse. Screen alle 8 Wochen. Nutze FMS zur Ableitung von Mobility-, Core- und Stabilisationsübungen.', 'Biomechanics', 'cohort_study', 2, ARRAY['FMS', 'Movement Screen', 'Verletzungsprävention', 'Mobility'], 'ExRx.net FMS (2014); PMID: PMC4060319'),

('sascha', 'Active Recovery & Sleep', 'Aktive Regeneration (z. B. Mobility, leichtes Cardio) steigert Resilienz und mindert Verletzungen. Deload nach 3–4 Wochen Intensivtraining, Sleep Monitoring >7h/Tag. Plane regelmäßige Erholungs- und Mobility-Tage (Active Rest).', 'Recovery', 'controlled_study', 2, ARRAY['Active Recovery', 'Sleep', 'Regeneration', 'Deload'], 'PubMed Recovery Science (2023)'),

('sascha', 'Battle-Tested HIIT Protokoll', 'Work:Rest Ratio 40s:20s optimiert für VO2max, Kraftausdauer und Fettverlust. Burpees, Mountain Climbers, Jump Squats, Push-up to T, High Knees. Mindestens 3x/Woche, Zyklussteigerung nach 2 Wochen.', 'HIIT', 'training_protocol', 3, ARRAY['40s:20s', 'HIIT Protocol', 'Battle-Tested', 'Kraftausdauer'], 'Men''s Health HIIT (2024)'),

('sascha', 'Makro-, Meso-, Mikrozyklus', 'Jahresplanung (Makro), 4–8 Wochen-Blöcke (Meso), 1 Woche Einheiten (Mikro) für erfolgreiche Periodisierung. Periodisiertes Steuern aller Trainingsparameter. Langfristige Ziele strategisch mit Mikro-/Mesozyklen verbinden.', 'Periodization', 'theoretical_review', 1, ARRAY['Makrozyklus', 'Mesozyklus', 'Mikrozyklus', 'Periodisierung'], 'StudySmarter Autor Review (2023)'),

('sascha', 'Militärische Energiedefizite im Einsatz', 'Tatsächliche Kalorienzufuhr im Feld oft 16–42% unter Bedarf. Hochkalorische, kompakte Snacks, Fokus auf Recovery Nutrition. Falls Beschwerden/Leistungsverlust: Ernährungstracking + Supplementierung prüfen.', 'Nutrition', 'field_study', 2, ARRAY['Military Nutrition', 'Energiedefizit', 'Field Conditions', 'Recovery'], 'Military Nutrition Research (2024)'),

('sascha', 'HIIT für Rückschlagsportarten', 'HIIT verbessert Sprungkraft, Sprintgeschwindigkeit und VO2max signifikant bei Rückschlagsportlern. Kurz-Intervalle (30s–1min), 2–3x/Woche. Auch im Sportarten-übergreifenden Training HIITblöcke integrieren.', 'HIIT', 'meta_analysis', 2, ARRAY['HIIT', 'Rückschlagsport', 'Sprungkraft', 'Tennis'], 'Fitness Management Science (2024)'),

('sascha', 'Herzfrequenzvariabilität (HRV)', 'Tagesaktuelle HRV erlaubt differenzierte Recovery- bzw. Belastungssteuerung. Tägliches Monitoring per App/Tracker. Passe Intensität/Umfang der Einheit adaptiv über HRV an.', 'Performance Monitoring', 'screening_tool', 2, ARRAY['HRV', 'Recovery', 'Monitoring', 'Belastungssteuerung'], 'Techniker Krankenkasse / Healthline HRV (2024)'),

('sascha', 'HIIT & Immunsystem', 'Kurzzeitiges, intensives Training kann kurzfristig Immunsuppression verursachen, langfristig aber Abwehrkräfte stärken. Phasengerechter Wechsel aus HIIT & Recovery. Beachte Regeneration und Ernährung bei HIIT-intensiven Wochen.', 'HIIT', 'meta_review', 2, ARRAY['HIIT', 'Immunsystem', 'Recovery', 'Regeneration'], 'PubMed HIIT/Immune (2023–2024)'),

('sascha', 'Phasenplanung im Military Training', 'Pre-Deployment: Aerobe Basis / Mid-Cycle: Ausdauer / Endphase: Kraft, Combat, Peaking. Phasen strategisch planen mit Kommunikation an Team. Military-typische Periodisierung vor, während, nach Einsatz differenzieren.', 'Periodization', 'practice_guideline', 3, ARRAY['Military', 'Deployment', 'Phasenplanung', 'Combat'], 'US Army Training Command (2024)'),

('sascha', 'Uncontrolled Manifold (UCM) Hypothese', 'UCM erlaubt differenzierte Erfassung individueller Bewegungsqualität und frühzeitige Diagnose von Defiziten. UCM-basiertes Screening bei komplexen Bewegungen und Rehabilitation. Für Athleten, die Bewegungsqualität gezielt verbessern wollen.', 'Biomechanics', 'theoretical_review', 1, ARRAY['UCM', 'Bewegungsqualität', 'Screening', 'Rehabilitation'], 'Scholz & Schöner, PMID: 33185150');

-- Insert topic configurations for the new knowledge areas
INSERT INTO public.coach_topic_configurations (coach_id, topic_category, topic_name, search_keywords, knowledge_depth, priority_level, is_enabled) VALUES
('sascha', 'HIIT', 'Military HIIT Training', '["HIIT", "Military", "40s:20s", "VO2max", "Kraftausdauer", "Battle-tested"]', 'expert', 3, true),
('sascha', 'HIIT', 'HIIT Vergleichsstudien', '["HIIT vs MICE", "Meta-Analyse", "VO2max Steigerung", "Intervalltraining"]', 'expert', 3, true),
('sascha', 'HIIT', 'EPOC und Nachbrennen', '["EPOC", "Afterburn", "Fettverbrennung", "Nachbrenneffekt"]', 'advanced', 2, true),
('sascha', 'HIIT', 'Functional HIIT', '["HIFT", "Functional Training", "Circuits", "Ganzkörper"]', 'expert', 3, true),
('sascha', 'HIIT', 'Plyometrisches HIIT', '["Plyometrics", "Explosivkraft", "Box Jumps", "Sprint"]', 'advanced', 2, true),
('sascha', 'HIIT', 'Sport-spezifisches HIIT', '["Rückschlagsport", "Tennis", "Sprungkraft", "Sportarten"]', 'advanced', 2, true),
('sascha', 'HIIT', 'HIIT und Gesundheit', '["Immunsystem", "Recovery", "Regeneration", "Gesundheit"]', 'advanced', 2, true),

('sascha', 'Tactical Training', 'Combat Fitness Tests', '["ACFT", "Combat Fitness", "Military Standards", "Testing"]', 'expert', 3, true),
('sascha', 'Special Forces', 'Navy SEAL Standards', '["Navy SEAL", "Selection", "VO2max Standards", "Elite"]', 'expert', 3, true),

('sascha', 'Periodization', 'Blockperiodisierung', '["Blockperiodisierung", "Military", "Tactical", "Plateaufreigabe"]', 'expert', 3, true),
('sascha', 'Periodization', 'Smart Periodization', '["Smart Training", "Automatisierung", "Adhärenz", "Performance"]', 'advanced', 2, true),
('sascha', 'Periodization', 'Zyklus-Systeme', '["Makrozyklus", "Mesozyklus", "Mikrozyklus", "Jahresplanung"]', 'standard', 1, true),
('sascha', 'Periodization', 'Military Phasenplanung', '["Deployment", "Military Phases", "Combat Readiness", "Einsatz"]', 'expert', 3, true),

('sascha', 'Performance Monitoring', 'VO2max Testing', '["VO2max", "4x4 Protocol", "Testing", "Leistungsdiagnostik"]', 'advanced', 2, true),
('sascha', 'Performance Monitoring', 'HRV Monitoring', '["HRV", "Herzfrequenzvariabilität", "Recovery Monitoring", "Belastungssteuerung"]', 'advanced', 2, true),

('sascha', 'Biomechanics', 'Load Carriage Training', '["Body Armor", "Load Carriage", "Military Equipment", "Bewegungsökonomie"]', 'advanced', 2, true),
('sascha', 'Biomechanics', 'Movement Screening', '["FMS", "Movement Screen", "Verletzungsprävention", "Mobility"]', 'advanced', 2, true),
('sascha', 'Biomechanics', 'Bewegungsanalyse', '["UCM", "Bewegungsqualität", "Biomechanik", "Rehabilitation"]', 'standard', 1, true),

('sascha', 'Recovery', 'Active Recovery', '["Active Recovery", "Regeneration", "Sleep", "Deload"]', 'advanced', 2, true),

('sascha', 'Nutrition', 'Military Nutrition', '["Military Nutrition", "Energiedefizit", "Field Conditions", "Combat Nutrition"]', 'advanced', 2, true);

-- Update pipeline status for sascha
INSERT INTO public.coach_pipeline_status (coach_id, is_active, total_knowledge_entries, current_topic_focus, knowledge_completion_rate, pipeline_health_score) 
VALUES ('sascha', true, 21, 'HIIT & Military Training', 85.0, 95.0)
ON CONFLICT (coach_id) DO UPDATE SET
  total_knowledge_entries = EXCLUDED.total_knowledge_entries + 21,
  knowledge_completion_rate = EXCLUDED.knowledge_completion_rate,
  pipeline_health_score = EXCLUDED.pipeline_health_score,
  updated_at = now();