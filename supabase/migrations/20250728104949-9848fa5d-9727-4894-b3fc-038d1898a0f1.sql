-- Dr. Vita Femina Knowledge Base - Neue Einträge (ohne Conflict-Handling)

INSERT INTO public.coach_knowledge_base (
  title, expertise_area, knowledge_type, content, coach_id, priority_level, tags, created_at
) VALUES 

-- Zyklusphasen-spezifische Hormonoptimierung
(
  'Zyklusphasen-spezifische Hormonoptimierung',
  'female_cycle_optimization',
  'protocol',
  'Menstruationszyklus-synchronisierte Ernährung und Training: Follikelphase (Tag 1-14): Höhere Kohlenhydrate, intensive Krafttraining nutzt Estrogen-Peak. Lutealphase (Tag 15-28): Mehr gesunde Fette, moderate Intensität respektiert Progesteroneinfluss. Eisenreiche Nahrung während Menstruation: Spinat, Linsen, mageres Fleisch.',
  'dr_vita_femina',
  1,
  ARRAY['menstrual_cycle', 'estrogen', 'progesterone', 'cycle_syncing', 'phase_training'],
  '2025-07-28T12:00:00+02:00'
),

-- Perimenopause: Hormonelle Übergangszeit meistern
(
  'Perimenopause: Hormonelle Übergangszeit meistern',
  'female_hormone_aging',
  'application',
  'Perimenopause (45-55J): Estrogenschwankungen führen zu unregelmäßigen Zyklen, Hitzewallungen, Schlafstörungen. Interventionen: Mediterrane Diät reduziert Symptome um 30%, Krafttraining 3x/Woche erhält Knochendichte, Phytoestrogene (Soja 40-60mg Isoflavone/Tag) mildern Beschwerden. Ballaststoffe ≥30g/Tag für Estrogen-Clearance.',
  'dr_vita_femina',
  1,
  ARRAY['perimenopause', 'estrogen_fluctuation', 'mediterranean_diet', 'phytoestrogens', 'bone_density'],
  '2025-07-28T12:00:00+02:00'
),

-- Estrogen-Metabolismus durch Ernährung regulieren
(
  'Estrogen-Metabolismus durch Ernährung regulieren',
  'female_nutrition_hormones',
  'application',
  'Estrogen-Metabolismus optimieren: Kreuzblütler (Brokkoli, Kohl) liefern DIM und I3C für gesunde Estrogen-Verstoffwechselung. Ballaststoffe binden überschüssiges Estrogen im Darm. Omega-3 (2g EPA+DHA) reduziert Entzündungen. B-Vitamine (B6 50-100mg) unterstützen Estrogen-Konjugation. Probiotika fördern Estrobolom-Balance.',
  'dr_vita_femina',
  2,
  ARRAY['estrogen_metabolism', 'cruciferous_vegetables', 'DIM', 'fiber', 'omega_3', 'B_vitamins'],
  '2025-07-28T12:00:00+02:00'
),

-- Exercise-induzierte Hormonresponse bei Frauen
(
  'Exercise-induzierte Hormonresponse bei Frauen',
  'female_exercise_hormones',
  'science',
  'Training beeinflusst weibliche Hormone zyklusphasenabhängig: Akutes Exercise steigert Estradiol +13.5%, Progesteron +37.6% bei untrainierten Frauen. Übermäßiges Training kann Amenorrhoe verursachen (Female Athlete Triad). Optimaler Bereich: 150-300min moderate Intensität/Woche + 2x Krafttraining. HRV-Monitoring für Belastungssteuerung.',
  'dr_vita_femina',
  2,
  ARRAY['exercise_hormones', 'estradiol', 'progesterone', 'female_athlete_triad', 'HRV', 'training_load'],
  '2025-07-28T12:00:00+02:00'
),

-- Menopause: Hormonersatztherapie vs. Lifestyle
(
  'Menopause: Hormonersatztherapie vs. Lifestyle',
  'female_hormone_aging',
  'guideline',
  'Postmenopause: Estradiol <20pg/mL, FSH >50mU/mL markieren Ovarienfunktions-Ende. HRT kann biologisches Altern verlangsamen, aber Lifestyle-First-Ansatz: Krafttraining für BMD, mediterrane Diät, Stressmanagement. HRT-Timing wichtig: innerhalb 10 Jahre post-Menopause optimal. Bioidentische Hormone bevorzugt.',
  'dr_vita_femina',
  1,
  ARRAY['menopause', 'HRT', 'lifestyle_intervention', 'biological_aging', 'bioidentical_hormones'],
  '2025-07-28T12:00:00+02:00'
),

-- Pubertät bis Menopause: Weibliche Hormon-Lebensphasen
(
  'Pubertät bis Menopause: Weibliche Hormon-Lebensphasen',
  'female_hormone_aging',
  'guideline',
  'Weibliche Hormonphasen: Pubertät (8-13J): Calcium/Vitamin D für Peak Bone Mass, ausreichend Kalorien für Menarche. Reproduktive Jahre (15-45J): Zyklus-optimiertes Training, Folsäure, Eisenmonitoring. Perimenopause: Symptom-Management, Knochenerhalt. Postmenopause: Kardiovaskuläre + Knochen-Gesundheit priorisieren.',
  'dr_vita_femina',
  3,
  ARRAY['female_lifecycle', 'puberty', 'reproductive_years', 'menopause', 'bone_health', 'cardiovascular'],
  '2025-07-28T12:00:00+02:00'
),

-- Cortisol und weibliche Hormone: Stress-Management
(
  'Cortisol und weibliche Hormone: Stress-Management',
  'female_hormone_optimization',
  'protocol',
  'Chronischer Stress disruptiert HPG-Achse bei Frauen: Cortisol supprimiert GnRH → oligomenorrhoe/Amenorrhoe. Stress-Interventionen: Mindfulness 20min/Tag reduziert Cortisol um 20%, Yoga verbessert Menstruationsregularität, Ashwagandha normalisiert FSH/LH. Sleep Hygiene essentiell: Melatonin-Produktion korreliert mit reproduktiver Gesundheit.',
  'dr_vita_femina',
  2,
  ARRAY['cortisol', 'stress', 'HPG_axis', 'amenorrhea', 'mindfulness', 'sleep', 'melatonin'],
  '2025-07-28T12:00:00+02:00'
),

-- Hormonelle Verhütung und Performance-Impact
(
  'Hormonelle Verhütung und Performance-Impact',
  'female_hormone_optimization',
  'science',
  'Kombinierte orale Kontrazeptiva (COCs) können VO2max um 5-10% reduzieren und oxidativen Stress erhöhen. Reine Gestagen-Methoden zeigen minimalen Performance-Impact. Überwachung: Performance-Trends 3 Monate nach COC-Start. Bei persistentem Leistungsabfall non-hormonelle Alternativen erwägen. Antioxidantien (Vitamin C 500mg, E 200IU) können oxidative Belastung mindern.',
  'dr_vita_femina',
  3,
  ARRAY['hormonal_contraception', 'performance', 'VO2max', 'oxidative_stress', 'antioxidants'],
  '2025-07-28T12:00:00+02:00'
);