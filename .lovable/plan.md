
# Hydration Micro-Actions: Icon-basiert mit Bounce & Reset

## Übersicht

Drei Verbesserungen für Apple-Design-Award-Qualität:

1. **Icon-only Buttons**: `[Glas] 1x` statt `+250ml Wasser`
2. **Bounce & Reset**: Button wird grün ✓, dann normal (Karte bleibt!)
3. **DismissButton**: Icon oben rechts morpht zu X beim Hover

---

## 1. Neue Sub-Komponenten

### A. DismissButton (Icon → X Morph)

```text
Normal:         Hover/Active:
┌─────────┐     ┌─────────┐
│   💧    │ --> │    X    │
└─────────┘     └─────────┘
```

- Position: Ersetzt den statischen Icon-Container oben rechts
- Animation: `AnimatePresence` mit Rotation beim Wechsel
- Props: `icon` (LucideIcon), `onDismiss`

### B. MicroActionButton (Bounce & Reset)

```text
Klick →  [✓]  → 1.5s → [💧 1x]
         grün           normal
```

- State: `'idle' | 'success'`
- Nach Klick: Sofort grün + Checkmark
- Nach 1.5s: Automatisch zurück zu normal
- Karte bleibt offen für weiteres Tracking

### C. HydrationActions (kompakte Buttons)

| Action ID | Icon | Label | Menge |
|-----------|------|-------|-------|
| `250ml_water` | `GlassWater` | `1x` | 250ml |
| `500ml_water` | `Milk` (Flasche) | `0.5L` | 500ml |
| `coffee` | `Coffee` | `1x` | 150ml |

---

## 2. Änderungen in SmartFocusCard.tsx

### Header: DismissButton statt statisches Icon

```typescript
// VORHER (Zeile 155-158):
<div className="w-11 h-11 rounded-2xl bg-white/20 ...">
  <Icon className="w-5 h-5 text-white" />
</div>

// NACHHER:
<DismissButton icon={Icon} onDismiss={onDismiss} />
```

### SmartActions: HydrationActions mit Multi-Tap

```typescript
// VORHER (Zeile 259-266):
if (task.type === 'hydration') {
  return (
    <div className="flex gap-3 ...">
      <ActionButton onClick={() => onAction('250ml_water')} icon={Droplets} label="+250ml" />
      ...
    </div>
  );
}

// NACHHER:
if (task.type === 'hydration') {
  return (
    <HydrationMicroActions 
      onAction={onHydrationAction}  // Neuer Handler: loggt ohne Karte zu schließen
    />
  );
}
```

---

## 3. Änderungen in ActionCardStack.tsx

### Neuer Handler: handleHydrationAction

```typescript
// Hydration-Aktionen ohne Karte zu schließen
const handleHydrationAction = useCallback(async (card: ActionCard, action: string) => {
  let success = true;
  
  switch (action) {
    case '250ml_water':
      success = await logWater(250, 'water');
      if (success) toast.success('+250ml', { icon: '💧' });
      break;
    case '500ml_water':
      success = await logWater(500, 'water');
      if (success) toast.success('+500ml', { icon: '💧' });
      break;
    case 'coffee':
      success = await logWater(150, 'coffee');
      if (success) toast.success('+Kaffee', { icon: '☕' });
      break;
  }
  
  if (success) {
    // XP vergeben
    window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
      detail: { amount: card.xp, reason: action }
    }));
  }
  
  // WICHTIG: Karte wird NICHT entfernt - User kann mehrmals klicken
}, [logWater]);
```

### SmartFocusCard Props erweitern

```typescript
<SmartFocusCard
  task={toSmartTask(card)}
  onComplete={(action) => handleCardComplete(card, action)}
  onDismiss={() => handleCardDismiss(card)}
  onOpenChat={onTriggerChat}
  onSupplementAction={(timing) => handleSupplementAction(card, timing)}
  onHydrationAction={(action) => handleHydrationAction(card, action)} // NEU
/>
```

---

## 4. Visuelles Design

### MicroActionButton States

```text
IDLE:
┌─────────────┐
│ 💧  1x      │  bg-white/20, text-white
└─────────────┘

SUCCESS (nach Klick):
┌─────────────┐
│     ✓       │  bg-emerald-500, text-white
└─────────────┘   (animiert mit scale bounce)

RESET (nach 1.5s):
┌─────────────┐
│ 💧  1x      │  zurück zu normal
└─────────────┘
```

### DismissButton Animation

```text
MouseEnter:
  Icon → X (rotate -90° → 0°)

MouseLeave:
  X → Icon (rotate 90° → 0°)
```

---

## 5. Dateien-Änderungen

| Datei | Änderung |
|-------|----------|
| `SmartFocusCard.tsx` | + DismissButton, + HydrationMicroActions, + MicroActionButton |
| `ActionCardStack.tsx` | + handleHydrationAction, + onHydrationAction prop |

---

## 6. Erwartetes Verhalten

1. **Hydration-Karte erscheint**: "Mehr trinken" mit 3 kompakten Buttons
2. **User klickt [💧 1x]**: 
   - Button wird sofort grün mit ✓
   - Toast: "+250ml 💧"
   - XP wird vergeben
   - Nach 1.5s: Button wird wieder normal
3. **User kann erneut klicken**: Karte bleibt, beliebig oft tracken
4. **User will Karte schließen**: 
   - Hover über Icon oben rechts → morpht zu X
   - Klick → Karte verschwindet (snoozed)
5. **Alternativ**: Swipe nach links → Snooze

---

## Technische Details

### Neue Imports (SmartFocusCard.tsx)

```typescript
import { GlassWater, Milk, X } from 'lucide-react';
```

### DismissButton Interface

```typescript
interface DismissButtonProps {
  icon: LucideIcon;
  onDismiss: () => void;
}
```

### HydrationMicroActions Interface

```typescript
interface HydrationMicroActionsProps {
  onAction: (actionId: string) => void;
}
```

### MicroActionButton Interface

```typescript
interface MicroActionButtonProps {
  action: { id: string; label: string; icon: LucideIcon };
  onTrigger: (id: string) => void;
}
```
