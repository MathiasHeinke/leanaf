

# Bio-Age Engine & Layer 2 Sheet Implementation

## Zusammenfassung

Wir implementieren den **ARES Bio-Age Proxy Algorithmus** als vollständige Berechnungs-Engine mit 5 Domänen (Body, Fitness, Sleep, Nutrition, Hormone) und einem Layer 2 Sheet zur Visualisierung. Der Algorithmus berechnet ein Bio-Age basierend auf den letzten 28 Tagen Tracking-Daten und gibt dem User sofortiges Feedback.

---

## Vorhandene Datenquellen (verifiziert)

| Domäne | Tabelle | Felder | Status |
|--------|---------|--------|--------|
| **Body** | `profiles` | `age`, `gender`, `weight`, `height` | ✅ |
| **Body** | `weight_history` | `weight`, `body_fat_percentage`, `date` | ✅ |
| **Body** | `body_measurements` | `waist`, `hips`, `chest`, `neck` | ✅ |
| **Fitness** | `training_sessions` | `training_type`, `session_date`, `total_duration_minutes` | ✅ |
| **Sleep** | `sleep_tracking` | `sleep_hours`, `sleep_quality` (1-5), `bedtime`, `wake_time` | ✅ |
| **Nutrition** | `meals` | `calories`, `protein`, `carbs`, `fats` | ✅ |
| **Nutrition** | `daily_goals` | `protein`, `calories` (Zielwerte) | ✅ |
| **Hormone** | `hormone_tracking` | `energy_level`, `stress_level`, `libido_level` (1-10) | ✅ |
| **Bloodwork** | `user_bloodwork` | `albumin`, `creatinine`, `hs_crp`, `fasting_glucose`, `wbc` | ✅ |

---

## Lösung

### Teil 1: useAresBioAge Hook (Berechnungs-Engine)

**Neue Datei:** `src/hooks/useAresBioAge.ts`

**Interface:**
```typescript
interface AresBioAgeResult {
  proxyBioAge: number;              // Geschätztes Bio-Alter
  agingPace: number;                // 0.75-1.25 (Jahre pro Jahr)
  chronoAge: number;                // Aus Profil
  totalScore: number;               // 0-100 Gesamtscore
  confidenceLevel: 'low' | 'medium' | 'high';
  domainScores: {
    body: number;      // 0-100
    fitness: number;   // 0-100
    sleep: number;     // 0-100
    nutrition: number; // 0-100
    hormone: number;   // 0-100
  };
  dataCompleteness: number;         // 0-1 (wie viele Daten vorhanden)
  hasBloodwork: boolean;
  recommendations: string[];        // Top 3 Verbesserungsvorschläge
}
```

**Daten-Aggregation (letzte 28 Tage parallel):**
```typescript
const [profile, weights, measurements, training, sleep, meals, hormones, bloodwork] = 
  await Promise.all([
    supabase.from('profiles').select('age, gender, weight, height')...,
    supabase.from('weight_history').select('weight, body_fat_percentage, date')...,
    supabase.from('body_measurements').select('waist, hips')...,
    supabase.from('training_sessions').select('training_type, session_date, total_duration_minutes')...,
    supabase.from('sleep_tracking').select('sleep_hours, sleep_quality')...,
    supabase.from('meals').select('calories, protein')...,
    supabase.from('hormone_tracking').select('energy_level, stress_level, libido_level')...,
    supabase.from('user_bloodwork').select('*').order('test_date', { ascending: false }).limit(1)
  ]);
```

**Domain-Score-Formeln (aus PDF):**

1. **Body Composition (25%):**
   - BMI Score: Optimal 20-25 → 100, Abweichung → Abzüge
   - Body Fat: Gender-spezifisch (M: 12-18%, F: 20-28%)
   - WHR (Waist-Hip-Ratio): Optimal M<0.9, F<0.85
   - Trend-Bonus: Wenn KFA sinkend → +10

2. **Fitness (25%):**
   - Workout-Konsistenz: 4+/Woche → 100
   - Zone 2 Cardio: 150min/Woche → 100
   - Kraft-Training: 3x/Woche → 100
   - Cardio-Typ-Bonus: "cardio_zone2" → +10

3. **Sleep (20%):**
   - Dauer: 7-9h → 100, Abweichung → Abzüge
   - Qualität: Avg der 1-5 Skala → 0-100
   - Konsistenz: Std.Dev < 1h → Bonus

4. **Nutrition (15%):**
   - Protein/kg: ≥1.6g/kg → 100
   - Kalorienbalance: Konsistenz (CV < 15%) → 100

5. **Hormone/Energy (15%):**
   - Energy Level: Avg 1-10 → 0-100
   - Stress Level: 10 - Avg → 0-100 (invertiert)
   - Libido Level: Avg 1-10 → 0-100

**Berechnung:**
```typescript
const weights = { body: 0.25, fitness: 0.25, sleep: 0.20, nutrition: 0.15, hormone: 0.15 };
const totalScore = Object.entries(domainScores).reduce(
  (sum, [domain, score]) => sum + score * weights[domain], 0
);

// Bio-Age: Score 100 = 10 Jahre jünger
const bioAge = chronoAge - ((totalScore - 50) / 5);

// Aging Pace: Score 100 = 0.75, Score 0 = 1.25
const agingPace = 1.0 - ((totalScore - 50) / 200);
```

**PhenoAge-Erweiterung (wenn Bloodwork):**
Wenn ≥5 der Marker vorhanden (albumin, creatinine, hs_crp, fasting_glucose, wbc):
- Berechne PhenoAge-Proxy mit Levine-Koeffizienten
- Blend: 60% Verhaltensscore + 40% Blutscore
- Confidence: "high"

**Confidence-Level:**
```typescript
if (hasBloodwork && dataCompleteness > 0.7) return 'high';
if (dataCompleteness > 0.5) return 'medium';
return 'low';
```

**Recommendations Generator:**
Sortiere Domänen nach Score, generiere Tipps für die schwächsten 2:
- Sleep < 70 → "Schlafzeit auf 7-9h optimieren"
- Fitness < 70 → "Zone 2 Cardio auf 150min/Woche erhöhen"
- Body < 70 → "Körperfett reduzieren für bessere Körperkomposition"
- etc.

---

### Teil 2: BioAgeSheet (Layer 2 UI)

**Neue Datei:** `src/components/home/sheets/BioAgeSheet.tsx`

**Layout:**
```text
┌─────────────────────────────────────┐
│ [Handle Bar]                        │
├─────────────────────────────────────┤
│ Biologisches Alter           [X]    │
│ ARES Bio-Age Proxy                  │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │    34     →     29.4        │    │
│  │  Chrono       Bio-Age       │    │
│  ├─────────────────────────────┤    │
│  │      Aging Pace: 0.85       │    │
│  │  [🐢═══●═══════════🔥]      │    │
│  │   Slow            Fast      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ⚡ Confidence: MEDIUM              │
│  (28 Tage Tracking-Daten)           │
│                                     │
│ ── Domain Breakdown ──              │
│ Body Comp     ████████░░  82        │
│ Fitness       ██████████  95        │
│ Sleep         ██████░░░░  68   ⚠    │
│ Nutrition     █████████░  88        │
│ Hormones      ███████░░░  74        │
│                                     │
│ ── Empfehlungen ──                  │
│ 💡 Schlaf auf 7-9h optimieren       │
│ 💡 Hormon-Tracking regelmäßiger     │
│                                     │
├─────────────────────────────────────┤
│ [  Blutwerte hinzufügen  ]  [⚙️]   │
│  Für höhere Confidence              │
└─────────────────────────────────────┘
```

**Komponenten:**

1. **Hero Section (Tachometer):**
   - Links: Chrono-Age (grau, 2xl)
   - Pfeil-Animation → (Motion)
   - Rechts: Bio-Age (groß, farbcodiert: grün wenn jünger, rot wenn älter)
   - Aging Pace als horizontaler Slider mit Marker

2. **Confidence Badge:**
   - Low → Orange mit "Mehr Daten tracken"
   - Medium → Blue mit "28 Tage Basis"
   - High → Green mit "Inkl. Blutwerte"

3. **Domain Progress Bars:**
   - 5 horizontale Bars mit Score 0-100
   - Farbcodierung: <50 rot, 50-70 gelb, >70 grün
   - Schwächste Domain markiert mit ⚠

4. **Recommendations:**
   - 2-3 kurze, actionable Tipps
   - Basierend auf schwächsten Domänen

5. **Footer:**
   - Primary: "Blutwerte hinzufügen" → navigate('/bloodwork')
   - Secondary: Settings-Icon → Future Bio-Age Settings

---

### Teil 3: BioAgeWidget Update

**Datei:** `src/components/home/widgets/BioAgeWidget.tsx`

**Änderungen:**
```typescript
interface BioAgeWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;  // NEU
}

// Ersetze useBioAge mit useAresBioAge für Live-Berechnung
const { proxyBioAge, agingPace, chronoAge, totalScore, confidenceLevel, loading } = useAresBioAge();

// Fallback auf alten Hook wenn User DunedinPACE hat
const { latestMeasurement } = useBioAge();
const hasDunedin = latestMeasurement?.measurement_type === 'dunedin_pace';

// Zeige DunedinPACE wenn vorhanden, sonst Proxy
const displayBioAge = hasDunedin 
  ? latestMeasurement?.calculated_bio_age 
  : proxyBioAge;

// onClick für alle Varianten:
onClick={() => onOpenSheet ? onOpenSheet() : navigate('/bio-age')}
```

---

### Teil 4: WidgetRenderer & MetricWidgetGrid

**Datei:** `src/components/home/widgets/WidgetRenderer.tsx`

```typescript
interface WidgetRendererProps {
  // ... bestehende props
  onOpenBioAgeSheet?: () => void;  // NEU
}

case 'bio_age':
  return <BioAgeWidget size={size} onOpenSheet={onOpenBioAgeSheet} />;
```

**Datei:** `src/components/home/MetricWidgetGrid.tsx`

```typescript
interface MetricWidgetGridProps {
  // ... bestehende props
  onOpenBioAgeSheet?: () => void;  // NEU
}

// Weitergeben an WidgetRenderer
<WidgetRenderer 
  config={widget}
  onOpenBioAgeSheet={onOpenBioAgeSheet}
  // ... andere props
/>
```

---

### Teil 5: AresHome Integration

**Datei:** `src/pages/AresHome.tsx`

1. **Import hinzufügen:**
```typescript
import { BioAgeSheet } from '@/components/home/sheets/BioAgeSheet';
```

2. **State hinzufügen (nach Zeile 69):**
```typescript
const [bioAgeSheetOpen, setBioAgeSheetOpen] = useState(false);
```

3. **MetricWidgetGrid Props erweitern:**
```typescript
<MetricWidgetGrid
  onOpenNutritionSheet={() => setNutritionSheetOpen(true)}
  onOpenHydrationSheet={() => setHydrationSheetOpen(true)}
  onOpenBodySheet={() => setBodySheetOpen(true)}
  onOpenPeptidesSheet={() => setPeptidesSheetOpen(true)}
  onOpenTrainingSheet={() => setTrainingSheetOpen(true)}
  onOpenSupplementsSheet={() => setSupplementsSheetOpen(true)}
  onOpenSleepSheet={() => setSleepSheetOpen(true)}
  onOpenBioAgeSheet={() => setBioAgeSheetOpen(true)}  // NEU
/>
```

4. **Sheet rendern (nach anderen Sheets):**
```typescript
<BioAgeSheet
  isOpen={bioAgeSheetOpen}
  onClose={() => setBioAgeSheetOpen(false)}
/>
```

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/hooks/useAresBioAge.ts` | **NEU** | Berechnungs-Engine mit 5 Domänen |
| `src/components/home/sheets/BioAgeSheet.tsx` | **NEU** | Layer 2 UI mit Tachometer |
| `src/components/home/widgets/BioAgeWidget.tsx` | EDIT | `onOpenSheet` prop, useAresBioAge |
| `src/components/home/widgets/WidgetRenderer.tsx` | EDIT | `onOpenBioAgeSheet` prop |
| `src/components/home/MetricWidgetGrid.tsx` | EDIT | `onOpenBioAgeSheet` prop |
| `src/pages/AresHome.tsx` | EDIT | State + Sheet Integration |

---

## Technische Details

### Domain Score Formeln

**Body Composition (25%):**
```typescript
function calcBodyScore(profile, weights, measurements) {
  const { weight, height, gender } = profile;
  const bmi = weight / ((height / 100) ** 2);
  
  // BMI Score (20-25 optimal)
  const bmiScore = bmi >= 20 && bmi <= 25 
    ? 100 
    : Math.max(0, 100 - Math.abs(bmi - 22.5) * 8);
  
  // Body Fat Score (gender-specific)
  const latestKfa = weights[0]?.body_fat_percentage;
  let kfaScore = 50; // Default
  if (latestKfa) {
    const optimal = gender === 'male' ? [12, 18] : [20, 28];
    kfaScore = latestKfa >= optimal[0] && latestKfa <= optimal[1]
      ? 100
      : Math.max(0, 100 - Math.abs(latestKfa - (optimal[0] + optimal[1]) / 2) * 5);
  }
  
  // WHR Score (if measurements available)
  let whrScore = 50;
  if (measurements?.waist && measurements?.hips) {
    const whr = measurements.waist / measurements.hips;
    const optimalWhr = gender === 'male' ? 0.9 : 0.85;
    whrScore = Math.max(0, 100 - Math.abs(whr - optimalWhr) * 200);
  }
  
  // Trend Bonus (if KFA decreasing over 28 days)
  const trendBonus = calcKfaTrend(weights) < 0 ? 10 : 0;
  
  return Math.min(100, bmiScore * 0.3 + kfaScore * 0.35 + whrScore * 0.25 + trendBonus);
}
```

**Fitness (25%):**
```typescript
function calcFitnessScore(trainingSessions) {
  const workoutsPerWeek = trainingSessions.length / 4; // 28 Tage = 4 Wochen
  
  // Consistency: 4+/Woche = 100
  const consistencyScore = Math.min(100, workoutsPerWeek * 25);
  
  // Zone 2 Minutes (cardio_zone2 training_type)
  const zone2Sessions = trainingSessions.filter(s => 
    s.training_type === 'cardio_zone2' || s.training_type === 'cardio_liss'
  );
  const zone2MinutesPerWeek = zone2Sessions.reduce((sum, s) => 
    sum + (s.total_duration_minutes || 0), 0
  ) / 4;
  const cardioScore = Math.min(100, zone2MinutesPerWeek / 1.5); // 150min = 100
  
  // Strength Sessions
  const strengthSessions = trainingSessions.filter(s => 
    ['gym', 'push', 'pull', 'legs', 'upper', 'lower', 'fullbody'].includes(s.training_type)
  );
  const strengthPerWeek = strengthSessions.length / 4;
  const strengthScore = Math.min(100, strengthPerWeek * 33); // 3x/Woche = 100
  
  return consistencyScore * 0.30 + cardioScore * 0.35 + strengthScore * 0.35;
}
```

**Sleep (20%):**
```typescript
function calcSleepScore(sleepEntries) {
  if (sleepEntries.length === 0) return 0;
  
  const hours = sleepEntries.map(s => s.sleep_hours);
  const avgHours = hours.reduce((a, b) => a + b, 0) / hours.length;
  
  // Duration Score: 7-9h = 100
  const durationScore = avgHours >= 7 && avgHours <= 9
    ? 100
    : Math.max(0, 100 - Math.abs(avgHours - 8) * 25);
  
  // Consistency Score: Std.Dev < 1h is good
  const stdDev = Math.sqrt(
    hours.reduce((sum, h) => sum + (h - avgHours) ** 2, 0) / hours.length
  );
  const consistencyScore = Math.max(0, 100 - stdDev * 50);
  
  // Quality Score: Avg of 1-5 scale → 0-100
  const qualities = sleepEntries.filter(s => s.sleep_quality).map(s => s.sleep_quality);
  const avgQuality = qualities.length > 0
    ? qualities.reduce((a, b) => a + b, 0) / qualities.length
    : 3; // Default
  const qualityScore = avgQuality * 20;
  
  return durationScore * 0.35 + consistencyScore * 0.25 + qualityScore * 0.40;
}
```

**Nutrition (15%):**
```typescript
function calcNutritionScore(meals, profile, goals) {
  const daysWithMeals = groupMealsByDay(meals);
  const proteinPerDay = daysWithMeals.map(day => 
    day.reduce((sum, m) => sum + (m.protein || 0), 0)
  );
  const avgProtein = proteinPerDay.reduce((a, b) => a + b, 0) / proteinPerDay.length || 0;
  
  // Protein Score: 1.6g/kg = 100
  const targetProtein = profile.weight * 1.6;
  const proteinScore = avgProtein >= targetProtein
    ? 100
    : (avgProtein / targetProtein) * 100;
  
  // Calorie Consistency (low CV is good)
  const caloriesPerDay = daysWithMeals.map(day =>
    day.reduce((sum, m) => sum + (m.calories || 0), 0)
  );
  const avgCalories = caloriesPerDay.reduce((a, b) => a + b, 0) / caloriesPerDay.length || 0;
  const calCV = avgCalories > 0
    ? Math.sqrt(caloriesPerDay.reduce((sum, c) => sum + (c - avgCalories) ** 2, 0) / caloriesPerDay.length) / avgCalories
    : 1;
  const consistencyScore = Math.max(0, 100 - calCV * 200); // CV 0.5 = 0
  
  return proteinScore * 0.50 + consistencyScore * 0.50;
}
```

**Hormone/Energy (15%):**
```typescript
function calcHormoneScore(hormoneEntries) {
  if (hormoneEntries.length === 0) return 50; // Neutral default
  
  const avgEnergy = avg(hormoneEntries.map(h => h.energy_level || 5));
  const avgStress = avg(hormoneEntries.map(h => h.stress_level || 5));
  const avgLibido = avg(hormoneEntries.map(h => h.libido_level || 5));
  
  // Energy: 1-10 → 0-100
  const energyScore = avgEnergy * 10;
  
  // Stress: Invertiert (10 = 0, 1 = 100)
  const stressScore = (10 - avgStress) * 10;
  
  // Libido: 1-10 → 0-100
  const libidoScore = avgLibido * 10;
  
  return energyScore * 0.40 + stressScore * 0.30 + libidoScore * 0.30;
}
```

---

## Erwartetes Ergebnis

1. **Widget zeigt Live-Berechnung:**
   - Basierend auf letzten 28 Tagen Tracking
   - Updates bei jedem Data-Refresh
   - Fallback auf DunedinPACE wenn vorhanden

2. **Layer 2 Sheet zeigt:**
   - Chrono vs Bio-Age Vergleich
   - Aging Pace Tachometer (0.75-1.25)
   - Domain-Breakdown mit Scores
   - Confidence-Level Badge
   - Actionable Recommendations

3. **Gamification-Loop:**
   - "Ich habe gut geschlafen → Sleep Score steigt → Bio-Age sinkt"
   - "Ich habe trainiert → Fitness Score steigt → Aging Pace verbessert"
   - Sofortiges Feedback ohne €300 DunedinPACE-Test

4. **Bloodwork-Integration:**
   - Bei vorhandenen Blutwerten: PhenoAge-Proxy eingerechnet
   - Confidence-Boost von Medium auf High
   - CTA: "Blutwerte hinzufügen für höhere Genauigkeit"
