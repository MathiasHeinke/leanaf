

## Phase 0 Validierungslogik – Korrekturen

### Zusammenfassung der Änderungen

Es müssen **4 Fehler** in zwei Dateien korrigiert werden, um die Validierungslogik an die tatsächlichen ARES-Anforderungen anzupassen.

---

### 1. Schlaf-Hygiene: 7.5h → 7h

**Betroffene Stellen:**

| Datei | Zeile | Änderung |
|-------|-------|----------|
| `Phase0Checklist.tsx` | 41 | Beschreibung: `≥7.5h Schlaf` → `≥7h Schlaf` |
| `Phase0Checklist.tsx` | 126 | Auto-Validierung: `avgSleep >= 7.5` → `avgSleep >= 7` |
| `usePhase0ItemProgress.ts` | 147 | Target-Wert bereits korrekt (7h) ✓ |

Die Hook-Datei nutzt bereits `sleepTarget = 7`, aber die Checklist-Komponente zeigt noch den falschen Wert an und validiert auf 7.5h.

---

### 2. Training: 6000 Schritte-Option sichtbar machen

**Problem:** In der Beschreibung vor dem Aufklappen steht nur `≥1.8g/kg Protein + ≥180 Min Zone 2/Woche`, aber die 6000-Schritte-Alternative ist nicht erwähnt.

| Datei | Zeile | Änderung |
|-------|-------|----------|
| `Phase0Checklist.tsx` | 66 | `≥1.8g/kg Protein + ≥180 Min Zone 2/Woche` → `≥1.2g/kg Protein + 5× Training ODER 6k Schritte` |

**Bonus-Korrektur:** Die Beschreibung zeigt auch falsche Proteinwerte (1.8g/kg statt 1.2g/kg).

---

### 3. KFA-Trend: Vereinfachte Logik

**Aktuelle (zu strenge) Logik:**
- 5 konsekutive Messungen mit fallendem Trend erforderlich
- `consecutiveDown >= 4` (also 5 Messungen mit 4 Vergleichen)

**Neue (realistische) Logik:**
- Mindestens **3 Messungen** vorhanden
- **Mindestens 1 Messung** zeigt Abwärtstrend (aktuelle < vorherige)

| Datei | Zeile | Änderung |
|-------|-------|----------|
| `usePhase0ItemProgress.ts` | 232-277 | Komplette KFA-Logik vereinfachen |
| `Phase0Checklist.tsx` | 169-184 | Auto-Validierung anpassen |
| `Phase0Checklist.tsx` | 73 | Beschreibung: `KFA bekannt und fallend (Männer <20%)` → `≥3 Messungen, mind. 1× fallend` |

**Neue Validierungslogik:**
```
Erfüllt wenn:
  - kfaMeasurements >= 3 (mindestens 3 Messungen)
  - UND hasAnyDownwardTrend == true (irgendeine Messung < vorherige)
```

---

### 4. Blutwerte: Bereits korrekt

Die aktuelle Logik verlangt hochgeladene Blutwerte mit ≥10 von 15 Markern – das passt bereits. Hier keine Änderung nötig.

---

### Technische Umsetzung

**Datei 1: `src/components/protocol/phase-0/Phase0Checklist.tsx`**

1. Zeile 41: Sleep-Beschreibung korrigieren
2. Zeile 66: Protein/Training-Beschreibung korrigieren
3. Zeile 73: KFA-Beschreibung korrigieren
4. Zeile 126: Sleep Auto-Validierung auf 7h ändern
5. Zeilen 169-184: KFA Auto-Validierung vereinfachen (3 Messungen, 1× fallend)

**Datei 2: `src/hooks/usePhase0ItemProgress.ts`**

1. Zeilen 232-277: KFA-Trend Logik komplett überarbeiten:
   - `measurementsRequired: 3` statt 5
   - Neue Variable `hasAnyDownwardTrend` statt `consecutiveDown >= 4`
   - Progress-Berechnung anpassen
   - Target-Text: `≥3 Messungen` statt `5× fallend`
   - Explanation anpassen

---

### Zusammenfassung der neuen Anforderungen

| Check | Neue Anforderung |
|-------|-----------------|
| **Schlaf** | 7 Tage getrackt, Ø ≥7h |
| **Protein** | 5 Tage mit ≥1.2g/kg (unverändert) |
| **Training** | 5× Training ODER 5× 6000+ Schritte (unverändert, aber jetzt sichtbar) |
| **KFA** | ≥3 Messungen + mind. 1× fallend |
| **Blutwerte** | ≥10/15 ARES-Marker hochgeladen (unverändert) |

