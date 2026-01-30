

## Fix: Bedtime-Supplements fehlen im Abendstack

### Problem
In der Datenbank haben 4 Supplements den Wert `preferred_timing: 'bedtime'`, aber dieser Timing-Typ wurde aus dem TypeScript-System entfernt. Die Gruppierungslogik in `useUserStackByTiming` mappt `bedtime` **nicht** auf `evening`, wodurch diese Supplements in einem unsichtbaren Bucket landen.

**Betroffene Supplements:**
| Name | Dosierung | DB-Timing |
|------|-----------|-----------|
| Zink | 15mg | bedtime |
| Glycin | 3g | bedtime |
| Magnesium | 200mg | bedtime |
| Ashwagandha KSM-66 | 600mg | bedtime |

---

### Lösung (2-Schritte)

#### Schritt 1: Frontend-Fix (sofort wirksam)
**Datei:** `src/hooks/useSupplementLibrary.ts`

Im `useUserStackByTiming` Hook wird eine Legacy-Mapping-Funktion eingefügt:

```typescript
// Legacy timing mapping - consolidate bedtime into evening
const normalizePreferredTiming = (timing: string | undefined): PreferredTiming => {
  if (!timing) return 'morning';
  if (timing === 'bedtime' || timing === 'before_bed' || timing === 'before_sleep') {
    return 'evening';
  }
  return timing as PreferredTiming;
};

const groupedByTiming = activeStack.reduce((acc, item) => {
  const timing = normalizePreferredTiming(item.preferred_timing);
  // ... rest bleibt gleich
}, {} as Record<PreferredTiming, UserStackItem[]>);
```

#### Schritt 2: Datenbank-Migration (permanente Korrektur)
SQL-Update um alle `bedtime` Werte auf `evening` zu ändern:

```sql
UPDATE user_supplements 
SET preferred_timing = 'evening' 
WHERE preferred_timing IN ('bedtime', 'before_bed', 'before_sleep');
```

---

### Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| Evening & Night Routine: **2 Items** | Evening & Night Routine: **6 Items** |
| Elektrolyte, Magnesium Komplex | + Zink, Glycin, Magnesium, Ashwagandha |

---

### Technische Details

**Betroffene Dateien:**
- `src/hooks/useSupplementLibrary.ts` (Zeilen 323-330)

**Änderungsumfang:**
- ~10 Zeilen Code hinzufügen
- 1 SQL-Statement für Datenbereinigung

