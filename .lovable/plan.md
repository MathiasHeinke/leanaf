

# Phase 4-5: CycleDetailSheet + Auto-Cycle-Updater

## Aktueller Stand

**Bereits implementiert:**
- `schedule-utils.ts` mit `getCycleStatus()` + `CycleScheduleExtended` Interface
- `useCyclingStatus.ts` Hook mit Compliance-Berechnung
- `CyclingStatusBadge.tsx` mit 4 Zuständen (Normal/On/Off/Transition)
- `SupplementTimeline.tsx` mit Off-Cycle Sektion
- `ExpandableSupplementChip.tsx` mit Cycling-Status-Integration + Dimming
- DB-Schema: `default_cycle_on_days`, `default_cycle_off_days`, `cycling_reason`

**Fehlend:**
- `CycleDetailSheet.tsx` - Layer 2 Sheet für Protokoll-Verwaltung
- `auto-cycle-updater` Edge Function - Automatischer Phase-Wechsel

---

## Task 1: CycleDetailSheet.tsx (Layer 2)

Neues Bottom-Sheet bei Klick auf Cycling-Supplement mit:

```text
+-----------------------------------------------------------+
|  BPC-157 (250mcg)                                    [X]  |
+-----------------------------------------------------------+
|                                                           |
|  AKTUELLER CYCLE                                          |
|  ================                                         |
|                                                           |
|  Status:        [ON-CYCLE Badge]                          |
|  Fortschritt:   [====]======] Tag 18 von 28               |
|  Verbleibend:   10 Tage                                   |
|  Compliance:    96%                                       |
|                                                           |
|  ---------------------------------------------------      |
|                                                           |
|  PROTOKOLL                                                |
|                                                           |
|  Cycle-Typ:     28 Tage On / 14 Tage Off                  |
|  Grund:         Rezeptor-Desensibilisierung               |
|  Start:         15.01.2026                                |
|  Cycle #:       3                                         |
|                                                           |
|  ---------------------------------------------------      |
|                                                           |
|  [Cycle pausieren]       [Cycle zurücksetzen]             |
|                                                           |
+-----------------------------------------------------------+
```

**Props:**

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `userSupplementId` | `string` | ID des User-Supplements |
| `isOpen` | `boolean` | Sheet sichtbar |
| `onClose` | `() => void` | Schließen-Handler |
| `onUpdate` | `(schedule) => Promise<void>` | Schedule-Update-Handler |

**Features:**
- Progress-Bar mit Framer Motion
- Compliance-Prozent (aus Intake-Logs berechnet)
- Cycle-Nummer anzeigen
- Pause-Button: Setzt `is_on_cycle = false` sofort
- Reset-Button: Setzt `current_cycle_start = heute`
- Zeigt `cycling_reason` aus supplement_database

---

## Task 2: auto-cycle-updater Edge Function

Supabase Edge Function für automatischen Phase-Wechsel:

**Datei:** `supabase/functions/auto-cycle-updater/index.ts`

**Logik:**

```typescript
// 1. Fetch alle user_supplements mit schedule.type = 'cycle'
// 2. Für jedes Supplement:
//    - Berechne Tage seit current_cycle_start
//    - Prüfe ob Phase abgelaufen (days >= cycle_on_days oder cycle_off_days)
// 3. Wenn abgelaufen:
//    - Toggle is_on_cycle
//    - Reset current_cycle_start = heute
//    - Wenn Off->On: total_cycles_completed++
// 4. Speichere alle Updates
```

**CORS + Auth:**
- `verify_jwt = false` in config.toml
- Service-Role-Key für Cron-Aufruf
- Manuelle User-Auth-Prüfung wo nötig

**Cron-Setup (pg_cron):**

```sql
SELECT cron.schedule(
  'auto-cycle-updater-daily',
  '5 0 * * *',  -- Täglich um 00:05
  $$
    SELECT net.http_post(
      url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/auto-cycle-updater',
      headers := jsonb_build_object(
        'Authorization', 'Bearer SERVICE_ROLE_KEY',
        'Content-Type', 'application/json'
      )
    );
  $$
);
```

---

## Task 3: Integration in UI

**Wo wird CycleDetailSheet geöffnet?**

1. **SupplementTimeline.tsx** - Klick auf Off-Cycle Supplement
2. **ExpandableSupplementChip.tsx** - Optionaler "Cycle Details" Button im Expanded-State
3. **CyclingStatusBadge.tsx** - Tap auf Badge öffnet Sheet

**Implementierung:**

```typescript
// In SupplementTimeline.tsx - Off-Cycle Section
<div 
  onClick={() => setSelectedCyclingSupp(supplement)}
  className="cursor-pointer"
>
  ...
</div>

<CycleDetailSheet
  userSupplementId={selectedCyclingSupp?.id}
  isOpen={!!selectedCyclingSupp}
  onClose={() => setSelectedCyclingSupp(null)}
  onUpdate={handleCycleUpdate}
/>
```

---

## Neue/Betroffene Dateien

| Datei | Aktion | Priorität |
|-------|--------|-----------|
| `src/components/supplements/CycleDetailSheet.tsx` | NEU | 1 |
| `src/components/supplements/SupplementTimeline.tsx` | Integration Sheet | 2 |
| `supabase/functions/auto-cycle-updater/index.ts` | NEU | 3 |
| `supabase/config.toml` | Function config | 3 |

---

## Edge Function Details

**Response-Format:**

```json
{
  "success": true,
  "processed": 15,
  "transitioned": 3,
  "transitions": [
    { "id": "...", "name": "BPC-157", "from": "on", "to": "off" },
    { "id": "...", "name": "NMN", "from": "off", "to": "on", "cycle": 4 }
  ]
}
```

**Sicherheit:**
- Nur per Service-Role-Key aufrufbar (kein Public Access)
- Alle Supplements aller User werden verarbeitet (batch)
- Idempotent: Mehrfachaufruf am gleichen Tag ändert nichts

---

## Geschätzter Aufwand

| Task | Zeit |
|------|------|
| CycleDetailSheet.tsx | 45 min |
| Integration SupplementTimeline | 15 min |
| Edge Function auto-cycle-updater | 30 min |
| Cron-Setup | 10 min |
| **Gesamt** | ~1.5h |

