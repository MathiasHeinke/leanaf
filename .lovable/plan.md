
# Anreicherung: Lutein, Zeaxanthin, Glucosamin, Chondroitin

## Befund

Die neuen Wirkstoffe haben **leere `relevance_matrix`** - keine personalisierten Gewichtungen!

```
Lutein & Zeaxanthin    → relevance_matrix = {}  (leer)
Glucosamin & Chondroitin → relevance_matrix = {}  (leer)
```

## Deine Frage: Combo vs. Einzelwirkstoffe?

**Antwort: Für diese Fälle sind Combos OK, aber Matrix muss befüllt werden.**

### Warum Combos hier funktionieren:
- Lutein + Zeaxanthin werden **immer zusammen** supplementiert (synergistisch für Makula)
- Glucosamin + Chondroitin sind **klassische Gelenk-Kombi** (kaum einzeln verkauft)
- Anders als bei Multivitamin (wo einzelne Bestandteile separat existieren)

### Wann Einzelwirkstoffe nötig:
- Wenn die Stoffe auch **einzeln** in Produkten vorkommen
- Wenn **unterschiedliche Profile** unterschiedliche Stoffe brauchen (z.B. nur Glucosamin bei Vegetariern wg. Chondroitin aus Hai)

---

## Lösung: Matrix-Daten einfügen

### 1. Lutein & Zeaxanthin (Augengesundheit)

```sql
UPDATE supplement_database 
SET relevance_matrix = '{
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 2.0,
    "cognitive": 1.5,
    "maintenance": 1.0,
    "fat_loss": 0,
    "muscle_gain": 0
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_trt": 0.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "age_over_50": 2.5
  },
  "bloodwork_triggers": {},
  "lifestyle_modifiers": {
    "high_screen_time": 2.5,
    "outdoor_worker": 1.0
  }
}'::jsonb
WHERE name = 'Lutein & Zeaxanthin';
```

**Rationale:**
- Makuladegeneration ist altersbedingt → starker Boost ab 40+
- Bildschirmarbeit erhöht Blaulicht-Exposition → Screen-Time Modifier
- Nicht phasen-kritisch, aber Phase 2 (Longevity) relevant

### 2. Glucosamin & Chondroitin (Gelenke)

```sql
UPDATE supplement_database 
SET relevance_matrix = '{
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.5,
    "2": 1.0,
    "3": 2.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.5,
    "maintenance": 1.0,
    "fat_loss": 0.5,
    "longevity": 1.5,
    "cognitive": 0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "on_trt": 1.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "age_over_50": 2.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 2.0
  },
  "lifestyle_modifiers": {
    "heavy_training": 2.0,
    "joint_issues": 3.0
  }
}'::jsonb
WHERE name = 'Glucosamin & Chondroitin';
```

**Rationale:**
- Gelenkverschleiß korreliert mit Alter → starker 50+ Boost
- Phase 3 (Performance) relevant für intensive Trainierende
- TRT erhöht Trainingsintensität → mehr Gelenkbelastung
- Entzündungsmarker als Trigger

---

## Alternative: Aufsplitten in 4 Einzelwirkstoffe

Falls du maximale Granularität willst:

| Wirkstoff | Eigenes Profil |
|-----------|----------------|
| **Lutein** | Makula, Kontrast |
| **Zeaxanthin** | Makula-Zentrum |
| **Glucosamin** | Knorpelaufbau, vegan-verfügbar |
| **Chondroitin** | Knorpelschutz, nur tierisch |

**Vorteil:** Vegetarier bekommen Glucosamin ohne Chondroitin empfohlen
**Nachteil:** Mehr Datenpflege, kaum Produkte mit nur einem davon

---

## Empfehlung

**Für jetzt: Combos beibehalten + Matrix anreichern** (Phase 1)
**Später optional: Aufsplittung** wenn es Produkte mit nur einem der Stoffe gibt

---

## Betroffene Aktion

| Was | Wie |
|-----|-----|
| Lutein & Zeaxanthin | SQL-Update mit relevance_matrix |
| Glucosamin & Chondroitin | SQL-Update mit relevance_matrix |

Soll ich die SQL-Updates direkt ausführen?
