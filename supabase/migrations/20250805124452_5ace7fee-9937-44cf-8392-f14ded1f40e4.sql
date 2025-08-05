-- Phase 1 (continued): Weitere RAG Knowledge Base Einträge für Dr. Vita Femina

-- 6. Rückbildung und Postpartale Fitness
INSERT INTO coach_knowledge_base (coach_id, knowledge_type, title, content, expertise_area, tags, created_at) VALUES
('vita', 'clinical_protocol', 'Rückbildung - Der Weg zurück zur Kraft', 
'# Rückbildung - Strukturierter Wiederaufbau nach der Geburt

## Timeline Postpartale Fitness

### Wochen 0-6: Absolute Schonung
**Fokus:** Heilung und Bonding
- Keine strukturierte Fitness
- Leichte Atemübungen erlaubt
- Beckenboden-Wahrnehmung
- Spazierengehen nach Befinden

### Wochen 6-8: Medizinische Freigabe
**Gynäkologische Kontrolle notwendig:**
- Kaiserschnitt vs. vaginale Geburt
- Geburtsverletzungen verheilt?
- Beckenboden-Funktion
- Rektusdiastase-Assessment

### Wochen 8-16: Rückbildung Phase 1
**Professionelle Rückbildung:**
- Beckenboden-spezifische Übungen
- Core-Rehabilitation (nicht "Bauch weg")
- Körperhaltung korrigieren
- Atemtechnik re-etablieren

### Wochen 16-52: Aufbau Phase 2
**Strukturiertes Training:**
- Krafttraining 2x/Woche
- Progressive Belastung
- Funktionelle Bewegungen
- Still-kompatible Zeiten

## Beckenboden-Rehabilitation

### Assessment
**Tests für Beckenboden-Funktion:**
- Knix-Test (Husten/Niesen ohne Urinverlust)
- Halte-Test (10 Sek Kontraktion)
- Kraft-Test (gegen Widerstand)
- Koordination (schnell/langsam)

### Übungsprogression
**Stufe 1:** Wahrnehmung
- Anspannung vs. Entspannung lernen
- Atemkoordination
- Isolierte Kontraktionen

**Stufe 2:** Kraft
- Längere Haltezeiten (bis 10 Sek)
- Wiederholte Kontraktionen
- Funktionelle Integration

**Stufe 3:** Koordination
- Bewegung + Beckenboden
- Alltagsaktivitäten
- Sport-spezifische Vorbereitung

## Rektusdiastase Management
**Selbsttest:**
- 3 Finger breit = Physiotherapie nötig
- >2 Finger: modifizierte Übungen
- Niemals: Sit-ups, Crunches, Planks

**Sichere Übungen:**
- Dead Bug Progression
- Modified Side Plank
- Pallof Press
- Glute Bridge Variationen

## Mindset: "Rebuild" statt "Zurück"
- Körper hat Unglaubliches geleistet
- Neue Normalität akzeptieren
- Realistische Zeitpläne (12+ Monate)
- Selbstmitgefühl praktizieren', 
'female_health', 
ARRAY['rückbildung', 'postpartal', 'beckenboden', 'rektusdiastase'], 
now()),

-- 7. Hormonbalance durch Ernährung
('vita', 'nutrition_guide', 'Hormonbalance durch zyklussensitive Ernährung', 
'# Hormonbalance durch zyklussensitive Ernährung

## Follikelphase Ernährung (Tag 1-14)

### Nährstoffbedarf
**Eisen:** Kritisch nach Menstruation
- Rotes Fleisch, Hülsenfrüchte, Spinat
- Vitamin C zur Eisenaufnahme
- Vermeidung: Kaffee/Tee zu eisenreichen Mahlzeiten

**Protein:** Anabol durch Östrogen
- 1.6-2.0g/kg Körpergewicht
- Vollständige Aminosäureprofile
- Post-Workout innerhalb 2h

**Kohlenhydrate:** Energiebereitstellung
- Komplexe KH für stabilen Blutzucker
- Pre-Workout: schnelle KH erlaubt
- Glykogenaufbau für intensives Training

### Lebensmittel-Fokus
- Quinoa, Haferflocken (Mangan für Knochenbildung)
- Lachs, Avocado (Omega-3)
- Brokkoli, Spinat (Folsäure)
- Beeren (Antioxidantien)

## Lutealphase Ernährung (Tag 15-28)

### Nährstoffbedarf
**Magnesium:** PMS-Symptom Reduktion
- 300-400mg täglich
- Kürbiskerne, Mandeln, dunkle Schokolade
- Reduziert Krämpfe und Stimmungsschwankungen

**Gesunde Fette:** Hormonproduktion
- 30-35% der Kalorienzufuhr
- Omega-3:Omega-6 Ratio beachten
- MCT-Öl für Energiebereitstellung

**B-Vitamine:** Nervensystem Support
- B6: Serotonin-Synthese (PMS-Mood)
- B12: Energiestoffwechsel
- Folsäure: DNA-Synthese

### Heißhunger Management
**Serotonin-Support:**
- Dunkle Schokolade (>85% Kakao)
- Bananen (Tryptophan)
- Haferflocken (komplexe KH)

**Blutzucker-Stabilisierung:**
- Protein + Fett + Ballaststoffe
- Kleinere, häufigere Mahlzeiten
- Vermeidung: Zucker, raffinierte KH

## Menopause Ernährung

### Phytoöstrogene
**Isoflavone (Soja):**
- 50-100mg täglich
- Tofu, Tempeh, Edamame
- Nicht bei Brustkrebs-Historie

**Lignane (Leinsamen):**
- 1-2 EL geschrotete Leinsamen
- Alpha-Linolensäure (ALA)
- Ballaststoffe für Darm-Gesundheit

### Knochen-Gesundheit
**Calcium:** 1200mg täglich
- Milchprodukte, Mandeln, Sesam
- Vitamin D3 für Absorption
- Magnesium als Cofaktor

## Hormon-disruptive Substanzen meiden
- BPA (Plastikflaschen)
- Phthalate (Kosmetik)
- Pestizide (Bio bevorzugen)
- Xenoöstrogene (Umweltgifte)', 
'nutrition', 
ARRAY['hormone', 'zyklus', 'ernährung', 'phytoöstrogene'], 
now()),

-- 8. Supplementierung für Frauen
('vita', 'supplement_guide', 'Evidenzbasierte Supplementierung für Frauen', 
'# Evidenzbasierte Supplementierung für Frauen - Lebensphasen-spezifisch

## Basis-Supplemente (alle Lebensphasen)

### Vitamin D3 + K2
**Dosierung:** 2000-4000 IE D3 + 100-200μg K2
**Rationale:** 
- 80% der Frauen haben Vitamin D Mangel
- Knochen-, Immun-, Hormonsystem
- K2 verhindert Arterienverkalkung
**Timing:** Mit fettreicher Mahlzeit

### Omega-3 (EPA/DHA)
**Dosierung:** 2-3g kombiniert EPA/DHA
**Rationale:**
- Entzündungshemmung
- Hormonproduktion
- Menstruationsbeschwerden ↓
**Qualität:** Molekular destilliert, Oxidationswerte prüfen

### Magnesium
**Dosierung:** 300-400mg (Glycinat oder Malat)
**Rationale:**
- PMS-Symptome ↓ (Krämpfe, Mood)
- Energiestoffwechsel
- Muskelentspannung, Schlaf
**Timing:** Abends für besseren Schlaf

## Reproduktive Jahre (18-45)

### Eisen (bei Bedarf)
**Dosierung:** 18-30mg
**Indikation:** Ferritin <30 ng/ml
**Form:** Eisen-Bisglycinat (beste Verträglichkeit)
**Timing:** Nüchtern mit Vitamin C, nicht mit Kaffee

### B-Komplex
**Fokus:** B6 (PMS), B12 (Energie), Folsäure
**Dosierung:** Hochwertiger B-Komplex
**Besonders wichtig:** Bei Pille, Stress, veganer Ernährung

### Probiotika (zyklisch)
**Rationale:** Östrogenmetabolismus über Darm
**Stämme:** Lactobacillus acidophilus, Bifidobacterium
**Timing:** Nach Antibiotika, bei Dysbiose

## PCOS-spezifische Supplemente

### Inositol
**Dosierung:** 2-4g täglich (Myo + D-Chiro 40:1 Ratio)
**Wirkung:** Insulinsensitivität ↑, Ovulation ↑
**Evidenz:** >20 RCTs, signifikante Verbesserungen

### Chrom
**Dosierung:** 200-400μg
**Indikation:** Heißhunger, Insulinresistenz
**Form:** Chrom-Picolinat

### Spearmint Tee
**Dosierung:** 2 Tassen täglich
**Wirkung:** Anti-androgen, Hirsutismus ↓
**Evidenz:** Signifikant vs. Placebo

## Menopause-Support

### Phytoöstrogen-Komplexe
**Rotklee:** 40-80mg Isoflavone
**Soja-Extrakt:** 50-100mg
**Kudzu:** 100-200mg
**Vorsicht:** Bei Brustkrebs-Historie

### Adaptogene
**Ashwagandha:** 300-600mg (Stress, Cortisol)
**Rhodiola:** 200-400mg (Energie, Mood)
**Maca:** 1.5-3g (Libido, Energie)

### Kollagen (Typ I & III)
**Dosierung:** 10-20g täglich
**Rationale:** Hautstraffung, Gelenkgesundheit
**Timing:** Nüchtern für beste Absorption

## Labor-Monitoring
**Basis-Panel (jährlich):**
- Vitamin D (25-OH)
- B12, Folsäure
- Ferritin, Transferrinsättigung
- Magnesium (intraerythrozytär)
- Omega-3 Index', 
'nutrition', 
ARRAY['supplemente', 'vitamine', 'pcos', 'menopause'], 
now()),

-- 9. Stress und Cortisol Management für Frauen
('vita', 'lifestyle_guide', 'Stress und Cortisol - Hormonbalance für Frauen', 
'# Stress und Cortisol Management - Frauen-spezifische Strategien

## Cortisol-Rhythmus bei Frauen

### Natürlicher Rhythmus
**Morgens:** Cortisol-Peak (Erwachen + 30-45 Min)
**Mittags:** Moderate Levels
**Abends:** Niedrigste Werte
**Geschlechtsunterschiede:** Frauen reagieren stärker auf sozialen Stress

### Zyklusbedingte Variationen
**Follikelphase:** Niedrigere Basis-Cortisol-Werte
**Lutealphase:** Erhöhte Cortisol-Sensitivität
**Menstruation:** Cortisol kann Symptome verstärken
**Ovulation:** Stressresilienz meist am höchsten

## Chronischer Stress - Auswirkungen

### HPA-Achsen Dysregulation
**Nebennieren-Erschöpfung:**
- Morgendlicher Cortisol-Mangel
- Abendliche Cortisol-Elevation
- DHEA:Cortisol Ratio verschoben

**Hormonelle Konsequenzen:**
- Ovulationsstörungen
- PMS-Verstärkung
- Frühe Menopause
- Libido-Verlust

## Stress-Management Strategien

### Atemtechniken (Evidence-based)
**4-7-8 Technik:**
- 4 Sek einatmen
- 7 Sek anhalten  
- 8 Sek ausatmen
- 3-4 Zyklen, 2x täglich

**Box Breathing:**
- 4-4-4-4 Muster
- Vagusnerv-Stimulation
- HRV-Verbesserung

### Meditation & Achtsamkeit
**Mindfulness-Based Stress Reduction (MBSR):**
- 8-Wochen Programme zeigen:
- 23% Cortisol-Reduktion
- Verbesserte Schlafqualität
- Weniger Angst/Depression

### Bewegung als Stress-Medizin
**Yoga:** 
- Restorative Formen für Cortisol-Senkung
- Vinyasa für Endorphin-Release
- 3x/Woche signifikante Effekte

## Zyklus-angepasstes Stress-Management

### Follikelphase (Tag 1-14)
- Neue Projekte starten
- Höhere Belastbarkeit nutzen
- Social Activities planen

### Ovulation (Tag 14-16)  
- Wichtige Gespräche führen
- Maximale Stressresilienz
- Networking, Präsentationen

### Lutealphase (Tag 15-28)
- Rückzug und Reflexion
- Stress-Exposition minimieren
- Yoga, Meditation priorisieren

### Menstruation (Tag 1-5)
- Absolute Entspannung
- Grenzen besonders wichtig
- Restorative Practices', 
'mindset', 
ARRAY['stress', 'cortisol', 'achtsamkeit', 'zyklus'], 
now()),

-- 10. Schlaf und Regeneration für Frauen
('vita', 'recovery_guide', 'Schlaf und Regeneration - Hormonelle Einflüsse bei Frauen', 
'# Schlaf und Regeneration - Hormonelle Einflüsse bei Frauen

## Hormonelle Schlaf-Regulation

### Menstrueller Zyklus & Schlaf
**Follikelphase:** 
- Östrogen ↑ = bessere Schlafqualität
- REM-Schlaf Zunahme
- Weniger nächtliches Erwachen

**Lutealphase:**
- Progesteron = natürliches Sedativum
- Tiefschlaf-Förderung
- Aber: Temperatur ↑ kann Schlaf stören

**Menstruation:**
- Hormon-Tiefstand = Schlafstörungen
- Schmerzen unterbrechen Schlaf
- Eisenmangel = Restless Legs

### Menopause & Schlaf
**Herausforderungen:**
- Hitzewallungen (75% der Frauen)
- Nächtliches Schwitzen
- Längere Einschlafzeit
- Häufigeres Erwachen

## Schlaf-Hygiene für Frauen

### Temperatur-Management
**Raumklima:**
- 16-18°C Raumtemperatur
- Luftfeuchtigkeit 40-60%
- Ventilator für Luftzirkulation

**Bettwäsche:**
- Bambus oder Leinen (atmungsaktiv)
- Kühlendes Kopfkissen
- Schichtenprinzip für Bettdecke

### Licht-Regulation
**Morgens:** 
- Helles Licht binnen 30 Min nach Erwachen
- 10.000 Lux Tageslichtlampe (Winter)
- Cortisol-Rhythmus stabilisieren

**Abends:**
- Blaulicht-Filter ab 19:00
- Dimmer/Kerzen für Entspannung
- Melatonin-Produktion fördern

## Schlaf-fördernde Ernährung

### Timing der Mahlzeiten
**Letztes Essen:** 3h vor Bettzeit
**Ausnahme:** Kleine Snacks mit Tryptophan
- Banane mit Mandelbutter
- Kirschsaft (natürliches Melatonin)
- Haferflocken mit warmer Milch

### Schlaf-Nährstoffe
**Magnesium:** 300-400mg, 1h vor Bett
- Muskelentspannung
- GABA-Aktivierung
- Stress-Reduktion

**Melatonin:** 0.5-3mg, 30 Min vor Bett
- Bei Jetlag oder Schichtarbeit
- Niedrige Dosis oft effektiver
- Nicht dauerhaft ohne Absprache

## Schlafstörungen - Lösungsansätze

### Einschlafprobleme
**Ursachen:** Stress, Gedankenkarussell
**Lösungen:**
- "Worry Time" am Nachmittag
- Tagebuch vor dem Schlafen
- 4-7-8 Atemtechnik
- Hörbuch/Podcast (langweilig)

### Durchschlafprobleme
**Hormonelle Ursachen:** 
- Blutzucker-Schwankungen
- Cortisol-Dysregulation
- Hitzewallungen

**Strategien:**
- Protein-Snack vor Bett (stabile BZ)
- Adaptogene (Ashwagandha)
- Kühlende Maßnahmen (Menopause)', 
'recovery', 
ARRAY['schlaf', 'regeneration', 'hormone', 'menopause'], 
now());