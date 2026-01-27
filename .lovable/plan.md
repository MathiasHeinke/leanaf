

# Fix: Widget-Editor Aenderungen synchron auf Homescreen anzeigen

## Das Problem

Der Widget-Editor speichert Aenderungen korrekt in localStorage und DB, aber der Homescreen aktualisiert sich nicht, weil:

1. `useWidgetConfig()` wird in zwei Komponenten separat aufgerufen
2. Jeder Hook-Aufruf hat seinen **eigenen React State**
3. Wenn das Sheet aendert, weiss das Grid nichts davon

```text
┌────────────────────┐     ┌────────────────────┐
│  MetricWidgetGrid  │     │  WidgetEditorSheet │
│  useWidgetConfig() │     │  useWidgetConfig() │
│  [State A]         │     │  [State B]         │
└────────────────────┘     └────────────────────┘
         │                          │
         └──────────────────────────┘
                    │
            localStorage (sync)
            aber State nicht sync!
```

---

## Loesung: Shared State via React Context

Wir erstellen einen **WidgetConfigProvider** der den State zentral haelt und allen Komponenten zur Verfuegung stellt. So teilen sich Editor und Grid denselben State.

---

## Aenderungen

### 1. Neuer Context: `src/contexts/WidgetConfigContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { WidgetConfig, WidgetType, WidgetSize, DEFAULT_WIDGETS, WIDGET_DEFINITIONS } from '@/types/widgets';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_STORAGE_KEY = 'ares_widget_config';

interface WidgetConfigContextType {
  widgets: WidgetConfig[];
  enabledWidgets: WidgetConfig[];
  updateWidgetSize: (type: WidgetType, size: WidgetSize) => void;
  toggleWidget: (type: WidgetType) => void;
  reorderWidgets: (newOrder: WidgetType[]) => void;
  isLoading: boolean;
}

const WidgetConfigContext = createContext<WidgetConfigContextType | undefined>(undefined);

export const WidgetConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... (komplette Hook-Logik aus useWidgetConfig.ts hierher verschieben)
  
  return (
    <WidgetConfigContext.Provider value={{
      widgets: sortedWidgets,
      enabledWidgets,
      updateWidgetSize,
      toggleWidget,
      reorderWidgets,
      isLoading
    }}>
      {children}
    </WidgetConfigContext.Provider>
  );
};

export const useWidgetConfig = () => {
  const context = useContext(WidgetConfigContext);
  if (!context) {
    throw new Error('useWidgetConfig must be used within WidgetConfigProvider');
  }
  return context;
};
```

### 2. Provider in App einbinden: `src/App.tsx`

Den Provider moeglichst weit oben in der Komponenten-Hierarchie einbinden:

```typescript
import { WidgetConfigProvider } from '@/contexts/WidgetConfigContext';

// In der App-Komponente:
<WidgetConfigProvider>
  {/* ... existing routes */}
</WidgetConfigProvider>
```

### 3. Hook umstellen: `src/hooks/useWidgetConfig.ts`

Den alten Hook zu einem Re-Export machen:

```typescript
// Re-export from context for backwards compatibility
export { useWidgetConfig } from '@/contexts/WidgetConfigContext';
```

---

## Alternative (einfacher): Storage Event Listener

Falls Context zu aufwaendig erscheint, koennen wir auch einen **Storage Event Listener** nutzen:

```typescript
// In useWidgetConfig.ts - nach dem useState
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        setWidgets(JSON.parse(e.newValue));
      } catch {}
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

**Problem:** Storage Events feuern nur zwischen Tabs/Windows, nicht innerhalb desselben Tabs!

---

## Empfohlene Loesung: Custom Event Dispatch

Die einfachste Loesung ohne grosse Architektur-Aenderung:

### In `useWidgetConfig.ts`:

**1. Custom Event nach jeder Aenderung dispatchen:**

```typescript
const dispatchWidgetUpdate = (newWidgets: WidgetConfig[]) => {
  window.dispatchEvent(new CustomEvent('widget-config-updated', { 
    detail: newWidgets 
  }));
};
```

**2. In updateWidgetSize, toggleWidget, reorderWidgets:**

```typescript
const updateWidgetSize = useCallback((type: WidgetType, size: WidgetSize) => {
  setWidgets(prev => {
    const newWidgets = prev.map(w => 
      w.type === type ? { ...w, size } : w
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newWidgets));
    syncToDb(newWidgets);
    dispatchWidgetUpdate(newWidgets);  // NEU
    return newWidgets;
  });
}, [syncToDb]);
```

**3. Event Listener beim Mount:**

```typescript
useEffect(() => {
  const handleWidgetUpdate = (e: CustomEvent<WidgetConfig[]>) => {
    setWidgets(e.detail);
  };
  
  window.addEventListener('widget-config-updated', handleWidgetUpdate as EventListener);
  return () => {
    window.removeEventListener('widget-config-updated', handleWidgetUpdate as EventListener);
  };
}, []);
```

---

## Visuelle Bestaetigung

Nach dem Fix:
- User aendert Groesse im Editor von "Mittel" zu "Gross"
- Custom Event wird gefeuert
- MetricWidgetGrid empfaengt Event
- State wird aktualisiert
- Widget rendert sofort in neuer Groesse

---

## Zusammenfassung der Datei-Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useWidgetConfig.ts` | Custom Event dispatch + listener hinzufuegen |

**Eine einzige Datei muss geaendert werden** - keine neue Architektur noetig.

---

## Technische Details

Die Aenderung in `useWidgetConfig.ts`:

1. **dispatchWidgetUpdate** Funktion hinzufuegen (Zeile ~88)
2. **useEffect** fuer Event Listener hinzufuegen (nach loadWidgets useEffect)
3. In **updateWidgetSize**, **toggleWidget**, **reorderWidgets** den Dispatch aufrufen

Das Custom Event synchronisiert alle Hook-Instanzen sofort, sodass Aenderungen im Editor unmittelbar auf dem Homescreen sichtbar werden.

