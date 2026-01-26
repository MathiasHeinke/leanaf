
# 5. Tab: Körpermaße (TapeLogger) Integration

## Aktuelle Situation

Der `TapeLogger.tsx` existiert bereits vollständig mit:
- Bauchumfang als primärer KPI (mit ±0.5 cm Steppern)
- Ganzkörper-Maße Accordion (Hals, Brust, Taille, Hüfte, Arme, Oberschenkel)
- Info-Tooltips für richtige Messpositionen
- Speicherung in `body_measurements` Tabelle

## Änderungen

### QuickLogSheet.tsx

**1. Type erweitern (Zeile 16):**
```typescript
// VORHER:
export type QuickLogTab = 'weight' | 'training' | 'sleep' | 'journal';

// NACHHER:
export type QuickLogTab = 'weight' | 'training' | 'sleep' | 'journal' | 'tape';
```

**2. Import hinzufügen (Zeile 8):**
```typescript
// VORHER:
import { X, Scale, Dumbbell, Moon, BookOpen } from 'lucide-react';

// NACHHER:
import { X, Scale, Dumbbell, Moon, BookOpen, Ruler } from 'lucide-react';
```

**3. TapeLogger Import (Zeile 15):**
```typescript
import { TapeLogger } from './loggers/TapeLogger';
```

**4. Tabs-Array erweitern (Zeilen 26-31):**
```typescript
const tabs = [
  { id: 'weight' as const, icon: Scale, label: 'Gewicht' },
  { id: 'training' as const, icon: Dumbbell, label: 'Training' },
  { id: 'sleep' as const, icon: Moon, label: 'Schlaf' },
  { id: 'journal' as const, icon: BookOpen, label: 'Journal' },
  { id: 'tape' as const, icon: Ruler, label: 'Maße' },  // NEU
];
```

**5. Sliding Background anpassen (Zeile 104):**
```typescript
// VORHER (4 Tabs):
style={{ width: `calc(${100 / 4}% - 4px)` }}

// NACHHER (5 Tabs):
style={{ width: `calc(${100 / 5}% - 4px)` }}
```

**6. Content-Bereich erweitern (nach Zeile 143):**
```typescript
{activeTab === 'tape' && <TapeLogger onClose={onClose} />}
```

## Visuelles Ergebnis

```text
+------------------------------------------+
| Quick Log                            ✕   |
+------------------------------------------+
| [⚖️] [🏋️] [🌙] [📖] [📏]                |
|  Gew   Tra   Sch   Jou   Maße           |
+------------------------------------------+
|                                          |
|        🎯 Bauchumfang                    |
|           90.5 cm                        |
|      [-0.5]    |    [+0.5]               |
|                                          |
|   Letzter Eintrag: 90.0 cm              |
|                                          |
|   ▼ Ganzkörper-Maße                     |
|                                          |
+==========================================+
|      [████ Speichern ████]               |
+==========================================+
```

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/home/QuickLogSheet.tsx` | Erweitern (5. Tab) |

Der TapeLogger ist bereits fertig implementiert und muss nur eingebunden werden - keine neue Komponente nötig!
