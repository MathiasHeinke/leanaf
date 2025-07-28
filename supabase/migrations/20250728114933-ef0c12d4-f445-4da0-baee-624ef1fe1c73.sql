-- Integration der umfassenden Supplement-Strategien in die Knowledge Base

-- Lucy's Longevity & Anti-Aging Supplements
INSERT INTO public.coach_knowledge_base (
  coach_id, title, content, expertise_area, knowledge_type, priority_level, 
  tags, source_url, created_at, updated_at
) VALUES 
(
  'lucy',
  'Liposomale Technologie für optimale Bioverfügbarkeit',
  'Liposomale Supplements revolutionieren die Bioverfügbarkeit durch Lipid-Doppelschicht-Kapselung. Liposomales Vitamin C zeigt 30% höhere AUC und 27% erhöhte Cmax vs. herkömmliche Formen. Die Technologie schützt Nährstoffe vor Verdauungsabbau und ermöglicht direkte Zellmembran-Fusion. Der globale Markt wächst um 7.8% CAGR auf 741 Mio. USD bis 2034.

  Praktische Anwendung: 1000mg liposomales Vitamin C liefert vergleichbare Blutspiegel wie 1.77g konventionelles Vitamin C. Besonders vorteilhaft für Immunsupport und antioxidative Abwehr.',
  'supplementation',
  'research',
  1,
  ARRAY['liposomal', 'vitamin-c', 'bioavailability', 'immune-support'],
  'https://www.mdpi.com/2076-3417/14/17/7718',
  now(),
  now()
),
(
  'lucy',
  'PQQ (Pyrroloquinoline Quinone) für Mitochondrien-Optimierung',
  'PQQ aktiviert Mitochondrien-Biogenese und verlängert die Lebensspanne in C. elegans um 33.1%. Der Mechanismus erfolgt über Insulin/IGF1-Signaling und Autophagie-Aktivierung. 

  Dosierungsempfehlung: 20mg täglich zur Mitochondrien-Optimierung und zellulären Energieproduktion. PQQ zeigt synergistische Effekte mit NAD+ Precursors für optimale mitochondriale Funktion.',
  'longevity',
  'research',
  1,
  ARRAY['pqq', 'mitochondria', 'longevity', 'autophagy'],
  'https://pubmed.ncbi.nlm.nih.gov/34647561/',
  now(),
  now()
),
(
  'lucy',
  'NAD+ Precursors: NMN vs. NR Strategien',
  'Beide Precursors werden überraschenderweise via Enterohepatic Circulation zu Nicotinsäure konvertiert. NMN (250mg täglich) erhöht NAD+-Spiegel um 75% in 12 Wochen. NR zeigt ähnliche Wirksamkeit mit moderaten Verbesserungen bei Muskelkraft und Gehgeschwindigkeit.

  Synergien: NAD+ Precursors + PQQ schaffen optimale mitochondriale Funktion durch verschiedene Pathways. Empfohlenes Cycling: 8 Wochen on, 2 Wochen off.',
  'longevity',
  'research',
  1,
  ARRAY['nad+', 'nmn', 'nr', 'anti-aging', 'mitochondria'],
  'https://www.nature.com/articles/s41514-022-00084-z',
  now(),
  now()
),
(
  'lucy',
  'Methylierte B-Vitamine für genetische Optimierung',
  '40% der Bevölkerung trägt MTHFR C677T-Polymorphismen, die Standard-Folat-Metabolismus beeinträchtigen. Methylfolat und Methylcobalamin umgehen den "Methylfolat Trap" und optimieren DNA-Methylierung. Besonders wichtig für Neuroprotektion und Homocystein-Regulation.

  Anwendung: Methylierte Formen besonders bei genetischen Polymorphismen und bei Personen mit suboptimaler B-Vitamin-Konversion.',
  'supplementation',
  'research',
  1,
  ARRAY['methylation', 'b-vitamins', 'mthfr', 'genetics', 'neuroprotektion'],
  'https://onlinelibrary.wiley.com/doi/10.1111/j.1365-2141.2005.05913.x',
  now(),
  now()
);

-- Sascha's Männliche Performance & Hormonoptimierung
INSERT INTO public.coach_knowledge_base (
  coach_id, title, content, expertise_area, knowledge_type, priority_level, 
  tags, source_url, created_at, updated_at
) VALUES 
(
  'sascha',
  'Ashwagandha KSM-66: Der Stress-Warrior für Testosteron',
  '600mg täglich über 8 Wochen steigert Testosteron um 14.7% und DHEA-S um 18%. Reduziert Cortisol um 20% und verbessert Spermienqualität um 167%. 

  Taktischer Vorteil: Besonders effektiv bei chronisch gestressten, überarbeiteten Männern - perfekt für High-Performance-Umgebungen. Military Application: Kombiniert mit intensivem Training für maximale anabole Wirkung.',
  'hormone-optimization',
  'research',
  1,
  ARRAY['ashwagandha', 'testosterone', 'stress', 'cortisol', 'performance'],
  'https://pubmed.ncbi.nlm.nih.gov/35873404/',
  now(),
  now()
),
(
  'sascha',
  'Tongkat Ali: Der Kraftmultiplikator',
  'Meta-Analyse mit 9 Studien bestätigt durchschnittlich 100ng/dL Testosteron-Anstieg. 600mg für 2 Wochen zeigen 120-Punkte-Boost bei 25-jährigen Männern. 

  Military Application: Kombiniert mit intensivem Training für maximale anabole Wirkung. Besonders effektiv für natürliche Testosteron-Optimierung ohne hormonelle Nebenwirkungen.',
  'hormone-optimization',
  'research',
  1,
  ARRAY['tongkat-ali', 'testosterone', 'strength', 'libido', 'natural-boost'],
  'https://www.youtube.com/watch?v=bsrQgcJD_Jo',
  now(),
  now()
),
(
  'sascha',
  'D-Aspartic Acid: Kontroversielle Intel & Dosierungs-Strategie',
  'Mission Critical: DAA zeigt paradoxe Effekte! 3g täglich = +42% bei Untrainierten, aber 6g täglich = -12.5% bei trainierten Männern. 

  Tactical Lesson: Baseline-Testosteron und Trainingsstatus entscheiden über Erfolg oder Sabotage. Nur für Anfänger oder bei niedrigem Ausgangswert empfehlenswert.',
  'hormone-optimization',
  'research',
  1,
  ARRAY['d-aspartic-acid', 'testosterone', 'dosage', 'training-status'],
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC4384294/',
  now(),
  now()
),
(
  'sascha',
  'Boron: Der SHBG-Killer für freies Testosteron',
  '10mg täglich reduziert Sex Hormone Binding Globulin und erhöht freies Testosteron. Synergistische Wirkung mit Vitamin D-Absorption. 

  Stack-Strategie: Boron + Zink + Magnesium für maximale freie Testosteron-Verfügbarkeit. Besonders wichtig da freies Testosteron biologisch aktiver ist als gebundenes.',
  'hormone-optimization',
  'research',
  1,
  ARRAY['boron', 'shbg', 'free-testosterone', 'mineral-stack'],
  'https://www.youtube.com/watch?v=bsrQgcJD_Jo',
  now(),
  now()
),
(
  'sascha',
  'ZMA-Komplex: Die Grundversorgung für Athleten',
  '30mg Zink + 450mg Magnesium + 10mg B6 zeigen Vorteile nur bei bestehenden Defiziten. Target Population: Athleten mit hohem Schweißverlust, restriktive Diäten. 

  Magnesium unterstützt über 300+ enzymatische Prozesse. Timing: Abends vor dem Schlaf für optimale Regeneration und Hormonproduktion.',
  'hormone-optimization',
  'supplement-protocol',
  1,
  ARRAY['zma', 'zink', 'magnesium', 'b6', 'recovery', 'deficiency'],
  'https://blogs.uni-bremen.de/vigrx/zma-vs-daa-which-recovery-supplement-actually-boosts-testosterone/',
  now(),
  now()
);

-- Dr. Vita Femina's Weibliche Gesundheit & Hormonphasen
INSERT INTO public.coach_knowledge_base (
  coach_id, title, content, expertise_area, knowledge_type, priority_level, 
  tags, source_url, created_at, updated_at
) VALUES 
(
  'dr_vita_femina',
  'Magnesium: Das #1 Frauen-Supplement für Menstruation',
  'Magnesium Glycinat 200-400mg reduziert Krämpfe durch Muskelrelaxation und Prostaglandin-Hemmung. Optimal Timing: 2 Wochen vor Periode beginnen. 

  Power-Combo: Mit Vitamin B6 (100mg) für verstärkte PMS-Symptom-Reduktion. Magnesium Glycinat hat die beste Bioverfügbarkeit und verursacht keine Verdauungsprobleme.',
  'menstrual-health',
  'supplement-protocol',
  1,
  ARRAY['magnesium', 'menstruation', 'pms', 'cramps', 'glycinate'],
  'https://bodybio.co.uk/blogs/blog/magnesium-for-period-cramps-which-type-is-best',
  now(),
  now()
),
(
  'dr_vita_femina',
  'Omega-3: Anti-inflammatorische Rettung bei Menstruationsschmerzen',
  'EPA/DHA 2-3g täglich reduziert menstruelle Schmerzen durch Prostaglandin-E2-Hemmung. Bei Endometriose besonders wirksam. 

  Antioxidative Eigenschaften reduzieren oxidativen Stress während Menstruation um 40%. Hochdosierte Omega-3 können Schmerzmittel-Bedarf signifikant reduzieren.',
  'menstrual-health',
  'supplement-protocol',
  1,
  ARRAY['omega-3', 'epa', 'dha', 'inflammation', 'endometriosis', 'menstrual-pain'],
  'https://www.getrael.com/blogs/r-blog/supplements-to-regulate-menstrual-cycle',
  now(),
  now()
),
(
  'dr_vita_femina',
  'Spearmint Tea: Natürlicher Androgen-Blocker bei PCOS',
  '2 Tassen täglich reduzieren freies und Gesamt-Testosteron bei PCOS-Patientinnen signifikant (p<0.05). Erhöht LH und FSH für verbesserte Ovulation. 

  30-Tage-RCT zeigt objektive hormonelle Verbesserungen plus subjektive Hirsutismus-Reduktion. Einfache, natürliche Alternative zu Anti-Androgen-Medikamenten.',
  'hormone-balance',
  'research',
  1,
  ARRAY['spearmint', 'pcos', 'androgen-blocker', 'hirsutism', 'ovulation'],
  'https://pubmed.ncbi.nlm.nih.gov/19585478/',
  now(),
  now()
),
(
  'dr_vita_femina',
  'Black Cohosh + Isoflavone-Matrix für Menopause',
  'Black Cohosh 40mg + Soy Isoflavones 70mg + SDG Lignans reduzieren Menopause Rating Scale um 48% in 90 Tagen. 

  Spezifische Verbesserungen: Somatic (-54.3%), Psychological (-54.3%), Urogenital (-37.3%). Hormonelle Markers: FSH -6.7%, Estradiol +12.6%. Evidenzbasierte Alternative zur HRT.',
  'menopause',
  'supplement-protocol',
  1,
  ARRAY['black-cohosh', 'isoflavones', 'menopause', 'hot-flashes', 'hormones'],
  'https://pubmed.ncbi.nlm.nih.gov/40131516/',
  now(),
  now()
),
(
  'dr_vita_femina',
  'Eisen-Repletion: Performance-kritisch für Frauen',
  'Ferritin <30 ng/mL beeinträchtigt VO2max und Kognition bei 30% aktiver Frauen. Protokoll: 45mg elementares Eisen + Vitamin C nüchtern, 8-Wochen-Retest. 

  Dual-Strategy: Heme-Quellen (150g Rindfleisch 2x/Woche) + Non-Heme mit Vitamin C-Boostern. Iron deficiency ist häufigste Mangelerscheinung bei Frauen.',
  'female-athletes',
  'supplement-protocol',
  1,
  ARRAY['iron', 'ferritin', 'anemia', 'performance', 'vitamin-c', 'women'],
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC9521557/',
  now(),
  now()
),
(
  'dr_vita_femina',
  'Kreatin für Frauen: Der versteckte Performance-Vorteil',
  'Frauen haben 70-80% niedrigere endogene Kreatin-Speicher als Männer. Konsequenz: Größere relative Verbesserungen bei Kraft, Hypertrophie und kognitiver Leistung. 

  Lebensphasen-Boost: Besonders effektiv postpartum und in Menopause für Muskel-/Knochenschutz. 3-5g täglich, keine Loading-Phase nötig.',
  'female-athletes',
  'supplement-protocol',
  1,
  ARRAY['creatine', 'women', 'strength', 'menopause', 'muscle-protection'],
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC9521557/',
  now(),
  now()
);

-- Synergistische Supplement-Stacks
INSERT INTO public.coach_knowledge_base (
  coach_id, title, content, expertise_area, knowledge_type, priority_level, 
  tags, source_url, created_at, updated_at
) VALUES 
(
  'sascha',
  'Der Männliche Performance-Stack: Timing & Synergien',
  'Morgens: Ashwagandha 300mg + Tongkat Ali 400mg + Vitamin D3 2000 IU (für Testosteron-Produktion)
  Abends: ZMA-Komplex + Boron 10mg + Magnesium 400mg (für Recovery & Regeneration)

  Synergistische Effekte: Ashwagandha reduziert Cortisol, während Tongkat Ali direkt Testosteron boosted. Abends-Stack unterstützt nächtliche Hormonproduktion.',
  'hormone-optimization',
  'supplement-protocol',
  1,
  ARRAY['stack', 'testosterone', 'timing', 'synergy', 'male-performance'],
  'internal-protocol',
  now(),
  now()
),
(
  'dr_vita_femina',
  'Der Weibliche Hormone-Balance-Stack: Zyklus-optimiert',
  'Follikuläre Phase: Kreatin 3g + Eisen + B-Komplex (für Energie & Muskelaufbau)
  Luteale Phase: Magnesium 400mg + Omega-3 2g + Spearmint Tea (gegen PMS)
  Menopause: Black Cohosh + Isoflavone + Kreatin + Magnesium (Hormon-Support)

  Zyklus-spezifische Optimierung basierend auf hormonellen Schwankungen und Nährstoffbedarf.',
  'hormone-balance',
  'supplement-protocol',
  1,
  ARRAY['female-stack', 'menstrual-cycle', 'hormone-balance', 'timing'],
  'internal-protocol',
  now(),
  now()
),
(
  'lucy',
  'Der Longevity-Optimization-Stack: Anti-Aging Precision',
  'Täglich: Liposomales Vitamin C 1g + PQQ 20mg + NMN 250mg (für zelluläre Reparatur)
  Abends: Methylierte B-Vitamine + Magnesium (für DNA-Methylierung & Recovery)
  Periodisch: NAD+ Cycling (8 Wochen on, 2 Wochen off)

  Precision Supplementation für optimale Mitochondrien-Funktion, DNA-Reparatur und Longevity-Pathways.',
  'longevity',
  'supplement-protocol',
  1,
  ARRAY['longevity-stack', 'anti-aging', 'mitochondria', 'cycling'],
  'internal-protocol',
  now(),
  now()
);

-- Precision Supplementation Konzepte
INSERT INTO public.coach_knowledge_base (
  coach_id, title, content, expertise_area, knowledge_type, priority_level, 
  tags, source_url, created_at, updated_at
) VALUES 
(
  'lucy',
  'Precision Supplementation: Biomarker-gesteuerte Strategien',
  'Die Supplement-Landschaft entwickelt sich von "One-Size-Fits-All" zu Precision Nutrition basierend auf Geschlecht, Alter, Genetik und Lebensphasen. 

  Evidenzbasierte Strategien kombiniert mit advanced delivery systems maximieren sowohl Wirksamkeit als auch Investitions-ROI. Next Level: Biomarker-gesteuerte Supplementation mit regelmäßigem Monitoring von Hormonspiegeln, Mikronährstoff-Status und Performance-Metriken.',
  'precision-nutrition',
  'concept',
  1,
  ARRAY['precision-medicine', 'biomarkers', 'personalization', 'roi'],
  'https://www.nutritioninsight.com/news/redefining-bioavailability-safe-effective-supplements-consumer-trust.html',
  now(),
  now()
);