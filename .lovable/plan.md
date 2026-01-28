
# Upgrade: BioAgeBadge mit Live Bio-Age Daten und Layout-Fix

## Problemanalyse

### 1. Mock-Daten im Badge
Das aktuelle `BioAgeBadge` zeigt nur das chronologische Alter aus `profileData?.age` (41 Jahre). Die tatsächlichen Bio-Age Daten aus `useAresBioAge` werden nicht genutzt:
- **proxyBioAge**: Berechnetes biologisches Alter
- **agingPace**: Alterungsgeschwindigkeit (z.B. 0.85 = altert 15% langsamer)
- **chronoAge**: Chronologisches Alter

### 2. Layout-Problem (verrutschte Elemente)
Im Screenshot ist das Badge rechts oben nicht auf einer Linie mit dem Greeting:
- `AresGreeting` hat `flex flex-col gap-1` 
- `BioAgeBadge` hat `flex flex-col items-end`
- Das umschließende `div` nutzt `flex justify-between items-start`

Das Problem: Unterschiedliche Höhen und kein vertikales Alignment.

### 3. Fehlende Premium-Infos
User sehen nur "41 Jahre | Dein Alter" - langweilig! ARES sollte zeigen:
- **Bio-Age vs Chrono-Age** Delta
- **Aging Pace** (Alterungstempo mit visueller Skala)
- **Trend-Indikator** (jünger/älter)

---

## Lösung

### Datei: `src/pages/AresHome.tsx`

**Änderung 1**: Import von `useAresBioAge` hinzufügen und Daten nutzen:

```typescript
// Bereits importiert: useBioAge für DunedinPACE
import { useAresBioAge } from '@/hooks/useAresBioAge';

// In der Komponente:
const { proxyBioAge, agingPace, chronoAge, confidenceLevel, loading: bioAgeLoading } = useAresBioAge();
const { latestMeasurement } = useBioAge();

// Smarte Daten-Auswahl:
const hasDunedin = latestMeasurement?.measurement_type === 'dunedin_pace';
const displayBioAge = hasDunedin 
  ? latestMeasurement?.calculated_bio_age 
  : proxyBioAge;
const displayChronoAge = chronoAge || profileData?.age || null;
const displayAgingPace = hasDunedin 
  ? latestMeasurement?.dunedin_pace 
  : agingPace;
```

**Änderung 2**: BioAgeBadge mit neuen Props aufrufen:

```typescript
<BioAgeBadge 
  bioAge={displayBioAge} 
  realAge={displayChronoAge}
  chronologicalAge={displayChronoAge}
  agingPace={displayAgingPace}
  loading={bioAgeLoading}
/>
```

---

### Datei: `src/components/home/BioAgeBadge.tsx`

**Komplettes Redesign** mit verbessertem Layout und Aging Pace:

```typescript
interface BioAgeBadgeProps {
  bioAge?: number | null;
  realAge?: number | null;
  chronologicalAge?: number | null;
  agingPace?: number | null;  // NEU: 0.85 = 15% langsamer, 1.15 = 15% schneller
  loading?: boolean;          // NEU: Loading State
  className?: string;
}
```

**Neue UI-Struktur** (Premium 2-Zeilen Badge):

```text
┌─────────────────────────┐
│ ✨ 38.2 Jahre     ▼ 2.8 │  ← Bio-Age + Delta Badge
│ Pace: 0.85 (💚 Elite)   │  ← Aging Pace mit Status
└─────────────────────────┘
```

**Alterungs-Pace Interpretation:**
| Pace | Status | Farbe |
|------|--------|-------|
| ≤0.65 | Elite | Grün |
| ≤0.80 | Excellent | Grün-Blau |
| ≤0.95 | Good | Blau |
| ≤1.05 | Average | Gelb |
| >1.05 | Accelerated | Orange/Rot |

---

### Datei: Layout-Fix im Header

**Aktuelles Problem** (Zeile 493-500):
```typescript
<div className="flex justify-between items-start">
  <AresGreeting userName={userName} streak={streak || undefined} />
  <BioAgeBadge ... />
</div>
```

**Fix**: Vertikales Centering für die erste Zeile:
```typescript
<div className="flex justify-between items-center">
  <AresGreeting userName={userName} streak={streak || undefined} />
  <BioAgeBadge ... />
</div>
```

Plus: `AresGreeting` Streak-Badge in separates Row verschieben, damit die Hauptzeile gleich hoch bleibt.

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/home/BioAgeBadge.tsx` | REWRITE | Neues Design mit Aging Pace + Loading State |
| `src/pages/AresHome.tsx` | EDIT | useAresBioAge integrieren, Props anpassen |

---

## Erwartetes Ergebnis

**Vorher:**
```text
MITTWOCH, 28. JAN                    👤 41 Jahre
Gute Nacht, Mathias                     Dein Alter
```

**Nachher:**
```text
MITTWOCH, 28. JAN          ✨ 38.2 J  ▼ -2.8
Gute Nacht, Mathias            Pace 0.85 (Elite)
```

Oder wenn nur Chrono-Age vorhanden:
```text
MITTWOCH, 28. JAN                    👤 41 Jahre  
Gute Nacht, Mathias             Bio-Age berechnen →
```

---

## Technische Details

### Aging Pace Berechnung
`useAresBioAge` berechnet bereits den `agingPace`:
- Basiert auf 5 Domains (Body, Fitness, Sleep, Nutrition, Hormone)
- Score < 1.0 = biologisch jünger
- Score > 1.0 = biologisch älter

### Fallback-Logik
1. DunedinPACE vorhanden → Zeige Lab-Werte
2. Proxy-Berechnung vorhanden → Zeige berechnete Werte
3. Nur Chrono-Age → Zeige einfaches Badge mit CTA

### Click-Handler
Badge soll beim Klick das `BioAgeSheet` öffnen für Details.
