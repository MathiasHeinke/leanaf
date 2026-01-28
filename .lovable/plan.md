
# Fix: Sleep Score Berechnung im Bio-Age Algorithmus

## Identifizierte Probleme

### 1. Falsche Quality-Skala (Kritisch!)
**Aktueller Code (Zeile 162):**
```typescript
const qualityScore = avgQuality * 20; // Annahme: 1-5 Skala
```

**Realität in der DB:** `sleep_quality` ist 1-10 Skala!
- Deine Qualität: Avg 5.2/10 (schlecht)
- Berechnung: 5.2 × 20 = 104 → gecapped auf 100 (perfekt!)
- **Fix:** `avgQuality * 10` statt `* 20`

### 2. Fehlende Bedtime-Penalty
Deine Bedtimes der letzten Woche:
- 04:00, 04:24, 02:37, 02:19, 01:30, 23:00

Einschlafen nach Mitternacht zerstört den Circadian Rhythm, wird aber **nicht bestraft**.

**Neuer Faktor:**
- Bedtime 22:00-23:00 → Bonus +10
- Bedtime 23:00-00:00 → Neutral
- Bedtime 00:00-01:00 → -10
- Bedtime 01:00-02:00 → -20
- Bedtime nach 02:00 → -30

### 3. Keine Recency-Gewichtung
Alle 6 Einträge werden gleich gewichtet, aber der beste Tag (24.01: Quality 7, Bedtime 23:00) sollte weniger zählen als die letzten 3 schlechten Nächte.

### 4. Keine Tracking-Lücken-Penalty
6 Einträge in 28 Tagen = nur ~21% Coverage. Das sollte die Domain-Confidence reduzieren.

---

## Lösung

### Datei: `src/hooks/useAresBioAge.ts`

**Erweiterte `calcSleepScore` Funktion:**

```typescript
// Sleep Score (20%) - ENHANCED
function calcSleepScore(
  sleepEntries: { 
    sleep_hours: number | null; 
    sleep_quality: number | null;
    bedtime?: string | null;  // NEU: "HH:MM:SS" format
    date?: string | null;     // NEU: für Recency
  }[]
): number {
  if (sleepEntries.length === 0) return 50;

  const hours = sleepEntries.filter(s => s.sleep_hours).map(s => s.sleep_hours!);
  if (hours.length === 0) return 50;

  // 1. DURATION SCORE (optimal 7-9h)
  const avgHours = avg(hours);
  const durationScore = avgHours >= 7 && avgHours <= 9
    ? 100
    : Math.max(0, 100 - Math.abs(avgHours - 8) * 25);

  // 2. CONSISTENCY SCORE (StdDev < 1h)
  const sleepStdDev = stdDev(hours);
  const consistencyScore = Math.max(0, 100 - sleepStdDev * 50);

  // 3. QUALITY SCORE - FIX: 1-10 Skala → 0-100
  const qualities = sleepEntries.filter(s => s.sleep_quality).map(s => s.sleep_quality!);
  const avgQuality = qualities.length > 0 ? avg(qualities) : 5;
  const qualityScore = avgQuality * 10; // FIX: War * 20

  // 4. BEDTIME SCORE - NEU!
  let bedtimeScore = 50; // Neutral default
  const bedtimes = sleepEntries
    .filter(s => s.bedtime)
    .map(s => {
      const [hours] = s.bedtime!.split(':').map(Number);
      // Convert 24:00 to 0, handle overflow
      return hours >= 24 ? hours - 24 : hours;
    });
  
  if (bedtimes.length > 0) {
    const avgBedtimeHour = avg(bedtimes);
    
    // Optimal: 22-23 Uhr
    if (avgBedtimeHour >= 22 && avgBedtimeHour < 23) {
      bedtimeScore = 100;
    } else if (avgBedtimeHour >= 21 && avgBedtimeHour < 24) {
      bedtimeScore = 80;
    } else if (avgBedtimeHour >= 0 && avgBedtimeHour < 1) {
      bedtimeScore = 60;
    } else if (avgBedtimeHour >= 1 && avgBedtimeHour < 2) {
      bedtimeScore = 40;
    } else if (avgBedtimeHour >= 2 && avgBedtimeHour < 3) {
      bedtimeScore = 20;
    } else {
      bedtimeScore = 0; // Nach 03:00 = katastrophal
    }
  }

  // 5. RECENCY WEIGHTING - NEU!
  // Letzte 7 Tage zählen doppelt
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const recentEntries = sleepEntries.filter(s => 
    s.date && new Date(s.date) >= sevenDaysAgo
  );
  
  let recencyMultiplier = 1.0;
  if (recentEntries.length >= 3) {
    const recentAvgQuality = avg(
      recentEntries.filter(s => s.sleep_quality).map(s => s.sleep_quality!)
    );
    // Wenn letzte Woche schlechter als Gesamt → Penalty
    if (recentAvgQuality < avgQuality) {
      recencyMultiplier = 0.85; // 15% Penalty
    }
  }

  // GEWICHTUNG mit Bedtime-Faktor
  const baseScore = 
    durationScore * 0.25 +      // Reduziert von 0.35
    consistencyScore * 0.20 +   // Reduziert von 0.25  
    qualityScore * 0.30 +       // Reduziert von 0.40
    bedtimeScore * 0.25;        // NEU!

  return Math.min(100, Math.max(0, baseScore * recencyMultiplier));
}
```

**Query anpassen (Zeile 391-394):**

```typescript
supabase
  .from('sleep_tracking')
  .select('sleep_hours, sleep_quality, bedtime, date')  // bedtime + date hinzufügen
  .eq('user_id', user.id)
  .gte('date', past28Days),
```

**Typ-Interface anpassen (Zeile 337):**

```typescript
sleep: { 
  sleep_hours: number | null; 
  sleep_quality: number | null;
  bedtime: string | null;
  date: string | null;
}[];
```

---

## Erwartetes Ergebnis mit deinen Daten

**Vorher (falscher Score):**
- Quality 5.2 × 20 = 104 → 100
- Duration 7h → 100
- **Sleep Score: ~89** (zu positiv!)

**Nachher (korrigiert):**
- Quality 5.2 × 10 = **52**
- Duration 7h → 100
- Bedtime Avg ~2:30 Uhr → **20**
- Recency: letzte 3 Nächte schlechter → **×0.85**
- **Sleep Score: ~50** (realistisch schlecht)

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/hooks/useAresBioAge.ts` | EDIT | Sleep Score Funktion komplett überarbeiten |

---

## Technische Details

### Bedtime-Parsing
Die DB speichert `bedtime` als `HH:MM:SS` (z.B. "04:24:00", "24:00:00").
- "24:00:00" = Mitternacht (muss auf 0 normalisiert werden)
- "04:00:00" = 4 Uhr morgens → Katastrophal

### Gewichtungsänderung
| Faktor | Vorher | Nachher | Begründung |
|--------|--------|---------|------------|
| Duration | 35% | 25% | Weniger wichtig als Qualität |
| Consistency | 25% | 20% | Gleich |
| Quality | 40% | 30% | Andere Faktoren wichtiger |
| Bedtime | 0% | 25% | **NEU** - Circadian Rhythm kritisch |

### Recency-Logik
Wenn ≥3 Einträge in letzten 7 Tagen existieren und deren Avg-Quality niedriger ist als der 28-Tage-Schnitt, wird ein 15% Penalty angewendet. Das verhindert, dass alte gute Daten schlechte aktuelle Gewohnheiten "verstecken".
