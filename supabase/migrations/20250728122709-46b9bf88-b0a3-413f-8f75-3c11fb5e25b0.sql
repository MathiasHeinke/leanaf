-- Bodybuilding/Pre-Workout Supplement-Erweiterung
-- 12 neue evidenzbasierte Supplement-Einträge

-- Kai - Kognitive Performance Supplements (3 Einträge)
INSERT INTO public.coach_knowledge_base (coach_id, expertise_area, knowledge_type, title, content, tags, priority_level) VALUES

('kai', 'mental-performance', 'supplement', 'Alpha-GPC - Kognitive Performance & Fokus-Booster',
'Alpha-GPC ist die bioaktivste Form von Cholin für kognitive Enhancement. **Evidenzbasierte Dosierung:** 300-600mg 58 Minuten vor mentaler Anforderung. **Mechanismus:** Überlegene Blut-Hirn-Schranken-Passage, Acetylcholin-Synthese-Boost, Growth-Hormone-Freisetzung +290%. **Kognitive Effekte:** Signifikante Stroop-Test-Verbesserungen, erhöhte Reaktionszeit, verbesserte Arbeitsgedächtnis-Kapazität. **Peak-Plasma:** 58 Minuten - ideal für Pre-Workout/Pre-Study-Timing. **Dosierung:** 600mg für maximale kognitive Benefits, 300mg für tägliche Maintenance. **Evidenz:** Überlegene Wirksamkeit vs. Standard-Cholin-Formen.',
ARRAY['alpha-gpc', 'choline', 'cognitive-enhancement', 'focus', 'pre-workout'], 1),

('kai', 'mental-performance', 'supplement', 'L-Tyrosin - Stress-Resilienz & Mentale Klarheit',
'L-Tyrosin ist ein Aminosäure-Precursor für Dopamin und Noradrenalin, essentiell für mentale Performance unter Stress. **Evidenzbasierte Dosierung:** 500-2000mg nüchtern, 60min vor Stressor. **Mechanismus:** Catecholamin-Synthese-Support, Dopamin/Noradrenalin-Replenishment unter Stress-Depletion. **Stress-Benefits:** Erhaltung kognitiver Funktion bei Schlafmangel, Kälte, Multi-Tasking. **Timing:** Nüchtern für optimale Absorption, Konkurrenz mit anderen Aminosäuren vermeiden. **Stacking:** Synergistisch mit Alpha-GPC für umfassendes kognitives Enhancement. **Evidenz:** Robust für akute Stress-Situationen, limitiert für chronische Supplementation.',
ARRAY['l-tyrosine', 'dopamine', 'stress-resilience', 'cognitive-function', 'neurotransmitter'], 1),

('kai', 'mental-performance', 'supplement', 'Huperzin-A - Acetylcholin-Schutz & Neuroprotektion',
'Huperzin-A ist ein potenter Acetylcholinesterase-Inhibitor für nachhaltiges kognitives Enhancement. **Evidenzbasierte Dosierung:** 50-200µg täglich, zyklisch (4 Wochen on, 1 Woche off). **Mechanismus:** Reversible AChE-Hemmung, verlängerte Acetylcholin-Verfügbarkeit, neuroprotektive Eigenschaften. **Kognitive Effekte:** Verbesserte Gedächtniskonsolidierung, erhöhte Lernkapazität, Schutz vor kognitiver Degeneration. **Zyklus-Rationale:** Verhindert Toleranz-Entwicklung und Rezeptor-Downregulation. **Synergie:** Verstärkt Alpha-GPC-Effekte durch verlängerte ACh-Halbwertszeit. **Safety:** Niedrige Dosierung kritisch, potente bioaktive Substanz.',
ARRAY['huperzine-a', 'acetylcholinesterase', 'memory', 'neuroprotection', 'learning'], 1),

-- Sascha - Performance Supplements (4 Einträge)
('sascha', 'training', 'supplement', 'Creatin Hochdosis-Protokoll - Neuroprotektion & Kraft-Maximum',
'Hochdosis-Creatin (20g) zeigt revolutionäre neuroprotektive Effekte zusätzlich zu Standard-Kraft-Benefits. **Evidenzbasierte Dosierung:** 20g täglich für kognitive Benefits, 5g für Kraft-Maintenance. **Neuroprotektion:** 33% erhöhte Überlebensrate bei Hypoxie, verbesserte Kognition bei Schlafmangel, Schutz vor TBI. **Kraft-Performance:** +5-15% bei Power-Übungen, verbesserte Wiederholungsleistung. **Dosierungs-Strategie:** 4x5g über den Tag verteilt oder 2x10g für bessere Compliance. **Neue Forschung:** Crossing Blood-Brain-Barrier für direkte zerebrale ATP-Unterstützung. **Safety:** Erhöhte Flüssigkeitsaufnahme bei 20g-Protokoll essentiell.',
ARRAY['creatine-high-dose', 'neuroprotection', 'cognitive-function', 'strength', 'atp'], 1),

('sascha', 'training', 'supplement', 'Agmatin Sulfat - Nitric-Oxide Synergist & Pump-Enhancer',
'Agmatin moduliert NO-Synthase und verstärkt Citrullin/Arginin-Effekte für superior Pumps. **Evidenzbasierte Dosierung:** 500-1000mg 30min pre-workout, nüchtern. **Mechanismus:** NOS-Modulation (nicht direkte NO-Produktion), synergistische Citrullin-Verstärkung, Arginase-Hemmung. **Pump-Enhancement:** Verlängerte NO-Verfügbarkeit, verbesserte Vaskulärität, synergistische Wirkung mit L-Citrullin. **Timing:** Pre-Workout auf nüchternen Magen für maximale Absorption. **Stacking:** Kombiniert mit 6-8g L-Citrullin für Pump-Maximum. **Zusatz-Benefits:** Potentielle neuroprotektive und analgetische Eigenschaften.',
ARRAY['agmatine-sulfate', 'nitric-oxide', 'pump', 'vasodilation', 'pre-workout'], 1),

('sascha', 'training', 'supplement', 'HydroPrime® Glycerol - Hyperhydration & Ausdauer-Boost',
'HydroPrime® ist die fortschrittlichste Glycerol-Form mit 65% Yield ohne Klumpenbildung. **Evidenzbasierte Dosierung:** 2-3g 60-90min pre-workout mit 500-750ml Wasser. **Technologie:** 65% Glycerol-Yield vs. 10-25% traditioneller Formen, stabiles Pulver ohne Verklumpung. **Hyperhydration:** +1 Liter intrazelluläre Wasserbindung, 24% Ausdauer-Steigerung, reduzierte Dehydration. **Performance-Effekte:** Verbesserte Thermoregulation, erhöhtes Blutvolumen, sustained Pumps. **Timing:** 60-90min pre-workout für optimale Zell-Hydration. **Innovation:** Revolutioniert traditionelle Glycerol-Supplementation durch überlegene Stabilität.',
ARRAY['hydroprime-glycerol', 'hyperhydration', 'endurance', 'cell-volume', 'pump'], 1),

('sascha', 'training', 'supplement', 'Beta-Alanin Optimierung - pH-Puffer & HIIT-Performance',
'Beta-Alanin ist der wissenschaftlich validierte Standard für muskuläre Ausdauer-Steigerung. **Evidenzbasierte Dosierung:** 3.2-6.4g täglich, aufgeteilt auf 800mg-Dosen alle 3-4h. **Mechanismus:** Carnosin-Synthese-Precursor, intramuskuläre pH-Pufferung bei anaerober Glykolyse. **Performance-Fenster:** 1-4 Minuten High-Intensity-Exercis, wiederholte Sprints, HIIT-Sessions. **Loading-Protokoll:** 4-6 Wochen für maximale Carnosin-Sättigung, Maintenance mit 3.2g. **Parästhesie-Management:** SR-Formulierung oder geteilte Dosen reduzieren Kribbeln. **Evidenz:** Konsistente +2-5% Performance-Steigerung in anaeroben Bereichen.',
ARRAY['beta-alanine-optimized', 'carnosine', 'muscular-endurance', 'hiit', 'anaerobic'], 1),

-- Lucy - Stoffwechsel & Ernährungs-Supplements (4 Einträge)
('lucy', 'nutrition', 'supplement', 'Synephrin - Thermogenese ohne Stimulation',
'Synephrin ist ein β3-selektiver Adrenozeptor-Agonist für sichere thermogene Wirkung ohne Herzfrequenz-Erhöhung. **Evidenzbasierte Dosierung:** 10-20mg dreimal täglich mit Mahlzeiten. **Mechanismus:** β3-selektive Aktivierung, erhöhte Lipolyse ohne α1/β1-Stimulation, +65-183 kcal Stoffwechsel-Boost. **Safety-Profil:** Keine Herzfrequenz-Erhöhung, sicherer Ephedrin-Ersatz, gut verträglich. **Synergien:** +30% Wirkung mit Naringin/Hesperidin, verstärkt durch Koffein. **Timing:** Mit Mahlzeiten für optimale Absorption und GI-Toleranz. **Zielgruppe:** Sicherer Fat-Burner für stimulantien-sensitive Personen.',
ARRAY['synephrine', 'thermogenesis', 'fat-burning', 'beta3-agonist', 'ephedrine-alternative'], 1),

('lucy', 'nutrition', 'supplement', 'EGCG - Grüntee-Catechin für Fettoxidation',
'EGCG (Epigallocatechingallat) ist der bioaktive Hauptbestandteil von Grüntee für Stoffwechsel-Enhancement. **Evidenzbasierte Dosierung:** 300-500mg zwischen Mahlzeiten, standardisiert auf 95% EGCG. **Mechanismus:** Catechol-O-Methyltransferase-Hemmung, verlängerte Noradrenalin-Wirkung, erhöhte Fettoxidation +17%. **Fat-Burning:** Synergistisch mit Koffein (+4% zusätzliche Fettverbrennung), thermogene Wirkung ohne Stimulation. **Timing:** Zwischen Mahlzeiten für optimale Absorption, Milchproteine reduzieren Bioverfügbarkeit. **Zusatz-Benefits:** Antioxidative Wirkung, Insulinsensitivität-Verbesserung, kardiovaskulärer Schutz. **Stacking:** Kombiniert mit Synephrin für thermogene Synergie.',
ARRAY['egcg', 'green-tea', 'fat-oxidation', 'metabolism', 'catechins'], 1),

('lucy', 'nutrition', 'supplement', 'Taurin - Zellvolumen & Hydration-Optimierung',
'Taurin ist eine semi-essentielle Aminosäure für Zellvolumen, Hydration und kardiovaskuläre Funktion. **Evidenzbasierte Dosierung:** 1-3g täglich, aufgeteilt auf 2-3 Dosen mit Mahlzeiten. **Mechanismus:** Osmoregulation, Zellmembran-Stabilisierung, Calcium-Homöostase, antioxidative Eigenschaften. **Hydration-Benefits:** Verbesserte intrazelluläre Wasserbindung, erhöhte Elektrolyt-Balance, reduzierte Dehydration. **Performance-Effekte:** Enhanced Ausdauer, reduzierte Muskelschäden, verbesserte Recovery. **Timing:** Mit Elektrolyten post-workout oder bei heißem Wetter. **Safety:** Sehr gut verträglich, natürlich in Herzmuskel hochkonzentriert.',
ARRAY['taurine', 'cell-volume', 'hydration', 'electrolyte-balance', 'cardiovascular'], 1),

('lucy', 'nutrition', 'supplement', 'TMG (Betain) - Methylierung & Power-Output',
'TMG (Trimethylglycin/Betain) unterstützt Methylierung und zeigt signifikante Power-Output-Steigerungen. **Evidenzbasierte Dosierung:** 1.25-2.5g täglich, aufgeteilt auf 2 Dosen mit Mahlzeiten. **Mechanismus:** Methyl-Donor für Homocystein-Recycling, Kreatin-Synthese-Support, osmolytische Eigenschaften. **Performance-Benefits:** +25% Power-Output-Steigerung, verbesserte Kraft-Ausdauer, erhöhte Training-Volume-Tolerance. **Methylierung:** Unterstützt SAMe-Zyklus, reduziert Homocystein, fördert Neurotransmitter-Synthese. **Timing:** Mit protein-reichen Mahlzeiten für synergistische Methionin-Unterstützung. **Evidenz:** Konsistente Kraft-Benefits bei 6+ Wochen Supplementation.',
ARRAY['tmg-betaine', 'methylation', 'power-output', 'creatine-synthesis', 'homocysteine'], 1),

-- Markus Rühl - Entertainment Factor (1 Eintrag)
('markus-ruehl', 'motivation', 'supplement', 'PEA - Das Schokoladen-Molekül für Euphorie',
'Phenylethylamin (PEA) ist das "Schokoladen-Molekül" für kurzfristige Euphorie und Motivation-Boost. **Evidenzbasierte Dosierung:** 100-500mg 30min pre-workout, am besten mit MAO-B-Inhibitor. **Mechanismus:** Dopamin/Noradrenalin-Freisetzung, "Verliebtheitsgefühl"-Simulation, schnelle aber kurze Wirkung (5-10min). **Euphorie-Effekt:** Intensiver aber kurzer Motivations-Boost, verbesserte Stimmung, erhöhte Fokus-Intensität. **Limitation:** Sehr kurze Halbwertszeit durch MAO-B-Abbau, benötigt Timing-Präzision. **Markus-Style:** "Das ist das Gefühl wenn du die erste Wiederholung machst und weißt: HEUTE WIRD ZERSTÖRT!" **Enhancement:** Kombiniert mit Hordenin für verlängerte Wirkdauer.',
ARRAY['pea-phenylethylamine', 'euphoria', 'chocolate-molecule', 'motivation', 'dopamine'], 1);