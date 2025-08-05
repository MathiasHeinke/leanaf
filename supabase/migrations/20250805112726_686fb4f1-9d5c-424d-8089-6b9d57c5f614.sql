-- Insert Kai's comprehensive knowledge base entries with corrected array format
INSERT INTO coach_knowledge_base (title, expertise_area, knowledge_type, content, coach_id, priority_level, tags, source_url, created_at) VALUES

-- Neuroplasticity & Habit Formation
('Neuroplastizität: Gewohnheiten als Netzwerkstrukturen', 'neuroplasticity', 'science', 
'Gewohnheitsbildung erfolgt durch strukturelle Veränderungen im Verhaltensnetzwerk, nicht durch zwei getrennte Systeme. Wiederholung verstärkt neuronale Verbindungen nach Hebb''scher Regel: ''Neurons that fire together, wire together.'' Durchschnittlich 66 Tage nötig, variiert nach Aufwand. Umsetzung: Beginne mit kleinen, konsistenten Schritten. Kopple neue Routinen an bestehende Trigger (Habit-Stacking). Nutze Multi-Sensorik, Journaling, Visualisierung.', 
'kai', 4, '{"neuroplasticity","habit_formation","brain_networks"}', 'https://www.nature.com/articles/s42003-023-04500-2', NOW()),

('Vier-Stufen-Modell der Gewohnheitsintegration', 'habit_coaching', 'application', 
'Phase 1: Bewusste Steuerung mit viel Energie (Prompt, Tracking-Reminder); Phase 2: Wiederholung, neuroplastische Verstärkung (Routine-Tagebuch führen, Feedback loops); Phase 3: Automatisierung (Routine-Scoring via App); Phase 4: Netzwerkintegration (Social Support, Kontextwechsel prüfen). Umsetzung: Starte mit Mikroroutinen, nutze mobile reminders, etablierkeine Überforderung.', 
'kai', 3, '{"habit_stacking","behavior_change","neural_pathways"}', 'https://neuroscienceschool.com/2025/01/31/breaking-the-21-day-myth', NOW()),

-- HRV & Autonomic Nervous System
('HRV als Biomarker für autonome Regulation', 'hrv_training', 'science', 
'Herzratenvariabilität (HRV) misst die Balance des autonomen Nervensystems, speziell RMSSD als Marker für Vagusaktivität. Hohe HRV = hohe Resilienz + schnellere Erholung. Umsetzung: HRV täglich tracken (Wearable). Messen morgens im Liegen, 5 min. Trends statt Einzelwerte werten.', 
'kai', 4, '{"hrv","autonomic_balance","stress_resilience"}', 'https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2021.657274/full', NOW()),

('HRV-gesteuertes Training: Individualisierte Belastung', 'recovery_optimization', 'application', 
'HRV-geführte Empfehlungen: Normale HRV (Baseline +/-10%) = normales Training; Niedrige HRV (-10 bis -20%) = Regeneration/Niedrigintensität; Stark reduzierte HRV (<-20%) = Pause, neue Belastungsplanung. Umsetzung: Wöchentlicher Schnitt, App-Alarme bei Abweichungen, Trainingslast flexibel anpassen.', 
'kai', 4, '{"hrv_guided_training","recovery","performance_optimization"}', 'https://www.trainingpeaks.com/coach-blog/hrv-guided-training/', NOW()),

('Vagusnerv-Stimulation durch Resonanzatmung', 'vagus_training', 'application', 
'Atme 4-7 Atemzüge/Min (Resonanzfrequenz). Nutze HRV-Biofeedback-Apps (z.B. EliteHRV), 10 Min täglich. Fühle Anspannung - sofort Atmung verlängern. Umsetzung: In Stress-Spikes direkt angewenden, als Morgen/Abend-Ritual, visuelle/auditive Rückmeldung stärken Effekt.', 
'kai', 3, '{"resonance_breathing","vagus_nerve","biofeedback"}', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12082064/', NOW()),

('6-Säulen-HRV-Optimierung', 'hrv_improvement', 'guideline', 
'Tiefenatmung (4-7-8), Meditation, moderates Ausdauertraining, soziale Kontakte, Kälteanwendung, Qualitätsschlaf – kombiniert erhöhen HRV signifikant. Umsetzung: Säulen in Coaching nachverfolgen, Habit-Tracker nutzen, einzelne Schwächen gezielt stärken.', 
'kai', 3, '{"hrv_optimization","lifestyle_intervention","holistic_approach"}', 'https://www.sallyspencerthomas.com/dr-sally-speaks-blog/2023/5/24/6-tips-to-improve-your-heart-rate-variability-hrv-vagal-tone-and-stress-management', NOW()),

-- Sleep Optimization & CBT-I
('Optimale Schlafdauer: 7 Stunden für Peak-Performance', 'sleep_optimization', 'science', 
'UK Biobank mit 479.420 Personen: 7 Std. Schlaf sind kognitiv optimal, zu viel/wenig verschlechtert Exekutivfunktionen quadratisch. 6-8 Std. auch physiologisch beste Hirnvolumina. Umsetzung: Schlaf-fenster 22:30-6:30, Schlafzimmer dunkel/kühl, Blaulicht meiden, App-Reminder, individuelle Chronotypen beachten.', 
'kai', 4, '{"sleep_duration","cognitive_performance","brain_volume"}', 'https://www.nature.com/articles/s42003-022-03123-3', NOW()),

('CBT-I: Evidenzbasierte Insomnie-Behandlung', 'sleep_therapy', 'application', 
'CBT-I Hauptkomponenten: Bettzeitbegrenzung, Stimulus-Kontrolle (nur Schlaf im Bett), Schlafhygiene-Regeln, Kognitive Reframing, Entspannungstechniken. 6-8 Sitzungen = Wirkstärke wie Medikamente, aber nachhaltiger. Umsetzung: Schlafprotokoll führen, klassische Abendroutinen aufbauen, Apps wie Sleepio nutzen.', 
'kai', 4, '{"cbt_i","sleep_restriction","stimulus_control"}', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6796223/', NOW()),

('Chronotyp-basierte Schlafoptimierung', 'circadian_optimization', 'application', 
'Kenne deinen Chronotyp (Test: Horne-Ostberg-MEQ). Morgentyp = Training/Vordenken früh, Spättyp = ab 15 Uhr. Licht-Therapie und Melatonin-Zeitpunkt helfen anpassen. Umsetzung: Apps, die Chronotyp scoren, Zeitmanagement individuell anpassen.', 
'kai', 3, '{"chronotype","circadian_rhythm","meq_assessment"}', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9399511/', NOW()),

('Schlaf als kognitiver Enhancer', 'cognitive_enhancement', 'science', 
'Schlaf fördert Gedächtniskonsolidierung – Slow-Wave-Sleep stärkt Fakten, REM fördert Skills. Schlafentzugsstudien (Frontiers) zeigen exponentielle Leistungsreduktion bei <6h/Nacht. Umsetzung: Für intensives Lernen/Sport explizite Schlaf-Checks, App-Reminder für Schlaf-Review.', 
'kai', 3, '{"sleep_enhancement","memory_consolidation","cognitive_recovery"}', 'https://www.frontiersin.org/journals/systems-neuroscience/articles/10.3389/fnsys.2014.00046/full', NOW()),

('Kreatin bei Schlafentzug: Akute kognitive Verbesserung', 'nootropics', 'emerging', 
'Single-Dosis Kreatin (0,35g/kg KG) verbessert Processing-Speed und Kurzzeitgedächtnis nach 3-9h Schlafmangel. Einsatz: Nur für akute Nächte, nicht als Dauertool! Umsetzung: Gezielt z.B. vor Prüfungen, intensive Tage.', 
'kai', 2, '{"creatine","sleep_deprivation","cognitive_enhancement"}', 'https://www.nature.com/articles/s41598-024-54249-9', NOW()),

-- Stress Resilience & Mental Health
('Resilience to Stress Index: Physiologische Messung', 'stress_resilience', 'science', 
'Resilienz = Erholung zu Stress-Ratio (ΔR/ΔS, gemessen durch Hautleitwert, EMG, BVP, Atemrate, Temperatur). RSI nahe 1 = optimal, je negativer desto schlechter. Umsetzung: Biofeedbacksätze nutzen, nach mentalem/physischem Stress 5-10 Min HRV/EMG messen, Anpassung der Stressfaktoren notieren.', 
'kai', 3, '{"resilience_measurement","physiological_markers","stress_recovery"}', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8705801/', NOW()),

('Resilience-Skalen: Connor-Davidson & RSA', 'resilience_assessment', 'application', 
'CD-RISC: 25 Items, Skala 1-5, misst Anpassungsfähigkeit, Optimismus, Selbstwirksamkeit; RSA: 6 Unterbereiche, u.a. Selbstwahrnehmung, soziale Unterstützung. Anwendung: Test regelmäßig im Coaching wiederholen, Klartextauswertung in App zeigen.', 
'kai', 2, '{"cd_risc","rsa_scale","resilience_measurement"}', 'https://positivepsychology.com/3-resilience-scales/', NOW()),

('HRV-Biofeedback bei Depression und Angst', 'mental_health', 'clinical', 
'8-12 Wochen HRV-Biofeedback: -30% Depressionsscore, -25% Angstsymptome (Signifikanz p<0,01). Mechanismus: Vagusaktivierung dämpft Cortisol und Entzündungsmarker. Umsetzung: HRV-Biofeedback (App, Wearable) als Coachingmodul etablieren, Stimmungsscores protokollieren.', 
'kai', 3, '{"hrv_biofeedback","depression","anxiety_treatment"}', 'https://www.nature.com/articles/s41598-022-22303-z', NOW()),

-- Integral Theory & Holistic Transformation  
('Vier-Quadranten-Transformation nach Wilber', 'integral_coaching', 'application', 
'Transformation nur nachhaltig, wenn alle vier Perspektiven gemeinsam adressiert werden: ICH (Mindset), ES (Verhalten), WIR (Kultur), SIE (Systeme). Jede Intervention beeinflusst alle Ebenen. Umsetzung: Zu jedem Ziel/Mangel in Coaching alle Quadranten abfragen, Map in App führen, Fortschritt multidimensional tracken.', 
'kai', 4, '{"four_quadrants","integral_theory","holistic_transformation"}', 'https://integrallife.com/four-quadrants/', NOW()),

('Integral Life Practice: Systematische Entwicklung', 'integral_practice', 'methodology', 
'ILP verbindet Körper (Training, Ernährung, Schlaf), Geist (Meditation/Journaling), Schatten (Trauma-Integration), Ethik (Beziehungen/Service). Umsetzung: In der App täglich 20–60 Min Zeitblock für reflexive Praxis routinieren, wöchentlich Rückblick/Auswertung.', 
'kai', 4, '{"ilp","integral_development","daily_practice"}', 'https://foresightinternational.com.au/wp-content/uploads/2018/10/Intro_Integral_Theory.pdf', NOW());