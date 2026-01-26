

# Hydration Micro-Actions: Fehlende Implementation

## Status-Analyse

Der Plan wurde nur teilweise umgesetzt. Folgende Teile fehlen komplett:

| Feature | Status |
|---------|--------|
| Morning Icon (Sunrise) | ✅ Bereits implementiert |
| EpiphanyCard | ✅ Bereits implementiert |
| **DismissButton** | ❌ FEHLT |
| **MicroActionButton** | ❌ FEHLT |
| **HydrationMicroActions** | ❌ FEHLT |
| **onHydrationAction Handler** | ❌ FEHLT |
| **GlassWater/Milk Icons** | ❌ FEHLT |

---

## Aenderungen in SmartFocusCard.tsx

### 1. Neue Imports (Zeile 9)

```typescript
// AKTUELL:
import { Check, X, ChevronRight, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Sunrise, Clock, Dumbbell, LucideIcon } from 'lucide-react';

// NACHHER:
import { Check, X, ChevronRight, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Sunrise, Clock, Dumbbell, LucideIcon, GlassWater } from 'lucide-react';
```

### 2. Interface erweitern (Zeile 33-41)

```typescript
interface SmartFocusCardProps {
  task: SmartTask;
  onComplete: (action?: string) => void;
  onDismiss: () => void;
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
  onHydrationAction?: (action: string) => void; // NEU
  style?: React.CSSProperties;
  className?: string;
}
```

### 3. DismissButton Komponente (NEU, nach Zeile 201)

```typescript
// --- DISMISS BUTTON (Icon -> X Morph) ---
interface DismissButtonProps {
  icon: LucideIcon;
  onDismiss: () => void;
}

const DismissButton: React.FC<DismissButtonProps> = ({ icon: Icon, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.9 }}
      className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 
                 flex items-center justify-center transition-colors hover:bg-white/30"
    >
      <AnimatePresence mode="wait">
        {isHovered ? (
          <motion.div
            key="close"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
          >
            <X size={22} className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            <Icon size={22} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
```

### 4. MicroActionButton Komponente (NEU)

```typescript
// --- MICRO ACTION BUTTON (Bounce & Reset) ---
interface MicroActionButtonProps {
  action: { id: string; label: string; icon: LucideIcon };
  onTrigger: (id: string) => void;
}

const MicroActionButton: React.FC<MicroActionButtonProps> = ({ action, onTrigger }) => {
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Sofort Success-State zeigen
    setStatus('success');
    
    // 2. Daten senden
    onTrigger(action.id);

    // 3. Nach 1.5s Reset
    setTimeout(() => {
      setStatus('idle');
    }, 1500);
  };

  return (
    <motion.button
      onClick={handleClick}
      layout
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all overflow-hidden min-w-[70px]",
        status === 'success' 
          ? "bg-emerald-500 border-emerald-400 text-white" 
          : "bg-white/20 border-white/10 text-white hover:bg-white/30 backdrop-blur-md"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'success' ? (
          <motion.div
            key="check"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="flex items-center justify-center w-full"
          >
            <Check size={18} strokeWidth={3} />
          </motion.div>
        ) : (
          <motion.div
            key="label"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <action.icon size={18} strokeWidth={2} />
            <span className="text-xs font-bold">{action.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
```

### 5. HydrationMicroActions Komponente (NEU)

```typescript
// --- HYDRATION MICRO ACTIONS ---
interface HydrationMicroActionsProps {
  onAction: (actionId: string) => void;
}

const HydrationMicroActions: React.FC<HydrationMicroActionsProps> = ({ onAction }) => {
  const actions = [
    { id: '250ml_water', label: '1x', icon: GlassWater },
    { id: '500ml_water', label: '0.5L', icon: Droplets },
    { id: 'coffee', label: '1x', icon: Coffee },
  ];

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <MicroActionButton 
          key={action.id}
          action={action}
          onTrigger={onAction}
        />
      ))}
    </div>
  );
};
```

### 6. Header Icon ersetzen (Zeile 155-159)

```typescript
// AKTUELL:
<div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center flex-shrink-0">
  <Icon className="w-5 h-5 text-white" />
</div>

// NACHHER:
<DismissButton icon={Icon} onDismiss={onDismiss} />
```

### 7. SmartActions Hydration Block (Zeile 259-267)

```typescript
// AKTUELL:
if (task.type === 'hydration') {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
      <ActionButton onClick={() => onAction('250ml_water')} icon={Droplets} label="+250ml" />
      <ActionButton onClick={() => onAction('500ml_water')} icon={Droplets} label="+500ml" />
      <ActionButton onClick={() => onAction('coffee')} icon={Coffee} label="+Kaffee" />
    </div>
  );
}

// NACHHER:
if (task.type === 'hydration') {
  // Wenn dedizierter Hydration-Handler existiert -> Multi-Tap ohne Karte zu schliessen
  if (onHydrationAction) {
    return <HydrationMicroActions onAction={onHydrationAction} />;
  }
  // Fallback: alte Logik (schliesst Karte)
  return (
    <div className="flex gap-2">
      <MicroActionButton action={{ id: '250ml_water', label: '1x', icon: GlassWater }} onTrigger={onAction} />
      <MicroActionButton action={{ id: '500ml_water', label: '0.5L', icon: Droplets }} onTrigger={onAction} />
      <MicroActionButton action={{ id: 'coffee', label: '1x', icon: Coffee }} onTrigger={onAction} />
    </div>
  );
}
```

### 8. SmartActions Interface erweitern (Zeile 204-209)

```typescript
interface SmartActionsProps {
  task: SmartTask;
  onAction: (action?: string) => void;
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
  onHydrationAction?: (action: string) => void; // NEU
}
```

### 9. onHydrationAction an SmartActions weitergeben (Zeile 163-168)

```typescript
<SmartActions 
  task={task} 
  onAction={handleComplete}
  onOpenChat={onOpenChat}
  onSupplementAction={onSupplementAction}
  onHydrationAction={onHydrationAction} // NEU
/>
```

---

## Aenderungen in ActionCardStack.tsx

### 1. Neuer Handler: handleHydrationAction (nach Zeile 76)

```typescript
// Handle hydration action WITHOUT closing card (multi-tap)
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

### 2. SmartFocusCard Props erweitern (Zeile 263-269)

```typescript
// AKTUELL:
<SmartFocusCard
  task={toSmartTask(card)}
  onComplete={(action) => handleCardComplete(card, action)}
  onDismiss={() => handleCardDismiss(card)}
  onOpenChat={onTriggerChat}
  onSupplementAction={(timing) => handleSupplementAction(card, timing)}
/>

// NACHHER:
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

## Erwartetes Ergebnis

Nach der Implementation:

1. **Hydration-Karte** zeigt kompakte Icon-Buttons: `[Glas 1x]` `[Tropfen 0.5L]` `[Kaffee 1x]`
2. **Klick auf Button**: 
   - Sofort gruen mit Checkmark
   - Toast "+250ml 💧"
   - XP vergeben
   - Nach 1.5s: Button wird wieder normal
3. **Karte bleibt offen** - User kann beliebig oft tracken
4. **Hover ueber Icon oben rechts**: Morpht zu X
5. **Klick auf X**: Karte verschwindet (snooze)

