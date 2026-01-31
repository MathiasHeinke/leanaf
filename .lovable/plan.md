
# ARES Matrix-Optimierung: Quick Wins Umsetzung

## Analyse-Ergebnis (basierend auf PDF)

Die Matrix mit 111 Wirkstoffen zeigt 6 kritische Problembereiche. Folgende Quick Wins werden SOFORT umgesetzt:

---

## Quick Win 1: Duplikate bereinigen (SQL-Migrations-Script)

| Wirkstoff | Zu entfernende Duplikate | Behalten |
|-----------|--------------------------|----------|
| NMN | `NMN (Nicotinamid Mononukleotid)` (5.0), `NMN sublingual` (5.5) | `NMN` (9.0, specialist) |
| Magnesium | `Magnesium` (5.0), `Magnesiumcitrat` (5.0), `Magnesium Komplex 11` (5.0) | `Magnesium Glycinat` (9.5, essential) |
| Creatin | `Creatin` (5.0) | `Creatine Monohydrat` (9.8, essential) |
| Omega-3 | `Omega-3` (5.0) | `Omega-3 (EPA/DHA)` (9.2, essential) |
| Vitamin D | `Vitamin D3` (5.0), `Vitamin D Balance` (5.0), `Vitamin D3 + K2 MK7 Tropfen` (5.0) | `Vitamin D3 + K2` (9.0, essential) |
| EAA | - | Beide behalten (EAA 8.5, EAA Komplex 8.0 - Produktvarianten) |
| HMB | `HMB 3000` (5.0) | `HMB` (7.5, optimizer) |
| Alpha-Liponsaeure | `Alpha-Ketoglutarat (AKG)` ist separate Substanz | Pruefen ob beide noetig |
| CaAKG | `Ca-AKG (Rejuvant)` (6.0) | `CaAKG` (8.5, specialist) |
| GlyNAC | `GLY-NAC` (5.0) | `GlyNAC` (8.5, specialist) |
| Ashwagandha | `Ashwagandha` (5.0) | `Ashwagandha KSM-66` (7.8, optimizer) |
| Alpha-Liponsaeure | `Alpha Liponsaeure` (7.5, antioxidant) | Pruefen gegenueber `Alpha-Liponsaeure` (6.8, Energie) |

**Aktion**: SQL-Script erstellt, das `relevance_matrix` von Duplikaten auf NULL setzt (entfernt sie aus Matrix-Export, aber behaelt Produkt-Links)

---

## Quick Win 2: Sprache vereinheitlichen

**Aktueller Stand**:
- `evidence_level`: 60x `moderat`, 18x `moderate`, 22x `stark`, 11x `strong`

**Mapping**:
```text
moderat   → moderate (60 Zeilen)
stark     → strong (22 Zeilen)
```

**Aktion**: SQL UPDATE Statement

---

## Quick Win 3: Kategorien normalisieren

**Aktueller Stand (42 unique Kategorien mit Mix)**:
- `longevity` (8x) vs `Longevity` (2x)
- `sleep` (1x) vs `Schlaf` (6x)
- `brain` (2x) vs `cognitive` (1x)
- `antioxidant` (3x) vs `Antioxidantien` (4x)
- `sport` (5x) vs `Performance` (4x)
- `metabolic` (1x) vs `Energie` (4x)
- `recovery` (1x) vs `Muskelerhalt` (3x)

**Mapping (Deutsch als Standard)**:
```text
longevity      → Longevity
sleep          → Schlaf
brain          → Kognition
cognitive      → Kognition
antioxidant    → Antioxidantien
recovery       → Muskelerhalt
specialized    → Spezialisiert
musculoskeletal → Gelenke
hormonal       → Hormone
liver          → Leber
```

**Aktion**: SQL UPDATE Statements

---

## Quick Win 4: Kritische Modifier-Neugewichtung

Basierend auf der wissenschaftlichen Analyse im PDF:

### A) NMN - Alters-Modifier begrenzen

```text
Vorher:
  demo_age_over_50: +3.0
  demo_age_over_60: +4.0
  bw_nad_low: +4.0
  MAX = +16.0 (viel zu hoch!)

Nachher:
  demo_age_over_40: +1.0 (NEU)
  demo_age_over_50: +2.0 (war 3.0)
  demo_age_over_60: +3.0 (war 4.0)
  bw_nad_low: +4.0 (bleibt)
  MAX = +10.0
```

### B) HMB - GLP-1 Modifier korrigieren

```text
Vorher:
  ctx_enhanced_no_trt: +5.0 (falsche Spalte!)
  
Nachher:
  ctx_on_glp1: +4.0 (NEU - richtige Spalte)
  syn_semaglutide: +3.0 (NEU)
  syn_tirzepatide: +3.0 (NEU)
  syn_retatrutide: +4.0 (bleibt)
  ctx_enhanced_no_trt: +2.0 (war 5.0)
```

### C) Tongkat Ali - Natural-Boost reduzieren

```text
Vorher:
  ctx_true_natural: +3.5 (zu hoch fuer normalen T)
  
Nachher:
  ctx_true_natural: +1.5 (war 3.5)
  bw_testosterone_low: +4.0 (bleibt)
  demo_is_male: +1.0 (NEU)
```

### D) Berberin - Insulin-Modifier ergaenzen

```text
Vorher:
  bw_glucose_high: +3.5
  bw_insulin_resistant: 0 (fehlt!)
  
Nachher:
  bw_glucose_high: +3.0 (war 3.5)
  bw_insulin_resistant: +4.0 (NEU)
```

**Aktion**: SQL UPDATE Statements fuer relevance_matrix JSONB

---

## Quick Win 5: Modifier-Cap im Scoring-Code

Um zu verhindern, dass Optimizer/Specialists die Essentials ueberholen:

```typescript
// In calculateRelevanceScore.ts
const MAX_SINGLE_MODIFIER = 4.0;  // Kein einzelner Modifier > 4.0
const MAX_TOTAL_BOOST = 12.0;     // Gesamt-Boost gecapped
```

**Aktion**: Code-Update in `src/lib/calculateRelevanceScore.ts`

---

## Technische Umsetzung

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/utils/matrixCleanupQueries.ts` | SQL-Statements fuer alle Quick Win Korrekturen |

### Geaenderte Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/lib/calculateRelevanceScore.ts` | MAX_SINGLE_MODIFIER und MAX_TOTAL_BOOST Caps einfuegen |
| `src/pages/Admin.tsx` | Button fuer "Matrix Cleanup ausfuehren" hinzufuegen |

---

## Ablauf

1. Erstelle `matrixCleanupQueries.ts` mit allen SQL-Statements
2. Fuege Modifier-Caps in `calculateRelevanceScore.ts` ein
3. Fuege Admin-Button hinzu zum Ausfuehren der Cleanup-Queries
4. Teste mit CSV-Export: Sollten ~90 unique Wirkstoffe statt 111 sein

---

## Erwartetes Ergebnis

- **~20 weniger Eintraege** (Duplikate entfernt)
- **Konsistente Sprache**: Nur `moderate`/`strong`, Deutsche Kategorien
- **Faire Rankings**: Essentials bleiben an der Spitze, auch bei 60+ Longevity-Profilen
- **Praezisere Modifier**: GLP-1-User bekommen korrekte HMB-Empfehlung
