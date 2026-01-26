

# Epiphany Card: Premium Design + Prefetch + 3D Flip

## Uebersicht

Drei Optimierungen fuer die Erkenntnis-Karte:

| Verbesserung | Status |
|--------------|--------|
| **Text zu gross** | `text-lg` → `text-sm` / `text-base` (je nach Laenge) |
| **Flip-Animation** | Echter 3D-Kartenflip mit `rotateY(180deg)` |
| **Prefetch** | Insight wird im Hintergrund geladen, sobald Karte sichtbar wird |

---

## 1. Design-Fixes (RevealedState)

### Problem
Der Text `"Deine Daten zeigen..."` ist mit `text-lg` zu gross und ueberwaeltigt die kompakte Karte.

### Loesung
```text
VORHER:                              NACHHER:
┌───────────────────────┐            ┌───────────────────────┐
│ 💡 ERKENNTNIS    [X]  │            │ 💡 ERKENNTNIS    [X]  │
│                       │            │                       │
│ "Deine Daten zeigen   │            │ "Deine Daten zeigen   │
│ ein interessantes     │            │ ein interessantes     │
│ Muster. An Tagen      │  (text-lg) │ Muster..."            │ (text-sm)
│ mit..."               │            │                       │
│                       │            │ [Was bedeutet das?]   │
│ [Was bedeutet das?]   │            │                       │
└───────────────────────┘            └───────────────────────┘
```

### Aenderungen EpiphanyCard.tsx (RevealedState)

**Zeile 264-265 (Insight Text):**
```typescript
// VORHER:
className="text-lg font-medium leading-relaxed text-white/90"

// NACHHER:
className="text-sm sm:text-base font-medium leading-relaxed text-white/90"
```

**Weitere Design-Verbesserungen:**
- Groesseres Icon/Badge fuer visuelles Gewicht
- Subtilere Glow-Effekte
- Bessere vertikale Verteilung

---

## 2. 3D Flip Animation

### Konzept
Statt nur `rotateY: 90 → 0` machen wir einen echten Karten-Flip:
- Vorderseite (Mystery) rotiert nach hinten
- Rueckseite (Revealed) erscheint durch Rotation nach vorne
- `perspective` fuer 3D-Tiefe

### Animation Flow
```text
Phase 1 (Mystery):        Phase 2 (Flip):          Phase 3 (Revealed):
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│ ✨ Neues    │  ──→      │    ====     │  ──→      │ 💡 Erkennt  │
│   Muster    │           │   FLIP!     │           │   nis       │
│             │           │    ====     │           │             │
│ [Aufdecken] │           │             │           │ [Was ...?]  │
└─────────────┘           └─────────────┘           └─────────────┘
  rotateY(0)               rotateY(90)               rotateY(0)
```

### Code-Aenderungen

**Wrapper mit Perspective:**
```typescript
<div className="relative w-full h-52 rounded-3xl overflow-hidden" 
     style={{ perspective: '1000px' }}>
```

**Mystery Exit Animation:**
```typescript
exit={{ 
  rotateY: -90,
  opacity: 0,
  transition: { duration: 0.3 }
}}
```

**Revealed Entry Animation:**
```typescript
initial={{ rotateY: 90, opacity: 0 }}
animate={{ rotateY: 0, opacity: 1 }}
transition={{ 
  duration: 0.5, 
  type: "spring", 
  damping: 20 
}}
style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
```

---

## 3. Prefetch System (Wichtig fuer UX)

### Problem
Aktuell wird die Erkenntnis erst generiert wenn der User klickt → 1-3 Sekunden Ladezeit.

### Loesung: Hintergrund-Prefetch
1. Sobald die Epiphany-Karte im Stack erscheint (oder kurz davor), wird die Erkenntnis im Hintergrund geladen
2. Das Ergebnis wird im React Query Cache / LocalStorage gespeichert
3. Beim Klick auf "Aufdecken" ist die Erkenntnis bereits da → sofortige Flip-Animation

### Architektur
```text
┌─────────────────────────────────────────┐
│      useDailyInsight() Hook             │
│                                         │
│  ┌────────────┐   ┌────────────────────┐│
│  │ localStorage│  │ React Query Cache  ││
│  │ daily-insight│ │  ['daily-insight'] ││
│  │ + date key  │  │                    ││
│  └─────────────┘   └────────────────────┘│
│           ▲                  ▲          │
│           │                  │          │
│  ┌────────┴──────────────────┴────────┐ │
│  │  fetchDailyInsight()               │ │
│  │  - Prueft erst localStorage        │ │
│  │  - Falls leer: API call            │ │
│  │  - Speichert mit Tagesdatum        │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│     EpiphanyCard                        │
│                                         │
│  - Bekommt `prefetchedInsight` als Prop │
│  - Falls vorhanden: Skip Loading State  │
│  - Sofortiger Flip                      │
└─────────────────────────────────────────┘
```

### Neuer Hook: `useDailyInsight.ts`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'ares-daily-insight';
const QUERY_KEY = ['daily-insight'];

interface DailyInsight {
  insight: string;
  date: string;
  generated_at: string;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCachedInsight(): DailyInsight | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Nur gueltig wenn vom selben Tag
    if (parsed.date === getTodayKey()) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedInsight(insight: DailyInsight): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(insight));
}

export const useDailyInsight = (shouldPrefetch: boolean = false) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<DailyInsight | null> => {
      // 1. Check localStorage first
      const cached = getCachedInsight();
      if (cached) {
        console.log('[DailyInsight] Using cached insight from today');
        return cached;
      }
      
      // 2. Fetch from API
      console.log('[DailyInsight] Fetching fresh insight...');
      const { data, error } = await supabase.functions.invoke('ares-insight-generator');
      
      if (error || !data?.insight) {
        console.error('[DailyInsight] Failed:', error);
        return null;
      }
      
      // 3. Cache for today
      const result: DailyInsight = {
        insight: data.insight,
        date: getTodayKey(),
        generated_at: data.generated_at || new Date().toISOString()
      };
      
      setCachedInsight(result);
      return result;
    },
    // Nur fetchen wenn prefetch aktiviert
    enabled: shouldPrefetch,
    staleTime: 1000 * 60 * 60 * 24, // 24h
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Manueller Fetch (fuer Klick wenn Cache leer)
export const useFetchInsight = () => {
  const queryClient = useQueryClient();
  
  return async (): Promise<string | null> => {
    // Check cache first
    const cached = getCachedInsight();
    if (cached) return cached.insight;
    
    // Fetch if not cached
    const { data, error } = await supabase.functions.invoke('ares-insight-generator');
    
    if (error || !data?.insight) return null;
    
    const result: DailyInsight = {
      insight: data.insight,
      date: getTodayKey(),
      generated_at: data.generated_at || new Date().toISOString()
    };
    
    setCachedInsight(result);
    queryClient.setQueryData(QUERY_KEY, result);
    
    return result.insight;
  };
};
```

### Integration in ActionCardStack

```typescript
// ActionCardStack.tsx
import { useDailyInsight } from '@/hooks/useDailyInsight';

// Prefetch wenn Epiphany-Karte in der Queue ist (Index 1 oder 2)
const epiphanyCardIndex = cards.findIndex(c => c.type === 'epiphany');
const shouldPrefetch = epiphanyCardIndex >= 0 && epiphanyCardIndex <= 2;

const { data: dailyInsight } = useDailyInsight(shouldPrefetch);
```

### EpiphanyCard Props erweitern

```typescript
interface EpiphanyCardProps {
  onOpenChat: (prompt: string) => void;
  onDismiss: () => void;
  prefetchedInsight?: string | null; // NEU
}
```

---

## 4. Dateien-Uebersicht

| Aktion | Datei | Beschreibung |
|--------|-------|--------------|
| **CREATE** | `src/hooks/useDailyInsight.ts` | Prefetch + LocalStorage Cache |
| **MODIFY** | `src/components/home/EpiphanyCard.tsx` | Design-Fixes, 3D Flip, Prefetch-Integration |
| **MODIFY** | `src/components/home/ActionCardStack.tsx` | Prefetch-Trigger, Insight-Prop weitergeben |

---

## 5. Detaillierte Aenderungen EpiphanyCard.tsx

### Wrapper mit Perspective (Zeile 60)
```typescript
// VORHER:
<div className="relative w-full h-52 rounded-3xl overflow-hidden">

// NACHHER:
<div 
  className="relative w-full h-52 rounded-3xl overflow-hidden"
  style={{ perspective: '1200px' }}
>
```

### MysteryState Exit (Zeile 84-88)
```typescript
// VORHER:
exit={{ opacity: 0, scale: 1.05 }}

// NACHHER:
exit={{ 
  rotateY: -90, 
  opacity: 0,
  scale: 1.02,
  transition: { duration: 0.3, ease: "easeIn" }
}}
```

### RevealedState Entry (Zeile 227-232)
```typescript
// VORHER:
initial={{ opacity: 0, rotateY: 90 }}
animate={{ opacity: 1, rotateY: 0 }}
transition={{ duration: 0.4, type: "spring", damping: 20 }}
className="absolute inset-0"

// NACHHER:
initial={{ rotateY: 90, opacity: 0 }}
animate={{ rotateY: 0, opacity: 1 }}
transition={{ 
  duration: 0.6, 
  type: "spring", 
  stiffness: 100,
  damping: 15 
}}
style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
className="absolute inset-0"
```

### Insight Text (Zeile 264-265)
```typescript
// VORHER:
className="text-lg font-medium leading-relaxed text-white/90"

// NACHHER:
className="text-sm font-medium leading-relaxed text-white/85 line-clamp-4"
```

### Header Icon groesser (Zeile 244-247)
```typescript
// VORHER:
<div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
  <Lightbulb className="w-4 h-4 text-amber-400" />
</div>

// NACHHER:
<div className="w-10 h-10 bg-gradient-to-br from-amber-500/30 to-yellow-500/20 
                rounded-xl flex items-center justify-center border border-amber-500/20">
  <Lightbulb className="w-5 h-5 text-amber-400" />
</div>
```

### Prefetch-Logik im Component
```typescript
// handleReveal wird intelligenter:
const handleReveal = async () => {
  // Falls bereits prefetched -> sofort zeigen
  if (prefetchedInsight) {
    setInsight(prefetchedInsight);
    setPhase('revealed');
    // XP Award...
    return;
  }
  
  // Fallback: Normale Fetch-Logik
  setPhase('loading');
  // ... existing fetch code
};
```

---

## 6. User Experience nach Implementation

```text
SZENARIO A: Prefetch erfolgreich (90% der Faelle)
───────────────────────────────────────────────────
1. User sieht Supplement-Karte (Position 1)
2. Epiphany-Karte ist auf Position 2
3. HINTERGRUND: useDailyInsight() laedt Insight
4. User erledigt Supplement-Karte
5. Epiphany-Karte wird sichtbar (Position 1)
6. User klickt "Aufdecken"
7. SOFORT: 3D-Flip → Insight erscheint (0ms Ladezeit)

SZENARIO B: Kein Prefetch (10% - z.B. Epiphany auf Pos 1)
───────────────────────────────────────────────────
1. User sieht Epiphany-Karte sofort (Position 1)
2. User klickt "Aufdecken"
3. Loading-State erscheint (1-2 Sekunden)
4. 3D-Flip → Insight erscheint
```

---

## 7. One-Insight-Per-Day Garantie

Die LocalStorage-Logik stellt sicher:
- **Morgens 8:00**: Erster Aufruf generiert Insight, speichert mit `date: "2026-01-26"`
- **Mittags 12:00**: Aufruf liest aus Cache (selbes Datum)
- **Naechster Tag 8:00**: Cache ungueltig (anderes Datum), neuer Insight wird generiert

```typescript
// Validierung im Hook:
if (parsed.date === getTodayKey()) {
  return parsed; // Gueltig
}
return null; // Veraltet, neu fetchen
```

