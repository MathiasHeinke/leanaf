
# Profile Protocol Mode: Bugfixes + Multi-Select

## Gefundene Probleme

### 1. Phase Progress wird falsch berechnet
**Bug**: Die `loadProtocolStatus` Funktion zählt `Object.values(checklist).filter(Boolean).length`, aber die Werte sind Objekte `{completed: true/false, ...}`, nicht Booleans.

**Aktuell**: Zeigt "9/9 Kriterien erfüllt" (alle Objekte sind truthy)
**Soll**: Zeigt "5/9 Kriterien erfüllt" (nur `.completed === true` zählen)

### 2. Protocol Mode: Multi-Select statt Single-Select
**Anforderung**: User möchte mehrere Modi kombinieren können:
- Natural + TRT (Klinisch)
- Reta (Enhanced) + TRT (Klinisch)
- Nur Natural
- etc.

**Logik**:
- "Natural" bedeutet "Keine Hilfsmittel" - kann nicht mit anderen kombiniert werden
- "Enhanced" (Reta/Peptide) und "Klinisch" (TRT) können kombiniert werden

---

## Technische Änderungen

### Datei 1: `src/pages/Profile.tsx`

**Zeile 381-388 - Phase Progress Fix:**
```typescript
// ALT (falsch):
const items = Object.values(data.phase_0_checklist as Record<string, boolean>);
const completed = items.filter(Boolean).length;

// NEU (korrekt):
const checklist = data.phase_0_checklist as Record<string, { completed?: boolean }>;
const items = Object.values(checklist);
const completed = items.filter(item => item?.completed === true).length;
```

**State-Änderung für Multi-Select:**
```typescript
// ALT:
const [protocolMode, setProtocolMode] = useState<ProtocolMode>('natural');

// NEU:
const [protocolModes, setProtocolModes] = useState<ProtocolMode[]>(['natural']);
```

**Save-Logik anpassen:**
```typescript
// Speichere als Array oder JSON-String
protocol_mode: protocolModes.join(','), // z.B. "enhanced,clinical"
```

### Datei 2: `src/components/profile/ProtocolModeSelector.tsx`

**Props erweitern:**
```typescript
interface ProtocolModeSelectorProps {
  modes: ProtocolMode[];  // Array statt single value
  onModesChange: (modes: ProtocolMode[]) => void;
  currentPhase?: number;
  phaseProgress?: { completed: number; total: number };
}
```

**Multi-Select Logik:**
```typescript
const handleModeClick = (clickedMode: ProtocolMode) => {
  if (clickedMode === 'natural') {
    // Natural ist exklusiv - deselektiert alle anderen
    onModesChange(['natural']);
  } else {
    // Enhanced/Clinical können kombiniert werden
    let newModes = modes.filter(m => m !== 'natural');
    
    if (newModes.includes(clickedMode)) {
      // Toggle off
      newModes = newModes.filter(m => m !== clickedMode);
      if (newModes.length === 0) newModes = ['natural']; // Fallback
    } else {
      // Toggle on
      newModes.push(clickedMode);
    }
    onModesChange(newModes);
  }
};
```

**UI-Anpassung:**
- Checkmarks bei allen ausgewählten Modi anzeigen
- Visual Feedback für kombinierte Auswahl (z.B. Enhanced + Clinical beide highlighted)

---

## Datenbank-Kompatibilität

Das bestehende `protocol_mode` Feld ist `text`. Zwei Optionen:

**Option A: Comma-Separated (einfach)**
```sql
protocol_mode = 'enhanced,clinical'  -- String mit Komma
```

**Option B: Array-Feld (sauberer)**
```sql
ALTER TABLE profiles 
ALTER COLUMN protocol_mode TYPE text[] USING string_to_array(protocol_mode, ',');
```

Empfehlung: **Option A** (keine Migration nötig, Parse beim Laden)

---

## Betroffene Dateien

| Datei | Änderungen |
|-------|------------|
| `src/pages/Profile.tsx` | Phase Progress Fix, Multi-Select State, Laden/Speichern |
| `src/components/profile/ProtocolModeSelector.tsx` | Multi-Select UI + Toggle-Logik |

---

## Kombinationslogik

| Auswahl | Gespeicherter Wert | Defizit-Limit |
|---------|-------------------|---------------|
| Natural | `natural` | Max 500 kcal/Tag |
| Enhanced only | `enhanced` | Max 750 kcal/Tag |
| Clinical only | `clinical` | Individuell (Coach) |
| Enhanced + Clinical | `enhanced,clinical` | Max 1000 kcal/Tag |

---

## UI-Preview nach Änderung

```text
┌─────────────────────────────────────────────────────────────┐
│  [ 🌱 Natural ]  [✓💊 Enhanced ]  [✓🔬 Klinisch ]          │
│     Diät only      Reta/Peptide      TRT+                  │
│                                                             │
│  💡 Reta + TRT Kombination: Maximale Rekomposition möglich │
└─────────────────────────────────────────────────────────────┘
```
