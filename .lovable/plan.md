

# Peptide Command Center - Finaler Implementierungsplan

## Übersicht

Wir bauen das "Peptide Command Center" mit Inventory-Tracking, Site-Rotation-Hints und einem dedizierten Management-Sheet. Der Gemini-Plan wird grösstenteils übernommen, mit kleinen Optimierungen basierend auf existierender Infrastruktur.

---

## Phase 1: Database Migration

### 1.1 Neue Spalten in `peptide_protocols`

```sql
ALTER TABLE peptide_protocols
ADD COLUMN IF NOT EXISTS vial_total_doses INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS vial_remaining_doses INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS vial_started_at TIMESTAMPTZ DEFAULT NOW();
```

**Begründung:**
- `vial_total_doses`: Gesamt-Dosen pro Vial (z.B. 20)
- `vial_remaining_doses`: Verbleibende Dosen (dekrementiert bei jeder Injektion)
- `vial_started_at`: Wann wurde das aktuelle Vial angebrochen

---

## Phase 2: Hook-Erweiterungen

### 2.1 `useIntakeLog.ts` - Site Rotation + Inventory

**Neue Funktionen:**

```typescript
// Hole vorgeschlagene nächste Injektionsstelle
const getNextSuggestedSite = async (protocolId: string): Promise<{
  suggested: string;
  lastUsed: string | null;
}> => {
  // Hole letzten Log für dieses Protokoll
  const { data } = await supabase
    .from('peptide_intake_log')
    .select('injection_site')
    .eq('protocol_id', protocolId)
    .order('taken_at', { ascending: false })
    .limit(1);
  
  const lastSite = data?.[0]?.injection_site || null;
  
  // Rotation: abdomen_left -> abdomen_right -> thigh_left -> thigh_right -> deltoid_left -> deltoid_right
  const ROTATION = ['abdomen_left', 'abdomen_right', 'thigh_left', 'thigh_right', 'deltoid_left', 'deltoid_right'];
  const lastIndex = lastSite ? ROTATION.indexOf(lastSite) : -1;
  const nextSite = ROTATION[(lastIndex + 1) % ROTATION.length];
  
  return { suggested: nextSite, lastUsed: lastSite };
};

// Dekrementiere Vial nach Injektion
const decrementVial = async (protocolId: string): Promise<boolean> => {
  const { error } = await supabase.rpc('decrement_vial', { protocol_id: protocolId });
  return !error;
};
```

**Änderung in `logIntake()`:**

```typescript
const logIntake = async (...) => {
  // ... bestehende Insert-Logik ...
  
  // NEU: Nach erfolgreichem Log, Vial dekrementieren
  if (success && protocolId) {
    await decrementVial(protocolId);
  }
  
  return success;
};
```

### 2.2 `useProtocols.ts` - Inventory-Felder parsen

**Erweiterung des `Protocol` Interface:**

```typescript
export interface Protocol {
  // ... bestehende Felder ...
  vial_total_doses: number;
  vial_remaining_doses: number;
  vial_started_at: string | null;
  isLowInventory: boolean; // Computed: remaining < 3
}
```

**Neue Funktion: Vial refill**

```typescript
const refillVial = async (protocolId: string, totalDoses: number = 20): Promise<boolean> => {
  const { error } = await supabase
    .from('peptide_protocols')
    .update({
      vial_total_doses: totalDoses,
      vial_remaining_doses: totalDoses,
      vial_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', protocolId);
  
  if (!error) await fetchProtocols();
  return !error;
};
```

---

## Phase 3: Layer 1 - PeptidesWidget

### 3.1 Neue Datei: `src/components/home/widgets/PeptidesWidget.tsx`

**Props:**

```typescript
interface PeptidesWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;
}
```

**Grössen-Varianten:**

| Size | Layout | Inhalt |
|------|--------|--------|
| `flat` | 2-column | "Nächste: BPC-157 @ 20:00" + Chevron |
| `small` | 1x1 | Ring-Progress (2/3 heute) |
| `medium` | 2x1 | Timeline-Liste + Inventory-Warning |
| `large` | 2x2 | Volle Timeline + Vial-Status |

**Features:**

1. **Chronologische Gruppierung (Stacking):**
   - Protokolle nach `timing` gruppieren
   - z.B. "Morning Stack (2)" wenn 2 Peptide um 08:00 fällig

2. **Status-Indikatoren:**
   - ✅ Checkmark = erledigt (via `isPeptideTakenToday`)
   - 🕐 Clock = pending
   - ⚠️ Warning-Dot = Low Inventory (<3 Dosen)

3. **Click Handler:**
   - Klick öffnet `PeptidesSheet`

---

## Phase 4: Layer 2 - PeptidesSheet

### 4.1 Neue Datei: `src/components/home/sheets/PeptidesSheet.tsx`

**Architektur:** Gleiche flex-col Struktur wie `NutritionDaySheet` (336 Zeilen Referenz)

**Tabs:**

```text
+-------------------------------------------------+
| Peptide Protokoll                      [X]      |
+-------------------------------------------------+
| [Plan] [Inventar]                               |
+-------------------------------------------------+
```

### Tab 1: "Plan" (Heute)

```text
| HEUTE - 27. Januar                              |
|                                                 |
| 08:00 - Morning Stack                           |
| +-----------------------------------------+     |
| | [Syringe] Ipamorelin 250mcg     [Log]   |     |
| |           Letzte: Bauch L                |     |
| |           Vorschlag: Bauch R (highlight) |     |
| +-----------------------------------------+     |
|                                                 |
| 20:00 - Evening                                 |
| +-----------------------------------------+     |
| | [Syringe] BPC-157    250mcg     [Log]   |     |
| | [Check]   Erledigt um 20:15              |     |
| +-----------------------------------------+     |
+-------------------------------------------------+
```

**Log Flow:**

1. Klick auf "Log" Button
2. Mini-Popover erscheint mit:
   - Letzte Stelle: "Bauch Links"
   - Vorschlag: "Bauch Rechts" (pre-selected)
   - 6 Buttons für alle Sites
3. Bestätigen:
   - `logIntake()` wird aufgerufen
   - Vial wird dekrementiert
   - XP wird vergeben (25)
   - UI aktualisiert

### Tab 2: "Inventar"

```text
| VORRÄTE                                         |
|                                                 |
| BPC-157                                         |
| [========------------] 4/20 Dosen               |
| [!] Nachbestellen empfohlen                     |
| [Neues Vial] Button                             |
|                                                 |
| Ipamorelin                                      |
| [==================--] 18/20 Dosen              |
|                                                 |
| CJC-1295                                        |
| [====================] 20/20 Dosen (neu)        |
+-------------------------------------------------+
```

**Aktionen:**

- **Neues Vial:** Setzt `vial_remaining_doses` auf `vial_total_doses` zurück
- **Bearbeiten:** Öffnet Edit-Dialog für Dosierung, Timing, Vial-Größe

---

## Phase 5: Integration

### 5.1 `WidgetRenderer.tsx`

```typescript
case 'peptides':
  return <PeptidesWidget size={size} onOpenSheet={onOpenPeptidesSheet} />;
```

### 5.2 `AresHome.tsx`

```typescript
// Neuer State (Zeile 53-55 Bereich)
const [peptidesSheetOpen, setPeptidesSheetOpen] = useState(false);

// Sheet Component (am Ende der Datei)
<PeptidesSheet 
  isOpen={peptidesSheetOpen} 
  onClose={() => setPeptidesSheetOpen(false)} 
/>
```

### 5.3 `PeptideLogger.tsx` - Site Rotation Hint

Erweitere die bestehende Komponente:

```typescript
// Hole Vorschlag beim Expand
useEffect(() => {
  if (expandedProtocol) {
    getNextSuggestedSite(expandedProtocol).then(({ suggested, lastUsed }) => {
      setSuggestedSite({ [expandedProtocol]: suggested });
      setLastUsedSite({ [expandedProtocol]: lastUsed });
      // Pre-select the suggested site
      setSelectedSite(prev => ({ ...prev, [expandedProtocol]: suggested }));
    });
  }
}, [expandedProtocol]);

// Render Hint
{lastUsedSite[protocol.id] && (
  <div className="text-xs text-muted-foreground mb-2">
    <span>Letzte: {siteLabel(lastUsedSite[protocol.id])}</span>
    <span className="mx-1">→</span>
    <span className="text-primary font-medium">
      Vorschlag: {siteLabel(suggestedSite[protocol.id])}
    </span>
  </div>
)}
```

---

## Phase 6: Database Function (RPC)

### 6.1 Decrement Vial Function

```sql
CREATE OR REPLACE FUNCTION decrement_vial(protocol_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE peptide_protocols
  SET vial_remaining_doses = GREATEST(vial_remaining_doses - 1, 0),
      updated_at = NOW()
  WHERE id = protocol_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Dateien-Übersicht

### Neue Dateien

| Datei | Zeilen (geschätzt) |
|-------|---------------------|
| `src/components/home/widgets/PeptidesWidget.tsx` | ~180 |
| `src/components/home/sheets/PeptidesSheet.tsx` | ~350 |
| Migration SQL | ~15 |

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/hooks/useIntakeLog.ts` | +`getNextSuggestedSite()`, +`decrementVial()`, Update `logIntake()` |
| `src/hooks/useProtocols.ts` | +Inventory Felder parsen, +`refillVial()` |
| `src/components/home/loggers/PeptideLogger.tsx` | +Site Suggestion UI |
| `src/components/home/widgets/WidgetRenderer.tsx` | +`peptides` case |
| `src/pages/AresHome.tsx` | +`peptidesSheetOpen` State, +Sheet Import |

---

## Implementierungsreihenfolge

```text
1. [DB] Migration: vial_total_doses, vial_remaining_doses, vial_started_at
2. [DB] RPC Function: decrement_vial
3. [Hook] useIntakeLog: getNextSuggestedSite(), decrementVial()
4. [Hook] useProtocols: Inventory Felder + refillVial()
5. [Widget] PeptidesWidget.tsx (flat/small/medium/large)
6. [Sheet] PeptidesSheet.tsx mit Plan + Inventar Tabs
7. [Logger] PeptideLogger: Site Suggestion UI
8. [Integration] WidgetRenderer + AresHome Sheet State
```

---

## Was wir NICHT ändern (Abweichung von Gemini)

1. **Kein neuer `usePeptideData` Hook** - Wir erweitern `useProtocols` und `useIntakeLog` direkt
2. **Keine neue `user_peptides` Tabelle** - Wir nutzen `peptide_protocols`
3. **`PeptideFocusCard` bleibt** - Die Timing Circles im ActionCardStack funktionieren bereits
4. **`useActionCards` bleibt** - Die Peptide-Karte erscheint schon bei fälligen Protokollen

Diese Implementierung fügt sich nahtlos in die existierende Architektur ein und bringt Pro-Features (Inventory, Rotation) ohne Breaking Changes.

