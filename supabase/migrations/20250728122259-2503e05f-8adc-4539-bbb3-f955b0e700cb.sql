-- Integration des vollständigen Supplement-Kompendiums in die Coach Knowledge Base
-- 22 evidenzbasierte Supplement-Einträge für alle Coaches

-- Universal Supplements (alle Coaches)
INSERT INTO public.coach_knowledge_base (coach_id, expertise_area, knowledge_type, title, content, tags, priority_level) VALUES
('universal', 'nutrition', 'supplement', 'Vitamin D3 - Universeller Gesundheitsbaustein',
'Vitamin D3 ist essentiell für Knochen-, Immun- und Muskelgesundheit. **Evidenzbasierte Dosierung:** 1.000-2.000 IU täglich bei Status <30 ng/mL. **Mechanismus:** Reguliert Calcium-Absorption, unterstützt Proteinsynthese, moduliert Immunfunktion. **Timing:** Mit fettreicher Mahlzeit für optimale Absorption. **Synergien:** Verstärkt mit Vitamin K2 und Magnesium. **Safety:** Lab-Monitoring empfohlen (25-OH-Vitamin D). Alle Coaches nutzen dies als Basis-Screening für Nutzer-Gesundheit.', 
ARRAY['vitamin-d', 'bone-health', 'immune-system', 'muscle-health', 'universal'], 1),

('universal', 'nutrition', 'supplement', 'Omega-3 EPA/DHA - Entzündungskontrolle & Zellschutz',
'Omega-3-Fettsäuren (EPA/DHA) sind kritisch für Entzündungskontrolle und Zellmembran-Gesundheit. **Evidenzbasierte Dosierung:** 2-3g täglich EPA+DHA kombiniert. **Mechanismus:** Hemmt pro-inflammatorische Eicosanoide, fördert Resolvin-Bildung, stabilisiert Zellmembranen. **Timing:** Mit Mahlzeiten, aufgeteilt auf 2-3 Dosen. **Synergien:** Verstärkt Astaxanthin-Wirkung, balanciert Omega-6-Verhältnis. **Safety:** Erhöht Blutungsrisiko bei >3g/Tag. Alle Coaches empfehlen dies für Regeneration und Langzeit-Gesundheit.',
ARRAY['omega-3', 'anti-inflammatory', 'heart-health', 'brain-health', 'universal'], 1),

-- Performance Supplements (Coach Sascha)
('sascha', 'training', 'supplement', 'Creatin Monohydrat - Kraft & Power Maximierung',
'Creatin Monohydrat ist der Gold-Standard für Kraft- und Power-Steigerung. **Evidenzbasierte Dosierung:** 3-5g täglich dauerhaft oder 20g Loading-Phase 5 Tage. **Mechanismus:** Regeneriert ATP via Phosphokreatin-System, erhöht intramuskuläre Kreatinphosphat-Speicher. **Leistungssteigerung:** +5-15% bei Kraft/Power-Übungen, verbesserte Wiederholungsleistung. **Timing:** Post-Workout bevorzugt, aber Timing sekundär. **Nebenwirkungen:** Wasserbindung +1-2kg, erfordert ausreichende Hydration. **Evidenz:** Höchstes Evidenzlevel, IOC-Safe-List.',
ARRAY['creatine', 'strength', 'power', 'atp', 'performance'], 1),

('sascha', 'training', 'supplement', 'Beta-Alanin - Muskuläre Ausdauer & pH-Puffer',
'Beta-Alanin erhöht intramuskuläre Carnosin-Konzentration für bessere pH-Pufferung. **Evidenzbasierte Dosierung:** 4-6g täglich ≥4 Wochen, geteilte Dosen. **Mechanismus:** Carnosin-Synthese-Precursor, puffert H+-Ionen bei anaerober Glykolyse. **Leistungsbereich:** 1-4 Minuten High-Intensity-Intervalle. **Timing:** 2g morgens, 2g pre-workout, 2g abends. **Nebenwirkung:** Parästhesie (Kribbeln) → SR-Form wählen. **Evidenz:** Hoch, besonders für wiederholte Sprints und HIIT.',
ARRAY['beta-alanine', 'muscular-endurance', 'hiit', 'anaerobic', 'performance'], 1),

('sascha', 'training', 'supplement', 'HMB (β-Hydroxy-β-Methylbutyrat) - Anti-Katabolikum',
'HMB wirkt anti-katabolisch und erhält Muskelmasse in Cutting-Phasen. **Evidenzbasierte Dosierung:** 3g täglich ≥12 Wochen, aufgeteilt auf 3x1g. **Mechanismus:** Leucin-Metabolit, hemmt Proteolyse via mTOR-Pfad, reduziert Muskelschaden-Marker. **Hauptnutzen:** Kraft-Erhalt bei Senioren (+5-10%), DOMS-Reduktion, schnellere Recovery. **Timing:** Mit Mahlzeiten für bessere Absorption. **Evidenz:** Mittel, besonders wirksam in Defizit-Phasen und bei älteren Athleten.',
ARRAY['hmb', 'anti-catabolic', 'muscle-preservation', 'cutting', 'recovery'], 1),

('sascha', 'training', 'supplement', 'Performance-Stack - Sascha Tagesprotokoll',
'Optimiertes Tages-Supplement-Protokoll für maximale Performance-Steigerung. **Morgens 07:00:** Creatin 5g + Beta-Alanin 2g. **Pre-Workout 17:00:** Beta-Alanin 2g + Rote-Beete-Nitrat 600mg NO₃⁻ (2h vor HIIT). **Post-Workout:** Whey 25g + HMB 1g + CoQ10 100mg. **Abends 22:00:** ZMA (Magnesium 400mg + Zink 10mg + B6 30mg). **Synergien:** Creatin+HMB für Kraft+Erhalt, Beta-Alanin+Nitrate für Ausdauer, ZMA für Recovery. **Timing-Rationale:** Maximiert Absorption und Wirkfenster.',
ARRAY['performance-stack', 'protocol', 'timing', 'synergy', 'sascha'], 1),

-- Sleep & Recovery Supplements (Coach Kai)
('kai', 'sleep', 'supplement', 'Magnesium - Schlafqualität & Stressmanagement',
'Magnesium ist essentiell für Schlafqualität und Stress-Resilienz. **Evidenzbasierte Dosierung:** 200-400mg abends (Citrat/Glycinat-Form). **Mechanismus:** GABA-Rezeptor-Modulation, NMDA-Antagonismus, Muskelrelaxation. **Schlafeffekte:** Verkürzte Einschlafzeit, tiefere Schlafphasen, reduziertes nächtliches Erwachen. **Synergien:** Verstärkt Melatonin- und B6-Wirkung. **Timing:** 60-90min vor Bettzeit. **Safety:** Beginn mit niedriger Dosis, GI-Toleranz beachten.',
ARRAY['magnesium', 'sleep-quality', 'stress', 'gaba', 'relaxation'], 1),

('kai', 'sleep', 'supplement', 'Melatonin - Circadianer Rhythmus-Reset',
'Melatonin reguliert den natürlichen Schlaf-Wach-Rhythmus. **Evidenzbasierte Dosierung:** 0.3-2mg 60min vor Bettzeit. **Mechanismus:** MT1/MT2-Rezeptor-Agonist, synchronisiert SCN (circadiane Uhr). **Wirkung:** Einschlafzeit -8-15min, besonders bei Jet-Lag und Schichtarbeit. **Timing:** Kritisch - exakt 60min vor gewünschter Schlafzeit. **Safety:** Nicht bei Autoimmunerkrankungen, niedrigste effektive Dosis verwenden. **Evidenz:** Hoch für Circadian-Störungen.',
ARRAY['melatonin', 'circadian-rhythm', 'jet-lag', 'sleep-onset', 'hormone'], 1),

('kai', 'mental-performance', 'supplement', 'L-Theanin - Fokus ohne Sedierung',
'L-Theanin fördert entspannte Aufmerksamkeit ohne Müdigkeit. **Evidenzbasierte Dosierung:** 100-200mg (mit/ohne Koffein). **Mechanismus:** Erhöht α-Wellen-Aktivität, moduliert GABA/Glutamat-Balance, reduziert Cortisol. **Effekte:** Angst-Reduktion ohne Sedierung, verbesserte Fokus-Qualität. **Koffein-Synergie:** 100mg L-Theanin + 50mg Koffein = "Flow-State" ohne Jitter. **Timing:** 30-60min vor mentaler Anforderung. **Evidenz:** Mittel für Angst-Reduktion und kognitive Performance.',
ARRAY['l-theanine', 'focus', 'anxiety', 'alpha-waves', 'nootropic'], 1),

('kai', 'recovery', 'supplement', 'Ashwagandha - Adaptogen für Cortisol & Testosteron',
'Ashwagandha ist ein potentes Adaptogen für Stress-Resilienz und hormonelle Balance. **Evidenzbasierte Dosierung:** 300-600mg KSM-66-Extrakt 8-12 Wochen. **Mechanismus:** HPA-Achsen-Modulation, Cortisol-Reduktion -20%, Testosteron-Erhöhung +14-18%. **Anwendung:** Chronischer Stress, Übertraining-Syndrom, Libido-Verlust. **Timing:** Mit Mahlzeit, vorzugsweise abends. **Synergie:** Kombiniert mit Rhodiola für Adrenal-Support. **Safety:** Zyklische Anwendung empfohlen.',
ARRAY['ashwagandha', 'adaptogen', 'cortisol', 'testosterone', 'stress'], 1),

('kai', 'sleep', 'supplement', 'Deep-Sleep-Stack - Kai Abendprotokoll',
'Wissenschaftlich optimiertes Protokoll für Schlafarchitektur-Verbesserung. **20:00 Rhodiola:** 200mg für Adrenal-Winddown. **21:00 L-Theanin + Magnesium:** 200mg + 300mg für Entspannung ohne Sedierung. **22:00 Melatonin:** 0.5mg für circadianen Reset (bei Jet-Lag: 2mg). **Synergien:** Rhodiola→HPA-Beruhigung, L-Theanin→GABA-Modulation, Magnesium→Muskelrelaxation, Melatonin→Circadian-Timing. **Effekt:** Tiefere N3-Phasen, weniger Fragmentierung, bessere REM-Qualität.',
ARRAY['deep-sleep-stack', 'sleep-architecture', 'protocol', 'kai', 'recovery'], 1),

-- Female Health Supplements (Dr. Vita Femina)
('dr-vita', 'female-health', 'supplement', 'Eisen - Kritischer Mikronährstoff für Frauen',
'Eisen ist bei menstruierenden Frauen häufig limitierend für Performance. **Evidenzbasierte Dosierung:** 18-45mg Fe²⁺ bei Ferritin <30 ng/mL. **Mechanismus:** Häm-Synthese, Sauerstofftransport, mitochondriale Atmungskette. **Performance-Effekt:** VO₂max-Verbesserung +5-15% bei Eisenmangel-Korrektur. **Timing:** Nüchtern mit Vitamin C, getrennt von Calcium/Zink. **Safety:** Überdosierung vermeiden bei Ferritin >150 ng/mL. **Coach-Integration:** Screening bei Müdigkeit, blasser Haut, Leistungsabfall.',
ARRAY['iron', 'female-health', 'performance', 'oxygen-transport', 'deficiency'], 1),

('dr-vita', 'bone-health', 'supplement', 'Calcium + Vitamin D - Knochengesundheit-Duo',
'Synergistische Kombination für optimale Knochengesundheit, besonders in Peri-/Postmenopause. **Evidenzbasierte Dosierung:** 1000-1200mg Calcium + 1000-2000 IU Vitamin D täglich. **Mechanismus:** Calcium-Absorption-Maximierung, Osteoblasten-Aktivierung, PTH-Suppression. **Evidenz:** Knochendichte-Erhalt +2-4%, Fraktur-Risiko -12-20%. **Timing:** Calcium aufgeteilt 2-3 Dosen, Vitamin D mit Fett. **Safety:** Herz-Kreislauf-Risiko bei Mega-Dosierung. **Lebensphasen:** Besonders kritisch ab 45+ Jahren.',
ARRAY['calcium', 'vitamin-d', 'bone-health', 'menopause', 'osteoporosis'], 1),

('dr-vita', 'hormone-balance', 'supplement', 'Myo-Inositol - PCOS & Zyklusregulation',
'Myo-Inositol verbessert Insulinsensitivität und reguliert Androgen-Spiegel bei PCOS. **Evidenzbasierte Dosierung:** 2-4g täglich, aufgeteilt auf 2 Dosen. **Mechanismus:** Insulin-Signaling-Verbesserung, Androgen-Reduktion, Ovulations-Förderung. **PCOS-Effekte:** Zyklusregulation +60%, Hirsutismus-Reduktion, Gewichtsmanagement-Support. **Timing:** Mit Mahlzeiten für GI-Toleranz. **Synergie:** Kombiniert mit D-Chiro-Inositol im 40:1-Verhältnis. **Safety:** Sehr gut verträglich, natürlicher B-Vitamin-Komplex.',
ARRAY['myo-inositol', 'pcos', 'insulin-sensitivity', 'cycle-regulation', 'androgens'], 1),

('dr-vita', 'female-health', 'supplement', 'Cycle-Sync-Stack - Hormonphasen-Supplementation',
'Zyklusabhängiges Supplement-Protokoll für optimale hormonelle Balance. **Follikulärphase (Tag 1-14):** Kreatin 3g + Eisen 30mg + Vitamin C 250mg für Aufbau-Unterstützung. **Lutealphase (Tag 15-28):** Magnesium 400mg + Omega-3 3g + Curcumin 500mg für PMS-Reduktion. **Menopause-Transition:** Isoflavone 70mg + Black Cohosh 40mg + Vitamin D 2000 IU für Symptom-Management. **Rationale:** Nährstoff-Bedarf schwankt mit Hormon-Zyklen, timing-spezifische Supplementation maximiert Effektivität.',
ARRAY['cycle-sync', 'hormone-phases', 'pms', 'menopause', 'female-stack'], 1),

-- Longevity & Gut Health Supplements (Coach Lucy)
('lucy', 'longevity', 'supplement', 'CoQ10 (Ubiquinol) - Mitochondriale Energieoptimierung',
'Coenzyme Q10 ist essentiell für mitochondriale ATP-Produktion und zelluläre Energieoptimierung. **Evidenzbasierte Dosierung:** 200-300mg Ubiquinol täglich mit fettreicher Mahlzeit. **Mechanismus:** Elektronentransport-Kette, ATP-Synthase-Cofaktor, lipophiles Antioxidans. **Performance-Effekte:** Ausdauer-Verbesserung +8-12%, reduzierte Laktat-Akkumulation. **Anti-Aging:** Mitochondrien-Schutz, reduzierte oxidative Schäden. **Timing:** Mit Hauptmahlzeit für optimale Absorption. **Evidenz:** Mittel für kardiovaskuläre Gesundheit und Exercise-Performance.',
ARRAY['coq10', 'ubiquinol', 'mitochondria', 'energy', 'anti-aging'], 1),

('lucy', 'longevity', 'supplement', 'NMN/NR - NAD⁺-Precursors für Zellenergie',
'NAD⁺-Precursors unterstützen Sirtuins und zelluläre Energieproduktion. **Evidenzbasierte Dosierung:** 250-500mg NMN oder NR täglich, zyklisch (8 Wochen on, 2 Wochen off). **Mechanismus:** NAD⁺-Biosynthese-Pathway, Sirtuin-Aktivierung, DNA-Reparatur-Enhancement. **Emerging Benefits:** Verbesserte Insulin-Sensitivität, erhöhte Mitochondrien-Biogenese. **Timing:** Morgens nüchtern für optimale Absorption. **Status:** Emerging Research, vielversprechende Tier-Studien, Human-Daten limitiert. **Safety:** Generell gut verträglich, Langzeit-Effekte unbekannt.',
ARRAY['nmn', 'nr', 'nad-precursor', 'sirtuins', 'longevity'], 1),

('lucy', 'gut-health', 'supplement', 'Probiotika Multi-Stamm - Mikrobiom-Optimierung',
'Multi-Stamm-Probiotika fördern Darm-Barriere und Immunmodulation. **Evidenzbasierte Dosierung:** 10-50 Milliarden CFU verschiedener Stämme täglich. **Mechanismus:** SCFA-Produktion (Butyrat), Tight-Junction-Stärkung, pathogen-competitive-exclusion. **Anwendungen:** IBS-Symptom-Reduktion, Post-Antibiotika-Recovery, Sport-GI-Stress-Management. **Timing:** Mit/nach Mahlzeit für Säure-Schutz. **Strain-Spezifität:** Lactobacillus rhamnosus, Bifidobacterium longum, Akkermansia muciniphila. **Evidenz:** Mittel für spezifische GI-Indikationen.',
ARRAY['probiotics', 'gut-health', 'microbiome', 'scfa', 'immune-system'], 1),

-- Anti-Aging Advanced Stack
('lucy', 'longevity', 'supplement', 'Spermidin - Autophagie-Trigger für Longevity',
'Spermidin induziert Autophagie und fördert zelluläre Reinigungsprozesse. **Evidenzbasierte Dosierung:** 1mg täglich, vorzugsweise aus natürlichen Quellen (Weizenkeime). **Mechanismus:** mTOR-unabhängige Autophagie-Induktion, Protein-Aggregat-Clearance. **Longevity-Effekte:** Herzgesundheit-Verbesserung, Neuroprotektion, reduzierte Inflammation. **Timing:** Mit Hauptmahlzeit. **Status:** Frühe Forschungsphase, vielversprechende epidemiologische Daten. **Safety:** Natürlich vorkommend, sehr gut verträglich.',
ARRAY['spermidine', 'autophagy', 'longevity', 'cardio-protection', 'emerging'], 1),

-- Additional Performance Support
('sascha', 'endurance', 'supplement', 'Rote-Beete-Nitrate - Sauerstoff-Effizienz-Booster',
'Rote-Beete-Nitrate verbessern Sauerstoff-Effizienz und Ausdauer-Performance. **Evidenzbasierte Dosierung:** 6-8 mmol Nitrate 2-3h vor Ausdauer-Einheit. **Mechanismus:** NO-Synthase-unabhängige NO-Produktion, verbesserte mitochondriale Effizienz. **Performance-Effekte:** Reduzierte O₂-Kosten -3-5%, Time-to-Exhaustion +4-15%. **Timing:** 2-3h pre-exercise für Peak-Plasma-Nitrit. **Praktisch:** Rote-Beete-Shot 70ml oder Nitrat-Supplement. **Evidenz:** Hoch für Ausdauer-Performance, besonders bei moderater Intensität.',
ARRAY['beetroot', 'nitrates', 'endurance', 'vo2-efficiency', 'performance'], 1),

('sascha', 'recovery', 'supplement', 'L-Carnitin - Fettoxidation & Recovery-Beschleunigung',
'L-Carnitin verbessert Fettoxidation und beschleunigt Recovery-Prozesse. **Evidenzbasierte Dosierung:** 2-3g täglich mit 30-60g Kohlenhydraten ≥9 Wochen. **Mechanismus:** Fatty-Acid-β-Oxidation, reduzierte Laktat-Akkumulation, verbesserte Insulin-Sensitivität. **Performance-Effekte:** Erhöhte Fettverbrennung +20%, reduzierte Muskelschäden-Marker. **Timing:** Post-Workout mit Kohlenhydraten für Insulin-mediated-Uptake. **Evidenz:** Mittel für Ausdauer und Recovery, erfordert chronische Supplementation.',
ARRAY['l-carnitine', 'fat-oxidation', 'recovery', 'insulin-sensitivity', 'endurance'], 1),

-- Sleep Optimization Advanced
('kai', 'sleep', 'supplement', 'Rhodiola Rosea - Adaptogen für Stress-Recovery',
'Rhodiola rosea ist ein adaptogenes Kraut für Stress-Resilienz und Fatigue-Reduktion. **Evidenzbasierte Dosierung:** 200-400mg SHR-5-Extrakt morgens. **Mechanismus:** HPA-Achsen-Modulation, Cortisol-Regulation, Neurotransmitter-Balance. **Anti-Fatigue:** Reduzierte mentale Müdigkeit, verbesserte Stress-Toleranz. **Timing:** Morgens für circadiane Optimierung, nicht abends (kann aktivierend wirken). **Synergie:** Kombiniert mit Ashwagandha für umfassenden Adrenal-Support. **Evidenz:** Mittel für Stress-bedingte Fatigue.',
ARRAY['rhodiola', 'adaptogen', 'anti-fatigue', 'hpa-axis', 'stress-resilience'], 1),

-- Universal Antioxidants
('universal', 'longevity', 'supplement', 'Astaxanthin - Universeller Zellschutz',
'Astaxanthin ist eines der stärksten natürlichen Antioxidantien für umfassenden Zellschutz. **Evidenzbasierte Dosierung:** 4-12mg täglich mit fettreicher Mahlzeit. **Mechanismus:** Lipid-Peroxidation-Hemmung, UV-Schutz, mitochondrialer Membran-Schutz. **Performance-Effekte:** Reduzierte Muskelschäden, verbesserte Ausdauer +5%, Hautschutz. **Timing:** Mit Hauptmahlzeit für Lipid-basierte Absorption. **Synergien:** Verstärkt Omega-3-Effekte, kombiniert mit Vitamin E. **Evidenz:** Mittel für antioxidative Wirkung und Hautgesundheit.',
ARRAY['astaxanthin', 'antioxidant', 'cell-protection', 'uv-protection', 'universal'], 1),

('universal', 'anti-inflammatory', 'supplement', 'Curcumin - NF-κB-Hemmung & Entzündungskontrolle',
'Curcumin ist ein potenter natürlicher Entzündungshemmer mit systemischen Effekten. **Evidenzbasierte Dosierung:** 500-1000mg mit Piperin oder Nano-Formulierung. **Mechanismus:** NF-κB-Transkriptionsfaktor-Hemmung, COX/LOX-Inhibition, antioxidative Aktivität. **Anti-Inflammatorisch:** Systemische Entzündungsmarker -20-40%, Gelenkschmerz-Reduktion. **Bioverfügbarkeit:** Piperin erhöht Absorption +200%, Nano-/Liposomal-Formen bevorzugt. **Timing:** Mit fettreicher Mahlzeit. **Evidenz:** Hoch für anti-inflammatorische Wirkung.',
ARRAY['curcumin', 'anti-inflammatory', 'nf-kb', 'joint-health', 'bioavailability'], 1);