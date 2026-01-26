

# Fix: Besseres Essen-Icon (Utensils statt UtensilsCrossed)

## Problem

Das aktuelle `UtensilsCrossed` Icon zeigt gekreuztes Besteck (X-Form), was wie "durchgestrichen" aussieht:

```text
UtensilsCrossed:    vs    Utensils:
      ╲╱                    | |
      ╱╲                    | |
     /  \                   \_/
```

## Lösung

Wechsel von `UtensilsCrossed` zu `Utensils` für ein klassisches Besteck-Symbol.

## Änderung an LiquidDock.tsx

| Zeile | Vorher | Nachher |
|-------|--------|---------|
| 8 (Import) | `UtensilsCrossed` | `Utensils` |
| 103 (Icon) | `icon={UtensilsCrossed}` | `icon={Utensils}` |

### Code-Änderungen

**Zeile 8:**
```typescript
// VORHER:
import { UtensilsCrossed, Plus, X, Droplets, Dumbbell, Scale, Pill, Moon } from 'lucide-react';

// NACHHER:
import { Utensils, Plus, X, Droplets, Dumbbell, Scale, Pill, Moon } from 'lucide-react';
```

**Zeile 103:**
```typescript
// VORHER:
<DockButton 
  icon={UtensilsCrossed} 
  onClick={onVisionScan}

// NACHHER:
<DockButton 
  icon={Utensils} 
  onClick={onVisionScan}
```

## Ergebnis

Das Icon zeigt dann paralleles Besteck (Messer + Gabel) statt gekreuztes - viel klarer als "Essen"-Symbol erkennbar.

