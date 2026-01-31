
# ARES Cycling Management System - Finaler Umsetzungsplan

## Analyse: Gemini-Feedback vs. Ursprünglicher Plan

Gemini hat den Plan **bestätigt und verfeinert**. Die wichtigsten Ergänzungen:

| Aspekt | Mein Originalplan | Gemini-Verbesserung |
|--------|-------------------|---------------------|
| Hook-Architektur | Eigener `useCyclingStatus` Hook | ✅ Bestätigt, plus Trennung Logic vs. Fetch |
| Cycle-Wechsel | Edge Function täglich | ✅ Bestätigt mit pg_cron |
| First-Time Setup | Dialog erwähnt | ✅ Expliziter Flow mit "Ohne Cycling" Option |
| Matrix-Update | In Schedule-Utils integrieren | ✅ Eigene `cyclingLogic.ts` für Separation |

### Neue Erkenntnisse aus der Spezifikation (PDF):

1. **4 Chip-Zustände** (statt 2): NORMAL, ON-CYCLE, OFF-CYCLE, TRANSITION-DAY
2. **Compliance-Tracking**: Prozentsatz der tatsächlichen Einnahmen im aktuellen Cycle
3. **Cycle-Historie**: Frühere Cycles mit Compliance-Daten anzeigen
4. **Pause/Reset-Buttons**: Manuelle Cycle-Steuerung

---

## Bestehende Infrastruktur (bereits vorhanden)

```text
✅ supplement_database.cycling_required (BOOLEAN)
✅ supplement_database.cycling_protocol (TEXT)
✅ user_supplements.schedule (JSONB mit cycle_on_days, cycle_off_days, start_date)
✅ schedule-utils.ts mit shouldShowSupplement(), getDaysRemainingInPhase()
✅ useEpitalonCycles.ts als Referenz-Implementation (spezialisiert)
✅ peptide_intake_log Tabelle (Peptid-Tracking)
```

**Was fehlt:**
- `default_cycle_on_days` / `default_cycle_off_days` als Integer-Spalten
- `cycling_reason` als Text-Spalte für UI-Erklärung
- Dedizierte `user_supplement_cycles` Tabelle für separates Tracking
- UI-Komponenten für Cycle-Status

---

## Architektur-Entscheidung: Erweitern vs. Neu

Die Spezifikation schlägt eine **neue Tabelle** `user_supplement_cycles` vor. Nach Analyse der bestehenden Struktur empfehle ich einen **hybriden Ansatz**:

| Option | Vorteil | Nachteil |
|--------|---------|----------|
| **A: Neue Tabelle** | Saubere Trennung, Cycle-Historie | Mehr Joins, Sync-Komplexität |
| **B: user_supplements.schedule erweitern** | Bereits genutzt, weniger Overhead | Keine separate Historie |
| **C: Hybrid (empfohlen)** | Nutzt beide, Historie nur bei Bedarf | Etwas mehr Code |

**Empfehlung: Option C** - `user_supplements.schedule` für aktiven Status, neue `user_supplement_cycles` nur für Historie (später).

---

## Phase 1: Datenbank-Schema (30 min)

### 1.1 supplement_database erweitern

```sql
ALTER TABLE supplement_database 
  ADD COLUMN IF NOT EXISTS default_cycle_on_days INTEGER,
  ADD COLUMN IF NOT EXISTS default_cycle_off_days INTEGER,
  ADD COLUMN IF NOT EXISTS cycling_reason TEXT;
```

### 1.2 Cycling-Defaults für wichtige Substanzen

| Name | On Days | Off Days | Reason |
|------|---------|----------|--------|
| NMN | 30 | 7 | NAD+ Rezeptor-Sensitivität |
| Ashwagandha | 60 | 14 | Schilddrüsen-Adaptation |
| Rhodiola Rosea | 60 | 14 | Adaptogen-Toleranz |
| Alpha-GPC | 56 | 14 | Cholin-Rezeptor Downregulation |
| BPC-157 | 28 | 14 | Rezeptor-Desensibilisierung |
| TB-500 | 28 | 28 | Angiogenese-Sättigung |
| MK-677 | 60 | 30 | GH-Rezeptor Downregulation |
| Ipamorelin | 90 | 30 | GHRH-Rezeptor Reset |
| CJC-1295 | 90 | 30 | GHRH-Rezeptor Reset |
| Semax | 21 | 7 | BDNF-Rezeptor Sensitivität |
| Selank | 21 | 7 | GABA-Modulation Reset |
| Epitalon | 20 | 180 | Telomerase-Aktivierung (2x/Jahr) |
| Rapamycin | 1 | 6 | Weekly Pulse (Mannick Protocol) |

### 1.3 user_supplements.schedule JSONB erweitern

Bestehendes Format bleibt, wird um neue Felder ergänzt:

```typescript
interface CycleSchedule {
  type: 'cycle';
  cycle_on_days: number;
  cycle_off_days: number;
  start_date: string;           // ISO Date
  is_on_cycle: boolean;         // NEU: Aktueller Status
  current_cycle_start: string;  // NEU: Wann aktuelle Phase begann
  total_cycles_completed: number; // NEU: Tracking
}
```

---

## Phase 2: Cycle-Status Logik (1h)

### 2.1 schedule-utils.ts erweitern

**Neues Interface `CycleStatus`:**

```typescript
export interface CycleStatus {
  isOnCycle: boolean;
  currentDay: number;        // Tag 1-30 im aktuellen Cycle
  totalDays: number;         // Gesamttage der Phase (on oder off)
  daysRemaining: number;
  progressPercent: number;   // 0-100
  nextPhaseDate: Date;
  cycleNumber: number;
  isTransitionDay: boolean;  // Letzter Tag der Phase
  compliancePercent: number; // Wie oft genommen
}
```

**Neue Funktion `getCycleStatus()`:**

```typescript
export function getCycleStatus(
  schedule: CycleSchedule,
  intakeCountInCurrentCycle?: number
): CycleStatus {
  const today = new Date();
  const phaseStart = new Date(schedule.current_cycle_start);
  const daysSinceStart = differenceInDays(today, phaseStart);
  
  const currentPhaseDays = schedule.is_on_cycle
    ? schedule.cycle_on_days
    : schedule.cycle_off_days;
  
  const currentDay = Math.min(daysSinceStart + 1, currentPhaseDays);
  const daysRemaining = Math.max(0, currentPhaseDays - currentDay);
  const isTransitionDay = daysRemaining === 0;
  
  return {
    isOnCycle: schedule.is_on_cycle,
    currentDay,
    totalDays: currentPhaseDays,
    daysRemaining,
    progressPercent: Math.round((currentDay / currentPhaseDays) * 100),
    nextPhaseDate: addDays(phaseStart, currentPhaseDays),
    cycleNumber: schedule.total_cycles_completed + 1,
    isTransitionDay,
    compliancePercent: intakeCountInCurrentCycle 
      ? Math.round((intakeCountInCurrentCycle / currentDay) * 100)
      : 100,
  };
}
```

### 2.2 Hook: useCyclingStatus.ts (neu)

```typescript
// src/hooks/useCyclingStatus.ts

export function useCyclingStatus(userSupplementId: string) {
  // 1. Fetch user_supplement mit schedule
  // 2. Fetch intake logs für Compliance
  // 3. Return CycleStatus | null
}

export function useAllCyclingSupplements() {
  // Alle Supplements mit schedule.type === 'cycle'
  // Gruppiert nach isOnCycle true/false
}
```

---

## Phase 3: UI-Komponenten (2.5h)

### 3.1 CyclingStatusBadge.tsx (neu)

4 visuelle Zustände für den Chip:

```text
┌─────────────────────────────────────────────────────────────┐
│  NORMAL           [Vitamin D3+K2]                          │
│  ON-CYCLE         [NMN 🟢 Tag 5/30]                        │
│  OFF-CYCLE        [Rapamycin ⭕ Off: 12d]  (ausgegraut)    │
│  TRANSITION       [BPC-157 ⚡ Letzter Tag!] (pulsierend)   │
└─────────────────────────────────────────────────────────────┘
```

**Props:**

```typescript
interface CyclingStatusBadgeProps {
  status: CycleStatus | null;
  supplementName: string;
  size?: 'sm' | 'md';
}
```

### 3.2 ExpandableSupplementChip.tsx erweitern

Integration der CyclingStatusBadge:

- Wenn `schedule?.type === 'cycle'`: Badge anzeigen
- Wenn `!isOnCycle`: Chip dimmen (opacity-50), Klick auf "genommen" deaktivieren
- Wenn `isTransitionDay`: Pulsier-Animation

### 3.3 CycleDetailSheet.tsx (neu, Layer 2)

Bottom-Sheet bei Klick auf Cycling-Supplement:

```text
┌─────────────────────────────────────────────────────────────┐
│  BPC-157 (250mcg)                                     [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 AKTUELLER CYCLE                                         │
│  ─────────────────                                          │
│  Status:        🟢 ON-CYCLE                                 │
│  Fortschritt:   ████████████░░░░░░░░  Tag 18 von 28        │
│  Verbleibend:   10 Tage                                     │
│  Compliance:    96%                                         │
│                                                             │
│  📅 PROTOKOLL ANPASSEN                                      │
│  ─────────────────                                          │
│  ○ Standard (28 on / 14 off)  ← empfohlen                  │
│  ○ Intensiv (42 on / 21 off)                               │
│  ○ Benutzerdefiniert: [ ] Tage on, [ ] Tage off           │
│                                                             │
│  [Cycle pausieren]     [Cycle zurücksetzen]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 SupplementTimeline.tsx erweitern

Off-Cycle Supplements in separater Sektion am Ende:

```typescript
// Gruppierung erweitern
const offCycleSupplements = supplements.filter(s => {
  const status = getCycleStatusForSupplement(s);
  return status && !status.isOnCycle;
});

// Render am Ende der Timeline
{offCycleSupplements.length > 0 && (
  <OffCycleSection supplements={offCycleSupplements} />
)}
```

### 3.5 AddCyclingSupplementDialog.tsx (neu)

First-Time Setup wenn User ein Cycling-Supplement hinzufügt:

```text
┌─────────────────────────────────────────────────────────────┐
│  🔄 BPC-157 braucht Cycling                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Rezeptor-Desensibilisierung vermeiden                      │
│                                                             │
│      ┌───────────────────────────────────────┐              │
│      │     28 Tage On  →  14 Tage Off       │              │
│      │        (empfohlen)                    │              │
│      └───────────────────────────────────────┘              │
│                                                             │
│  ARES trackt automatisch und erinnert dich.                 │
│                                                             │
│  [Ohne Cycling]              [Mit Cycling starten]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Automatischer Cycle-Wechsel (1h)

### 4.1 Edge Function: auto-cycle-updater

```typescript
// supabase/functions/auto-cycle-updater/index.ts

// Läuft täglich um 00:05 via pg_cron
// 1. Fetch alle user_supplements mit schedule.type = 'cycle'
// 2. Prüfe ob Phase abgelaufen (daysSinceStart >= currentPhaseDays)
// 3. Update: is_on_cycle toggeln, current_cycle_start = heute
// 4. Wenn Off→On: total_cycles_completed++
// 5. Optional: Push-Notification senden
```

### 4.2 Cron-Setup

```sql
SELECT cron.schedule(
  'auto-cycle-updater',
  '5 0 * * *',  -- Täglich um 00:05
  $$
    SELECT net.http_post(
      url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/auto-cycle-updater',
      headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

---

## Betroffene Dateien (Zusammenfassung)

| Datei | Aktion | Priorität |
|-------|--------|-----------|
| `supabase/migrations/` | DB-Schema erweitern | 1 |
| `src/lib/schedule-utils.ts` | `getCycleStatus()` + `CycleStatus` Interface | 2 |
| `src/hooks/useCyclingStatus.ts` | Neuer Hook | 2 |
| `src/components/supplements/CyclingStatusBadge.tsx` | Neue Komponente | 3 |
| `src/components/supplements/CycleDetailSheet.tsx` | Neue Komponente | 3 |
| `src/components/supplements/ExpandableSupplementChip.tsx` | Integration | 4 |
| `src/components/supplements/SupplementTimeline.tsx` | Off-Cycle Sektion | 4 |
| `src/components/supplements/AddCyclingSupplementDialog.tsx` | First-Time Flow | 5 |
| `supabase/functions/auto-cycle-updater/` | Edge Function | 5 |

---

## Geschätzter Aufwand

| Phase | Task | Zeit |
|-------|------|------|
| 1 | DB-Schema + Matrix-Daten | 30 min |
| 2 | getCycleStatus() + useCyclingStatus Hook | 1h |
| 3 | CyclingStatusBadge + CycleDetailSheet | 1.5h |
| 4 | ExpandableSupplementChip Integration | 30 min |
| 5 | SupplementTimeline Off-Cycle Sektion | 30 min |
| 6 | AddCyclingSupplementDialog | 30 min |
| 7 | Edge Function auto-cycle-updater | 1h |
| **Gesamt** | | **~6h** |

---

## User Experience (Endresultat)

1. **Hinzufügen**: Dialog erklärt Cycling-Grund, 1-Klick Setup
2. **Tagesplan**: Grüne Badges = On-Cycle (nehmen), Graue = Off-Cycle (Pause)
3. **Details**: Tap auf Chip → Sheet mit Fortschritt, Protokoll-Anpassung
4. **Automatik**: System wechselt Cycles nachts, User muss nichts tun
5. **Compliance**: Fortschrittsbalken + Prozent motiviert zur Treue
6. **Transition**: Pulsierender Badge am letzten Tag warnt vor Wechsel

**"Oma-freundlich": Grün = nehmen, Grau = nicht nehmen. Fertig. 💚**
