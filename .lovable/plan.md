
# Plan: Phase 0 Validierungslogik anpassen

## Zusammenfassung der Aenderungen

Die aktuellen Phase 0 Items "KFA-Trend" und "Protein & Training" haben zu strenge Validierungskriterien. Wir passen die Logik an, um sie realistischer und einsteigerfreundlicher zu machen.

---

## 1. Aktuelle vs. neue Logik

### KFA-Trend

| Aspekt | AKTUELL | NEU |
|--------|---------|-----|
| Messungen | Min. 2 | Min. 5 aufeinanderfolgend |
| Kriterium | Letzte < Erste | Trend ist negativ (fallend) |
| Zielwert | Keiner (nur Trend) | Keiner (bleibt) |
| Abschluss | 2 Messungen + fallend | 5 Messungen + fallend |

### Protein & Training

| Aspekt | AKTUELL | NEU |
|--------|---------|-----|
| Protein-Ziel | 1.2g/kg Durchschnitt | 1.2g/kg an 5 Tagen (max!) |
| Training-Ziel | 150 Min Zone 2/Woche | 5x Training ODER 5x 6000 Schritte |
| Training-Typen | Nur Zone 2 Cardio | Alle Typen (Kraft, Cardio, VO2max, Zone2) |
| Ausnahme | - | Ruhetage zaehlen NICHT |
| Fokus | Werte erreichen | Konsistenz/Tracking aufbauen |

---

## 2. Technische Umsetzung

### Datei: `src/hooks/usePhase0ItemProgress.ts`

#### A) Queries erweitern (Zeilen 72-126)

```typescript
// AENDERN: Mehr KFA-Messungen laden (10 statt 5)
// Weight with KFA for trend - need more for consecutive check
(supabase as any)
  .from('weight_history')
  .select('weight, body_fat_percentage, date')
  .eq('user_id', user.id)
  .not('body_fat_percentage', 'is', null)
  .order('date', { ascending: false })
  .limit(10),  // War: 5

// AENDERN: Training Query - alle Typen, mehr Tage
(supabase as any)
  .from('training_sessions')
  .select('training_type, session_date, session_data')
  .eq('user_id', user.id)
  .gte('session_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  .neq('training_type', 'rest')  // Ruhetage ausschliessen
  .order('session_date', { ascending: false }),
```

#### B) KFA-Trend Logik anpassen (Zeilen 223-258)

```typescript
// === KFA TREND (NEU: 5 aufeinanderfolgende Messungen, fallender Trend) ===
const kfaData = weightWithKfaResult.data || [];
const kfaMeasurements = kfaData.length;

// Pruefe auf 5 aufeinanderfolgende Messungen mit fallendem Trend
let consecutiveDown = 0;
if (kfaMeasurements >= 2) {
  for (let i = 0; i < kfaMeasurements - 1; i++) {
    const current = kfaData[i]?.body_fat_percentage;
    const previous = kfaData[i + 1]?.body_fat_percentage;
    if (current && previous && current < previous) {
      consecutiveDown++;
    } else {
      break; // Trend unterbrochen
    }
  }
}

const latestKfa = kfaData[0]?.body_fat_percentage;
const kfaTrendComplete = consecutiveDown >= 4; // 5 Messungen = 4 Vergleiche
const kfaProgress = kfaMeasurements === 0 
  ? 0 
  : kfaTrendComplete 
    ? 100 
    : Math.min(90, (consecutiveDown / 4) * 90 + (kfaMeasurements / 5) * 10);

progress.kfa_trend = {
  key: 'kfa_trend',
  progress: Math.round(kfaProgress),
  current: kfaMeasurements > 0 
    ? `${latestKfa?.toFixed(1)}% KFA` 
    : 'Keine Messungen',
  target: '5x fallend',
  status: kfaTrendComplete ? 'completed' : kfaMeasurements > 0 ? 'in_progress' : 'not_started',
  stats: {
    measurements: kfaMeasurements,
    measurementsRequired: 5,
    consecutiveDown: consecutiveDown,
    trend: consecutiveDown > 0 ? 'down' : 'stable',
  },
  explanation: kfaMeasurements === 0 
    ? 'Trage deinen Koerperfettanteil (KFA) ein. Ziel: 5 aufeinanderfolgende Messungen mit fallendem Trend.'
    : `${consecutiveDown + 1}/5 Messungen zeigen fallenden Trend. Weiter so!`,
  actionLabel: 'KFA messen',
  actionHref: '/body',
};
```

#### C) Protein & Training komplett ueberarbeiten (Zeilen 260-308)

```typescript
// === PROTEIN & TRAINING (NEU: Konsistenz-Fokus) ===
const mealData = mealsResult.data || [];
const trainingData = trainingResult.data || [];

// --- PROTEIN: 5 Tage mit >= 1.2g/kg ---
const proteinTarget = userWeight ? Math.round(userWeight * 1.2) : null;
const mealsByDay = new Map<string, number>();

mealData.forEach((m: any) => {
  const day = new Date(m.created_at).toDateString();
  mealsByDay.set(day, (mealsByDay.get(day) || 0) + (m.protein || 0));
});

// Zaehle Tage mit erreichtem Proteinziel
let proteinDaysHit = 0;
if (proteinTarget) {
  mealsByDay.forEach((protein) => {
    if (protein >= proteinTarget) proteinDaysHit++;
  });
}
const proteinComplete = proteinDaysHit >= 5;

// --- TRAINING: 5x Training ODER 5x 6000+ Schritte ---
const trainingDays = new Set(
  trainingData
    .filter((t: any) => ['rpt', 'zone2', 'vo2max'].includes(t.training_type))
    .map((t: any) => t.session_date)
).size;

// Steps aus movement sessions oder session_data
const stepDays = trainingData
  .filter((t: any) => {
    if (t.training_type === 'movement') {
      const steps = t.session_data?.steps || 0;
      return steps >= 6000;
    }
    return false;
  })
  .map((t: any) => t.session_date);
const stepDaysCount = new Set(stepDays).size;

const trainingComplete = trainingDays >= 5 || stepDaysCount >= 5;
const trainingProgress = Math.max(
  Math.min(100, (trainingDays / 5) * 100),
  Math.min(100, (stepDaysCount / 5) * 100)
);

// Kombinierter Fortschritt
const proteinProgress = proteinTarget 
  ? Math.min(100, (proteinDaysHit / 5) * 100) 
  : 0;
const combinedProgress = !userWeight 
  ? 0 
  : Math.round((proteinProgress * 0.5) + (trainingProgress * 0.5));

progress.protein_training = {
  key: 'protein_training',
  progress: combinedProgress,
  current: userWeight 
    ? `${proteinDaysHit}d Protein / ${trainingDays}x Training` 
    : 'Gewicht fehlt',
  target: '5d / 5x',
  status: (proteinComplete && trainingComplete) ? 'completed' : combinedProgress > 0 ? 'in_progress' : 'not_started',
  subItems: userWeight ? [
    { 
      label: `Protein: ${proteinDaysHit}/5 Tage erreicht`, 
      completed: proteinComplete, 
      explanation: `Tage mit >= ${proteinTarget}g Protein (1.2g x ${userWeight}kg)` 
    },
    { 
      label: `Training: ${trainingDays}/5 Sessions`, 
      completed: trainingDays >= 5, 
      explanation: 'Kraft, Zone 2 oder VO2max (keine Ruhetage)' 
    },
    { 
      label: `Alternativ: ${stepDaysCount}/5 Tage 6000+ Schritte`, 
      completed: stepDaysCount >= 5, 
      explanation: 'Bewegung zaehlt auch!' 
    },
  ] : undefined,
  explanation: userWeight 
    ? `Konsistenz aufbauen: 5 Tage mit >= ${proteinTarget}g Protein UND 5x Training (oder 6000+ Schritte). Kein Ruhetag zaehlt!`
    : 'Zuerst Gewicht eintragen fuer Proteinziel.',
  actionLabel: userWeight ? 'Tracking starten' : 'Gewicht eintragen',
  actionHref: userWeight ? '/coach' : '/body',
};
```

---

## 3. UI-Anpassungen (optional)

Die Sub-Items zeigen jetzt klar:
- Protein: X/5 Tage erreicht
- Training: X/5 Sessions
- Alternativ: X/5 Tage 6000+ Schritte

Der dritte Sub-Item macht die Alternative (Schritte) sichtbar.

---

## 4. Zusammenfassung der Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/usePhase0ItemProgress.ts` | Query: KFA limit 10, Training mit session_data |
| `src/hooks/usePhase0ItemProgress.ts` | KFA: 5 konsekutive fallende Messungen |
| `src/hooks/usePhase0ItemProgress.ts` | Protein: 5 Tage mit 1.2g/kg |
| `src/hooks/usePhase0ItemProgress.ts` | Training: 5x beliebig ODER 5x 6000 Schritte |

---

## 5. Warum diese Aenderungen sinnvoll sind

1. **Realistischer Einstieg**: 1.2g/kg Protein ist fuer Anfaenger schon ambitioniert
2. **Fokus auf Konsistenz**: 5 Tage Tracking baut Gewohnheiten auf
3. **Flexibilitaet**: Jede Trainingsart zaehlt (nicht nur Zone 2)
4. **Alternative fuer Nicht-Sportler**: 6000 Schritte sind machbar
5. **KFA-Trend statt Zielwert**: Jeder Startpunkt ist okay, Richtung zaehlt
