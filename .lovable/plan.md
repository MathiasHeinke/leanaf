
# Aufräumen: KI-Features entfernen & Progress-Vergleich optimieren

## Zusammenfassung

Der Nutzer möchte die KI-Zielbild-Features aus dem Transformation-Bereich entfernen und stattdessen den Progress-Vergleich (echte Fotos vergleichen) prüfen und verbessern. Zusätzlich soll BMI durch FFMI ersetzt werden.

---

## Zu entfernende Features

### 1. Komplette KI-Zielbild-Generierung
- **AiTargetImageGeneration.tsx** - Die gesamte Komponente
- **KiComparisonView.tsx** - KI-Vergleichsansicht
- **Tab "KI Zielbild"** in TransformationJourneyWidget
- **Tab "KI-Vergleich"** in TransformationJourneyWidget

### 2. KI-Buttons und -Badges in GridPhotoView
- Filter-Option "KI-Bilder" im Dropdown
- Badge "KI-Transformiert" auf Fotos
- Button "Mit KI transformieren"
- Button "Transformation ansehen" (für KI)
- Button "Neu generieren" für KI-Bilder
- Badge "KI-Generiert"

### 3. KI-Features in ProgressCard
- Badge "KI-Transformiert"
- Button "Mit KI transformieren"
- Button "Transformation ansehen"
- Props: `hasAiTransformation`, `onViewTransformation`, `onCreateTransformation`

### 4. KI-Features in EnhancedComparisonView
- "Vergleich"-Mode (Original vs. KI-Zielbild)
- BeforeAfterSlider für KI-Vergleiche
- Alle Referenzen zu `targetImages` für KI

---

## Progress-Vergleich: Analyse & Verbesserungen

### Aktueller Stand (ProgressComparisonView.tsx)

Der Code ist **funktional gut**, aber hat Verbesserungspotenzial:

**Positiv:**
- Kategorie-Filter (Front/Seite/Rücken) funktioniert
- Vorher/Nachher-Auswahl via Select-Dropdowns
- BeforeAfterSlider für visuellen Vergleich
- Gewicht und KFA werden angezeigt

**Verbesserungsmöglichkeiten:**

| Problem | Lösung |
|---------|--------|
| Keine Statistik-Karte mit Fortschritt | Stats-Karte hinzufügen (Gewichtsdelta, KFA-Delta, Zeitraum) |
| Kein FFMI-Indikator | FFMI-Berechnung und -Anzeige hinzufügen |
| Keine Zeitleiste-Visualisierung | Mini-Timeline mit Thumbnails |
| Index-Handling kann verwirrend sein | Ältestes links, Neuestes rechts vorwählen |

---

## FFMI statt BMI

### Was ist FFMI?
Fat-Free Mass Index - aussagekräftiger für Fitness-orientierte Nutzer als BMI:

```
FFMI = (Gewicht × (1 - KFA/100)) / (Größe in m)²
```

### Wo BMI durch FFMI ersetzen:
- **GoalsProgressWidget.tsx** - Hier wird aktuell BMI berechnet und angezeigt
- Optional: Neues FFMI-Widget für Transformation

---

## Dateien & Änderungen

| Datei | Aktion |
|-------|--------|
| `src/components/TransformationJourney/TransformationJourneyWidget.tsx` | Tabs reduzieren auf 2: "Progress" & "Bilder", KI-Imports entfernen |
| `src/components/TransformationJourney/AiTargetImageGeneration.tsx` | LÖSCHEN |
| `src/components/TransformationJourney/KiComparisonView.tsx` | LÖSCHEN |
| `src/components/TransformationJourney/GridPhotoView.tsx` | KI-Filter, KI-Badges, KI-Buttons entfernen |
| `src/components/TransformationJourney/ProgressCard.tsx` | KI-Props und -Buttons entfernen |
| `src/components/TransformationJourney/EnhancedComparisonView.tsx` | KI-Vergleichsmodus entfernen |
| `src/components/TransformationJourney/ProgressComparisonView.tsx` | FFMI hinzufügen, Stats-Karte erweitern |
| `src/components/TransformationJourney/index.tsx` | Exports bereinigen |
| `src/hooks/useTargetImages.tsx` | KI-Generierungsfunktionen entfernen (behalten: Upload/Delete für manuelle Zielbilder) |
| `src/components/GoalsProgressWidget.tsx` | BMI durch FFMI ersetzen |

---

## Technische Details

### FFMI-Berechnung (neu)

```typescript
const calculateFFMI = (weightKg: number, heightCm: number, bodyFatPercent: number): number => {
  const heightM = heightCm / 100;
  const leanMassKg = weightKg * (1 - bodyFatPercent / 100);
  const ffmi = leanMassKg / (heightM * heightM);
  return ffmi;
};

const getFFMICategory = (ffmi: number, gender: 'male' | 'female'): string => {
  if (gender === 'male') {
    if (ffmi < 18) return 'Unter Durchschnitt';
    if (ffmi < 20) return 'Durchschnitt';
    if (ffmi < 22) return 'Gut trainiert';
    if (ffmi < 25) return 'Sehr muskulös';
    return 'Naturlimit erreicht';
  } else {
    if (ffmi < 14) return 'Unter Durchschnitt';
    if (ffmi < 16) return 'Durchschnitt';
    if (ffmi < 18) return 'Gut trainiert';
    if (ffmi < 21) return 'Sehr muskulös';
    return 'Naturlimit erreicht';
  }
};
```

### Verbesserte Stats-Karte für Progress-Vergleich

```typescript
// Neue Stats zwischen Vorher und Nachher
const weightDelta = afterPhoto.weight - beforePhoto.weight;
const kfaDelta = (afterPhoto.body_fat_percentage || 0) - (beforePhoto.body_fat_percentage || 0);
const daysBetween = differenceInDays(new Date(afterPhoto.date), new Date(beforePhoto.date));
const ffmiBefore = calculateFFMI(beforePhoto.weight, height, beforePhoto.body_fat_percentage || 20);
const ffmiAfter = calculateFFMI(afterPhoto.weight, height, afterPhoto.body_fat_percentage || 20);
```

---

## Geschätzter Aufwand

- **KI-Features entfernen**: 20-25 Minuten
- **Progress-Vergleich verbessern + FFMI**: 15-20 Minuten
- **Gesamt**: ~40-45 Minuten
