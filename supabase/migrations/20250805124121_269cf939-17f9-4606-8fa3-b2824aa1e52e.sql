-- Phase 1: RAG Knowledge Base für Dr. Vita Femina - Female Health & Hormone Coach
-- Comprehensive knowledge base entries for cycle-based training, PCOS, endometriosis, menopause, and pregnancy coaching

-- 1. Zyklusbasierte Trainingsperiodisierung
INSERT INTO coach_knowledge_base (coach_id, knowledge_type, title, content, expertise_area, tags, created_at) VALUES
('vita', 'evidence_summary', 'Zyklusbasierte Trainingsperiodisierung - Grundlagen', 
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
now()),

-- 2. PCOS Management
('vita', 'clinical_protocol', 'PCOS Training und Lifestyle Management', 
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
now()),

-- 3. Endometriose Management
('vita', 'clinical_protocol', 'Endometriose - Schmerzmanagement durch Bewegung', 
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
now()),

-- 4. Menopause Coaching
('vita', 'evidence_summary', 'Menopause Training - Kraft, Knochen, Vitalität', 
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
now()),

-- 5. Schwangerschaftsfitness
('vita', 'clinical_protocol', 'Schwangerschaftsfitness - Sicher durch alle Trimester', 
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
now());