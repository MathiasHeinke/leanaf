

# ARES-Buttons aus der Top-Navigation entfernen

## Uebersicht

Aktuell gibt es zwei Stellen mit ARES-Buttons rechts oben:

1. **AresTopNav.tsx** (auf der Home-Seite `/`): Zeigt den eleganten metallischen ARES-Helm-Button mit Shimmer-Effekt
2. **GlobalHeader.tsx** (auf allen anderen Seiten): Zeigt ARES-Avatar oder Home-Icon rechts oben

Diese werden entfernt, damit rechts oben Platz fuer neue Elemente ist.

---

## Aenderungen

### Datei 1: `src/components/home/AresTopNav.tsx`

Den gesamten ARES-Button-Block (Zeilen 27-90) entfernen. Es bleibt nur:
- Links: Sidebar-Trigger
- Mitte: Spacer
- Rechts: **Leer** (Platz fuer neues Element)

```typescript
export const AresTopNav: React.FC<AresTopNavProps> = ({ onOpenChat }) => {
  return (
    <div className="fixed top-[3px] left-0 right-0 z-40 pt-2 px-4 pb-2 bg-gradient-to-b from-background/95 via-background/80 to-transparent backdrop-blur-sm">
      <div className="flex justify-between items-center max-w-md mx-auto">
        
        {/* Left: Sidebar Trigger */}
        <SidebarTrigger className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors" />

        {/* Center: Empty for clean look */}
        <div className="flex-1" />

        {/* Right: Placeholder - jetzt leer fuer zukuenftiges Element */}
        <div className="w-10" />
      </div>
    </div>
  );
};
```

**Optional:** Da `onOpenChat` nicht mehr verwendet wird, kann der Parameter aus dem Interface entfernt werden. Dies erfordert dann auch eine Anpassung in der Parent-Komponente (`AresHome.tsx`).

---

### Datei 2: `src/components/GlobalHeader.tsx`

Den gesamten ARES/Home-Button-Block (Zeilen 62-83) entfernen. Ebenfalls nicht mehr benoetigte Imports und Variablen aufraeumen:

**Entfernte Elemente:**
- `aresCoach` Variable (Zeile 30)
- `isInCoachChat` Variable (Zeile 33)
- `handleRightButtonClick` Funktion (Zeilen 36-42)
- Der gesamte Button rechts (Zeilen 62-83)

**Bereinigte Imports:**
- `Home` aus lucide-react entfernen
- `Avatar, AvatarImage, AvatarFallback` entfernen
- `COACH_REGISTRY` entfernen

**Resultat:**

```typescript
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const GlobalHeader = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";

  if (location.pathname === '/') {
    return null;
  }

  return (
    <div className="relative">
      <div 
        className={cn(
          "fixed top-0 right-0 z-40 border-b border-border/20 bg-background/70 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60 transition-[left] duration-200",
          isSidebarCollapsed 
            ? "left-0 md:left-[--sidebar-width-icon]" 
            : "left-0 md:left-[--sidebar-width]"
        )}
      >
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          {/* Left: Sidebar Toggle */}
          <SidebarTrigger className="p-2 hover:bg-accent/60 rounded-lg transition-colors" />
          
          {/* Center: Spacer */}
          <div className="flex-1" />
          
          {/* Right: Jetzt leer - Platz fuer zukuenftiges Element */}
        </div>
      </div>

      <div className="h-[61px]" />
    </div>
  );
};
```

---

## Zusammenfassung

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/AresTopNav.tsx` | ARES-Helm-Button entfernen, nur Sidebar-Trigger links behalten |
| `src/components/GlobalHeader.tsx` | ARES-Avatar/Home-Button entfernen, nicht benoetigte Imports bereinigen |

**Ergebnis:** Rechts oben in der Top-Navigation ist jetzt auf allen Seiten frei und bereit fuer neue Elemente.

