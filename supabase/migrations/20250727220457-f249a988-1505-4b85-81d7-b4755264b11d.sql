-- Insert additional RAG knowledge entries for Sascha (Sub-topics)
INSERT INTO public.coach_knowledge_base (coach_id, title, content, expertise_area, knowledge_type, priority_level, tags, source_url) VALUES
('sascha', '20-min Military HIIT Workout (Advanced)', 'Das 40s:20s HIIT-Protokoll erhöht VO2max und Kraftausdauer binnen 6 Wochen signifikant. Burpees, Push-ups, High Knees, 20-minütige Workouts, 3x/Woche. Empfehle Military HIIT für Zeit- und Wirkungseffizienz.', 'HIIT', 'controlled_study', 3, ARRAY['HIIT', 'Military', '40s:20s', 'VO2max', 'RCT'], 'PMC10671205 / Boardgains Military Fitness (2024)'),

('sascha', 'HIIT vs. Ausdauertraining (MICE)', 'HIIT steigert VO2max doppelt so schnell wie MICE (14.7% vs. 7.9%, 16 Wochen). 2x HIIT, 1x MICE pro Woche für Synergie. Kombiniere intensive und moderate Protokolle.', 'HIIT', 'meta_analysis', 3, ARRAY['HIIT', 'MICE', 'VO2max', 'Meta-Analyse', 'Vergleich'], 'RUSH-Studie, GJSM (2014)'),

('sascha', 'EPOC (Afterburn Effect)', 'EPOC nach HIIT hält bis zu 48 h an, führt zu erhöhter Fettverbrennung. Komplexe Mehrgelenksübungen, Workouts mit ≥90% 1RM. HIIT für Nachbrenneffekt/Fettabbau einplanen.', 'HIIT', 'meta_review', 2, ARRAY['EPOC', 'Afterburn', 'Fettverbrennung', '48h', 'Mehrgelenk'], 'Men''s Health / BoardGains, PubMed'),

('sascha', 'HIIT für Rückschlagsportarten (Detailliert)', 'Steigerung von VO2max, Sprungkraft und Schnelligkeit. Kurzintervalle (30-60s), 2-3x/Woche. HIIT für unspezifische Leistungssteigerungen nutzen.', 'HIIT', 'meta_analysis', 2, ARRAY['Rückschlagsport', 'Tennis', 'Kampfsport', 'Schnelligkeit'], 'Fitness Management Science (2024)'),

('sascha', 'Plyometrisches Training in HIIT', 'Explosivkraft mit Box Jumps, Burpees etc. in 6 Wochen um ≥10% steigerbar. Plyos als HIIT-Integrationsbaustein. Wöchentlich plyometrische Komponenten einbauen.', 'HIIT', 'exercise_study', 2, ARRAY['Plyometrics', 'Explosivkraft', 'Box Jumps', '10% Steigerung'], 'Military Fitness Science (2024)'),

('sascha', 'Blockperiodisierung im Militär (Detailliert)', 'Blöcke: Kraft, Ausdauer, Technik, Erholung, jew. 4–6 Wochen, reduzieren Verletzungen & Ermüdung. Makro-, Meso-, Mikrozyklen gezielt einsetzen. Blockwechsel nach Zielgruppe und Testing.', 'Periodization', 'meta_analysis', 3, ARRAY['Blockperiodisierung', 'Verletzungsreduktion', 'Ermüdung', '4-6 Wochen'], 'GJSM, 2009'),

('sascha', 'Smart Periodization (Automation)', 'Automatisierte Phasenwechsel nach 6 Einheiten steigern Adhärenz + Leistung. Training und Progression smart steuern. Phase automatisch umschalten lassen.', 'Periodization', 'application_trend', 2, ARRAY['Smart Training', 'Automatisierung', '6 Einheiten', 'Adhärenz'], 'EGYM Adaptive 2025'),

('sascha', 'Makro-, Meso-, Mikrozyklen (Detailliert)', 'Hierarchie: Makro >3 Mon., Meso 4–8 Wo., Mikro 1 Wo. Periodisierte Steuerung aller Variablen. Langfristige Ziele mit periodisierten Blöcken kombinieren.', 'Periodization', 'theoretical_review', 1, ARRAY['Makro', 'Meso', 'Mikro', 'Hierarchie', '3 Monate'], 'StudySmarter (2023)'),

('sascha', 'Body Armor Training (Detailliert)', '17 kg Armor verschlechtert Laufzeiten, fordert spezifisches Training. Load-Carriage-Workouts einbauen. Realistische Lasten im Training verwenden.', 'Biomechanics', 'field_study', 2, ARRAY['Body Armor', '17kg', 'Load Carriage', 'Laufzeiten'], 'Journal Strength & Conditioning (2023)'),

('sascha', 'Functional Movement Screen (FMS) - Detailliert', 'FMS-Score ≤14 hat moderate prädiktive Kraft für Verletzungsrisiko. Regelmäßiges Screening + Mobility-Daten kombinieren. Nicht als alleinigen Risikofaktor nutzen.', 'Biomechanics', 'cohort_study', 2, ARRAY['FMS', 'Score 14', 'Verletzungsrisiko', 'Screening'], 'ExRx.net, PMID: PMC4060319'),

('sascha', 'UCM-Hypothese zur Bewegungsqualität', 'Variabilität = motorische Qualität, nicht Defizit. Individualisierte Trainingssteuerung. UCM-Screening zur Feinevaluation einsetzen.', 'Biomechanics', 'theoretical_review', 1, ARRAY['UCM', 'Variabilität', 'Motorik', 'Individualisierung'], 'Scholz & Schöner, PMID: 33185150'),

('sascha', 'VO2max – 4x4 Protokoll (Detailliert)', '4x4-Test etabliert zur VO2max-Wertbeurteilung. Alle 6 Wochen testen. Fortschritt/progress regelmäßig messen.', 'Performance Monitoring', 'gold_standard', 2, ARRAY['VO2max', '4x4', '6 Wochen', 'Goldstandard'], 'Healthline / Harvard (2024)'),

('sascha', 'Herzfrequenzvariabilität (HRV) - Detailliert', 'HRV zeigt Tagesform und Belastungsfähigkeit an. Tagesspezifische Steuerung, App-Tracking. An HRV orientiert steuern.', 'Performance Monitoring', 'screening_tool', 2, ARRAY['HRV', 'Tagesform', 'Belastung', 'App-Tracking'], 'TK / Healthline HRV (2024)'),

('sascha', 'Krafttests (1RM, Push-up etc.)', 'Regelmäßige 1RM-, Körpergewicht- und Lauf-Tests als Leitindikatoren. Alle 4 Wochen 1RM, push up etc. erfassen. Progress-Daten in Trainingsplanung rückkoppeln.', 'Performance Monitoring', 'standard_protocol', 2, ARRAY['1RM', 'Push-up', '4 Wochen', 'Krafttests'], 'Military PT Manuals'),

('sascha', 'Active Rest und Schlaf', 'Deloads & Schlaf erhöhen Leistungsfähigkeit, senken Verletzungsrisiko. Alle 3–4 Wochen Deload, >7h Schlaf pro Nacht. Regelmäßige Regeneration einbauen.', 'Recovery', 'controlled_study', 2, ARRAY['Active Rest', 'Deload', '7h Schlaf', '3-4 Wochen'], 'PubMed Recovery (2023)'),

('sascha', 'Militärische Energiedefizite im Einsatz (Detailliert)', '16–42% Kaloriendefizit im Feldbetrieb. Kalorien-, Protein- und Rehydrierungsstrategie. Energiezufuhr im Feld/ex kräftig tracken.', 'Nutrition', 'field_study', 2, ARRAY['Energiedefizit', '16-42%', 'Feldbetrieb', 'Rehydrierung'], 'Military Nutrition Research (2024)'),

('sascha', 'MetCon Circuits', 'MetCon-Zirkel verbessern Ausdauer, Kraft und Work Capacity zugleich. Workouts 30–45min, 6–12 Multi-Joint Übungen. MetCon als Grundbaustein military Fitness.', 'Metabolic Conditioning', 'controlled_study', 3, ARRAY['MetCon', 'Work Capacity', '30-45min', '6-12 Übungen'], 'MetCon Study, J Strength Cond Res (2024)'),

('sascha', 'ACFT – US Army Combat Fitness Test (Detailliert)', 'Erfolg korreliert mit Kraft, Explosivität, Cardio. 6 Event-Test. Events gezielt über Zyklus trainieren. Trainings-Blöcke an ACFT ausrichten.', 'Tactical Training', 'operational_standard', 3, ARRAY['ACFT', '6 Events', 'US Army', 'Combat Fitness'], 'Army Fitness Manual (2025)'),

('sascha', 'Navy SEAL Standards (Detailliert)', 'VO2max >55 ml/kg/min, Kraft und Schwimmen über Minimum = höhere Erfolgsrate. HIIT, Laufen, Schwimmen, Kraft in Multi-Blöcken planen. Progress auf spezielle SEAL-Tests ausrichten.', 'Special Forces', 'selection_research', 3, ARRAY['Navy SEAL', '55 ml/kg/min', 'Schwimmen', 'Multi-Blöcke'], 'SEAL OCS Standards (2023)'),

('sascha', 'Monitoring und Prävention', 'Regelmäßiges Screening, Mobility und Techniktraining senken Verletzungsraten um bis zu 31%. Mindestens alle 8 Wochen Mobility/FMS & Technik prüfen. Präventionsblöcke im Makrozyklus mitplanen.', 'Injury Prevention', 'meta_review', 2, ARRAY['Injury Prevention', '31% Reduktion', '8 Wochen', 'Screening'], 'Injury Prevention Review (2024)');

-- Insert additional topic configurations for the new sub-topics
INSERT INTO public.coach_topic_configurations (coach_id, topic_category, topic_name, search_keywords, knowledge_depth, priority_level, is_enabled) VALUES
('sascha', 'HIIT', 'HIIT vs MICE Detailanalyse', '["HIIT vs MICE", "14.7%", "7.9%", "16 Wochen", "Vergleichsstudie"]', 'expert', 3, true),
('sascha', 'HIIT', 'EPOC Detailmechanismen', '["EPOC", "48h", "Afterburn", "≥90% 1RM", "Mehrgelenk"]', 'advanced', 2, true),

('sascha', 'Periodization', 'Automatisierte Periodisierung', '["Smart Periodization", "6 Einheiten", "Automatisierung", "EGYM"]', 'advanced', 2, true),
('sascha', 'Periodization', 'Zyklenhierarchie', '["Makro 3 Monate", "Meso 4-8 Wochen", "Mikro 1 Woche", "Hierarchie"]', 'standard', 1, true),

('sascha', 'Biomechanics', 'FMS Detailanalyse', '["FMS Score 14", "Verletzungsrisiko", "moderate Prädiktion", "Screening"]', 'advanced', 2, true),
('sascha', 'Biomechanics', 'UCM Bewegungsanalyse', '["UCM", "Variabilität", "motorische Qualität", "Individualisierung"]', 'standard', 1, true),

('sascha', 'Performance Monitoring', 'Krafttest Protokolle', '["1RM", "Push-up Tests", "4 Wochen", "Progress Tracking"]', 'advanced', 2, true),
('sascha', 'Performance Monitoring', 'VO2max Testing Detailliert', '["4x4 Test", "6 Wochen", "Goldstandard", "Progress"]', 'advanced', 2, true),

('sascha', 'Recovery', 'Deload und Schlafoptimierung', '["Deload", "3-4 Wochen", "7h Schlaf", "Regeneration"]', 'advanced', 2, true),

('sascha', 'Nutrition', 'Field Nutrition Strategien', '["16-42% Defizit", "Feldbetrieb", "Rehydrierung", "Protein"]', 'advanced', 2, true),

('sascha', 'Metabolic Conditioning', 'MetCon Circuit Design', '["MetCon", "30-45min", "6-12 Übungen", "Work Capacity"]', 'expert', 3, true),

('sascha', 'Tactical Training', 'ACFT Event Training', '["ACFT", "6 Events", "Combat Fitness", "Zyklus Training"]', 'expert', 3, true),

('sascha', 'Special Forces', 'SEAL Selection Standards', '["Navy SEAL", "55 ml/kg/min", "Schwimmen", "Multi-Block"]', 'expert', 3, true),

('sascha', 'Injury Prevention', 'Screening und Prävention', '["31% Reduktion", "8 Wochen", "Mobility", "FMS", "Screening"]', 'advanced', 2, true);

-- Update pipeline status for sascha with new totals
UPDATE public.coach_pipeline_status 
SET total_knowledge_entries = total_knowledge_entries + 20,
    knowledge_completion_rate = 90.0,
    pipeline_health_score = 98.0,
    current_topic_focus = 'Advanced Military Training & Specialized Topics',
    updated_at = now()
WHERE coach_id = 'sascha';