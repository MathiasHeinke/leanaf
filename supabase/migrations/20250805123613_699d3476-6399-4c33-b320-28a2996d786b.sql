-- Phase 1: RAG Knowledge Base für Dr. Vita Femina - Female Health & Hormone Coach
-- Comprehensive knowledge base entries for cycle-based training, PCOS, endometriosis, menopause, and pregnancy coaching

-- 1. Zyklusbasierte Trainingsperiodisierung
INSERT INTO coach_knowledge_base (coach_id, title, content, expertise_area, tags, citations, created_at) VALUES
('vita', 'Zyklusbasierte Trainingsperiodisierung - Grundlagen', 
'# Zyklusbasierte Trainingsperiodisierung

## Follikelphase (Tag 1-14)
**Hormoneller Status:** Östrogen steigt an, wirkt anabol
**Trainingsempfehlung:** 
- Progressives Krafttraining 3-4x/Woche
- Intensität: 80-85% 1RM möglich
- Bessere Regeneration durch anabole Östrogenwirkung
- Optimale Phase für Kraftaufbau und Muskelhypertrophie

## Ovulationsphase (Tag 14-16)
**Hormoneller Status:** Östrogen-Peak, LH-Surge
**Trainingsempfehlung:**
- Maximale Power und Explosivität
- Beste Koordination und Reaktionszeit
- Ideale Phase für Maximalversuche
- Höchste Leistungsfähigkeit im Zyklus

## Lutealphase (Tag 15-28)
**Hormoneller Status:** Progesteron dominiert, Östrogen fällt
**Trainingsempfehlung:**
- Reduktion der Trainingsintensität
- Fokus auf Regeneration und Beweglichkeit
- Erhöhte Verletzungsanfälligkeit durch Ligamentlaxität
- Vermeidung von Maximalkrafttraining

## Menstruation (Tag 1-5)
**Hormoneller Status:** Beide Hormone auf Tiefstand
**Trainingsempfehlung:**
- Leichtes Training je nach Befinden
- Yoga, Walking, sanfte Bewegung
- Eisenreiche Ernährung besonders wichtig
- Individuell angepasste Intensität', 
'female_health', 
ARRAY['zyklusbasiert', 'periodisierung', 'hormone', 'training'], 
ARRAY[1, 2, 3], 
now()),

-- 2. PCOS Management
('vita', 'PCOS Training und Lifestyle Management', 
'# PCOS (Polyzystisches Ovarialsyndrom) - Evidenzbasiertes Management

## Trainingsprotokoll
**Frequenz:** 3x Training/Woche
- 2x Krafttraining (Ganzkörper)
- 1x moderates Ausdauertraining (Zone 2)

**Krafttraining Spezifikationen:**
- Compound-Übungen bevorzugen
- 3-4 Sätze, 8-12 Wiederholungen
- 48-72h Regeneration zwischen Einheiten
- Progressive Überladung wichtig für Insulinsensitivität

## Ernährungsstrategien
**Makronährstoffverteilung:**
- Protein: 25-30% (1.6-2.2g/kg KG)
- Kohlenhydrate: 35-40% (komplexe KH bevorzugen)
- Fette: 30-35% (Omega-3 reich)

**Timing:** 
- Post-Workout Protein binnen 2h
- Kohlenhydrate um das Training
- 3 Hauptmahlzeiten + 1-2 Snacks

## Supplementierung (nach Labordiagnostik)
- **Omega-3:** 2-3g EPA/DHA täglich
- **Magnesium:** 300-400mg täglich
- **Vitamin D3:** 2000-4000 IE (abhängig vom Status)
- **Inositol:** 2-4g täglich (bei Insulinresistenz)
- **Chrom:** 200-400μg (bei Heißhunger)

## Lifestyle-Faktoren
- Schlaf: 7-9h, konstante Zeiten
- Stressmanagement: Meditation, Atemtechniken
- Regelmäßige Laborkontrollen: Insulin, Androgene, Lipide', 
'female_health', 
ARRAY['pcos', 'insulin', 'androgene', 'lifestyle'], 
ARRAY[4, 5, 6], 
now()),

-- 3. Endometriose Management
('vita', 'Endometriose - Schmerzmanagement durch Bewegung', 
'# Endometriose - Bewegungstherapie und Schmerzmanagement

## Evidenzlage
**Meta-Analyse (6 RCTs, n=412):** 
Signifikante Schmerzlinderung durch strukturierte Bewegungstherapie
- Reduzierung chronischer Beckenschmerzen um 30-40%
- Verbesserung der Lebensqualität
- Weniger Schmerzmittel-Bedarf

## Empfohlene Bewegungsformen

### Phase 1: Schmerzlinderung (Wochen 1-4)
- **Yoga:** 2-3x/Woche, 30-45 Minuten
- **Walking:** täglich 20-30 Minuten
- **Atemtechniken:** 10 Minuten täglich
- **Dehnung:** Fokus auf Hüftbeuger, Beckenboden

### Phase 2: Aufbau (Wochen 5-12)
- **Krafttraining:** 2x/Woche, leichte Gewichte
- **Pilates:** 2x/Woche, Core-Stabilisation
- **Schwimmen:** 1-2x/Woche, gelenkschonend
- **Progression:** sehr langsam, schmerzadaptiert

## Kontraindikationen
- High-Impact Übungen vermeiden
- Keine extremen Rumpfbeugen
- Kein Training während akuter Schübe
- Individuelle Schmerzgrenze respektieren

## Schmerzprotokoll
**Dokumentation:**
- Schmerzintensität (1-10 Skala)
- Trainingsverträglichkeit
- Zyklusphase
- Medikation
- Schlafqualität

## Zusätzliche Maßnahmen
- Wärmetherapie vor Training
- Magnesium-Supplementierung
- Omega-3 für Entzündungshemmung
- Stressreduktion (Cortisol beeinflusst Schmerz)', 
'female_health', 
ARRAY['endometriose', 'schmerz', 'yoga', 'bewegungstherapie'], 
ARRAY[7, 8, 9], 
now()),

-- 4. Menopause Coaching
('vita', 'Menopause Training - Kraft, Knochen, Vitalität', 
'# Menopause Training - Evidenzbasierte Strategien

## Hormonelle Veränderungen
**Östrogenmangel führt zu:**
- Muskelmasseabbau (-8% pro Dekade ab 40)
- Knochendichteverlust (-2-3% jährlich)
- Metabolische Verlangsamung
- Veränderte Fettverteilung

## Trainingsprotokoll Menopause

### Krafttraining (Priorität #1)
**Frequenz:** 2-3x/Woche
**Fokus:** Compound-Bewegungen
- Kniebeugen, Kreuzheben, Rudern, Drücken
- 3-4 Sätze, 6-12 Wiederholungen
- Progressive Überladung essentiell
- 48-72h Regeneration

### Impact Cardio für Knochen
**Frequenz:** 2x/Woche
- Kurze, intensive Einheiten (15-20 Min)
- Sprünge, Step-ups, Bergläufe
- Mechanische Belastung stimuliert Osteoblasten
- Alternative: Vibrationstraining

### Flexibilität & Balance
**Täglich 10-15 Minuten:**
- Sturzprophylaxe wird kritisch
- Tai Chi oder Yoga
- Single-leg Übungen
- Propriozeptives Training

## Ernährungsanpassungen
**Protein:** 1.2-1.6g/kg KG (höher als in jüngeren Jahren)
**Calcium:** 1200mg täglich
**Vitamin D3:** 2000-4000 IE
**Phytoöstrogene:** Soja, Leinsamen, Hülsenfrüchte

## Hormonersatztherapie (HRT) Überlegungen
- Diskussion mit Gynäkolog*in
- Timing-Hypothese: frühe Menopause vs. späte
- Bioidentische vs. synthetische Hormone
- Risiko-Nutzen individuell bewerten', 
'female_health', 
ARRAY['menopause', 'krafttraining', 'knochen', 'hormone'], 
ARRAY[10, 11, 12], 
now()),

-- 5. Schwangerschaftsfitness
('vita', 'Schwangerschaftsfitness - Sicher durch alle Trimester', 
'# Schwangerschaftsfitness - Evidenzbasierte Guidelines

## Nutzen von Sport in der Schwangerschaft
**Reduziertes Risiko für:**
- Gestationsdiabetes (-30%)
- Präeklampsie (-40%)
- Schwangerschaftsdepression (-70%)
- Excessive Gewichtszunahme (-60%)
- Geburtskomplikationen (-25%)

## Trimester-spezifische Anpassungen

### 1. Trimester (Wochen 1-12)
**Besonderheiten:**
- Morgendliche Übelkeit berücksichtigen
- Überhitzung vermeiden (>38.5°C)
- Moderate Intensität: "Talk-Test" bestehen
- Gewohnte Aktivitäten meist fortsetzbar

### 2. Trimester (Wochen 13-27)
**"Goldene Phase":**
- Energielevel meist hoch
- Bauch noch nicht hinderlich
- Ideale Zeit für Kraftaufbau
- Rumpftraining anpassen (schräge Muskulatur)

### 3. Trimester (Wochen 28-40)
**Anpassungen nötig:**
- Rückenlage ab Woche 20 vermeiden
- Balance-Herausforderungen reduzieren
- Beckenboden-fokussierte Übungen
- Vorbereitung auf Geburt

## Kontraindikationen (Absolute)
- Schwere Herzerkrankung
- Restriktive Lungenerkrankung  
- Placenta previa nach 26. SSW
- Vorzeitige Wehen
- Mehrlings-SS mit Risikofaktoren

## Übungsmodifikationen
**Krafttraining:**
- Maschinentraining statt freie Gewichte
- Kürzere Sätze, mehr Pausen
- Core-Training: Bird Dog, Side Plank
- Beckenboden bei jeder Übung aktivieren

**Cardio:**
- Schwimmen ideal (Auftrieb, Kühlung)
- Walking statt Laufen (je nach Trimester)
- Low-Impact präferieren
- Herzfrequenz-Monitoring

## Red Flags - Training sofort stoppen bei:
- Vaginale Blutung
- Atemnot vor Belastung
- Schwindel, Kopfschmerzen
- Brustschmerzen
- Wadenschmerzen/Schwellung', 
'female_health', 
ARRAY['schwangerschaft', 'pränatale_fitness', 'sicherheit'], 
ARRAY[13, 14, 15], 
now()),

-- 6. Rückbildung und Postpartale Fitness
('vita', 'Rückbildung - Der Weg zurück zur Kraft', 
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
ARRAY[16, 17, 18], 
now()),

-- 7. Hormonbalance durch Ernährung
('vita', 'Hormonbalance durch zyklussensitive Ernährung', 
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
ARRAY[19, 20, 21], 
now()),

-- 8. Supplementierung für Frauen
('vita', 'Evidenzbasierte Supplementierung für Frauen', 
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

## Timing-Strategien

### Morgens
- B-Vitamine (Energie)
- Vitamin D3+K2
- Adaptogene

### Mit Mahlzeiten
- Eisen (mit Vitamin C)
- Fettlösliche Vitamine
- Probiotika

### Abends
- Magnesium (Entspannung)
- Omega-3 (falls verträglich)
- Kollagen (Regeneration)

## Labor-Monitoring
**Basis-Panel (jährlich):**
- Vitamin D (25-OH)
- B12, Folsäure
- Ferritin, Transferrinsättigung
- Magnesium (intraerythrozytär)
- Omega-3 Index

**Erweitert (bei Beschwerden):**
- Hormone (FSH, LH, Östradiol, Progesteron)
- Schilddrüse (TSH, fT3, fT4, TPO-AK)
- Entzündungsmarker (CRP, IL-6)', 
'nutrition', 
ARRAY['supplemente', 'vitamine', 'pcos', 'menopause'], 
ARRAY[22, 23, 24], 
now()),

-- 9. Stress und Cortisol Management für Frauen
('vita', 'Stress und Cortisol - Hormonbalance für Frauen', 
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

### Metabolische Auswirkungen
- Bauchfett-Zunahme (viszerales Fett)
- Insulinresistenz
- Heißhunger auf Zucker/Kohlenhydrate
- Muskelmasse-Verlust

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

**Loving-Kindness Meditation:**
- Besonders für Frauen effektiv
- Oxytocin-Erhöhung
- Selbstmitgefühl-Förderung

### Bewegung als Stress-Medizin
**Yoga:** 
- Restorative Formen für Cortisol-Senkung
- Vinyasa für Endorphin-Release
- 3x/Woche signifikante Effekte

**Spazierengehen in der Natur:**
- 20-30 Min reichen aus
- Cortisol ↓ 21% nach Waldspaziergang
- Combination mit Achtsamkeit potenziert Effekt

## Nutrition für Stress-Resilienz

### Adaptogene (Timing wichtig)
**Morgens:** Rhodiola, Ginseng (aktivierend)
**Abends:** Ashwagandha, Holy Basil (beruhigend)
**Durchgehend:** Reishi, Schisandra

### Cortisol-senkende Nährstoffe
**Phosphatidylserin:** 100mg vor dem Schlaf
**Omega-3:** 2-3g täglich (EPA-betont)
**Magnesium:** 400mg abends
**Vitamin C:** 1g bei akutem Stress

### Blutzucker-Stabilisierung
**Morgens:** Protein-reiches Frühstück
**Snacks:** Protein + gesunde Fette
**Vermeiden:** Koffein auf nüchternen Magen

## Lifestyle-Interventionen

### Schlaf-Hygiene
**Cortisol-Reset über Nacht:**
- 22:00-23:00 Uhr Bettzeit
- Kühle Raumtemperatur (16-18°C)
- Blaulicht-Filter ab 19:00
- Magnesium 1h vor dem Schlafen

### Soziale Unterstützung
**"Tend and Befriend" bei Frauen:**
- Oxytocin-Release durch sozialen Kontakt
- Stressreduktion durch Gespräche
- Priorität: Quality-Time mit Freundinnen

### Grenzen setzen
**Besonders für Frauen wichtig:**
- "Nein" sagen lernen
- Perfektionismus reduzieren
- Selbstfürsorge priorisieren
- Delegieren und um Hilfe bitten

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
ARRAY[25, 26, 27], 
now()),

-- 10. Schlaf und Regeneration für Frauen
('vita', 'Schlaf und Regeneration - Hormonelle Einflüsse bei Frauen', 
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

**Hormonelle Ursachen:**
- Östrogen ↓ = Thermoregulation gestört
- Progesteron ↓ = weniger Tiefschlaf
- Melatonin-Produktion ↓

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

**Glycin:** 3g vor dem Schlafen
- Körpertemperatur-Senkung
- Tiefschlaf-Förderung
- In Kollagen enthalten

## Bewegung & Schlaf

### Timing von Training
**Morgens/Vormittags:** 
- Krafttraining optimal
- Cortisol-Rhythmus unterstützen
- Energie für den Tag

**Nachmittags:**
- Cardio bis 16:00 Uhr
- Danach nur noch leichte Bewegung
- 4-6h Puffer vor Bettzeit

**Abends:**
- Yoga, Stretching, Spaziergang
- Parasympathikus aktivieren
- Körpertemperatur sanft senken

## Stress & Schlaf
**Abend-Routine für Entspannung:**
1. **Digital Sunset** (19:00): Geräte weg
2. **Warm Bath** (20:00): mit Magnesium-Salz
3. **Reading** (20:30): Fiktion, nicht Sachbuch
4. **Meditation** (21:00): 10-15 Minuten
5. **Bedtime** (21:30): Konstante Zeit

### Progressive Muskelentspannung
**Technik:** 
- Muskelgruppen 5 Sek anspannen
- 10 Sek entspannen
- Von Füßen zum Kopf
- Besonders effektiv bei PMS

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
- Kühlende Maßnahmen (Menopause)

### Frühmorgendliches Erwachen
**3-5 Uhr = Leber-Zeit (TCM):**
- Alkohol reduzieren
- Lebertee (Mariendistel, Löwenzahn)
- Cortisol-Rhythmus prüfen

## Schlaf-Tracking sinnvoll nutzen
**Sinnvolle Metriken:**
- Einschlafzeit
- Aufwach-Häufigkeit
- Schlafeffizienz (Zeit im Bett vs. Schlafzeit)

**Vorsicht:**
- Nicht zu detailbesessen werden
- "Orthosomnia" vermeiden
- Subjektives Gefühl wichtiger als Zahlen', 
'recovery', 
ARRAY['schlaf', 'regeneration', 'hormone', 'menopause'], 
ARRAY[28, 29, 30], 
now());

-- Update coach_knowledge_base for completion
UPDATE coach_knowledge_base 
SET updated_at = now() 
WHERE coach_id = 'vita';