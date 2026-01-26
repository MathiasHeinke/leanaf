
# Fix: Abend-Journal Button öffnet QuickLogSheet statt Chat

## Problem

Die **Abend-Journal Karte** im ActionCardStack zeigt "Erledigen" Button, der aktuell den ARES Chat öffnet. Der User erwartet aber, dass er im **QuickLogSheet** das Journal schreiben kann - ohne den Homescreen zu verlassen.

## Root Cause

| Komponente | Aktuelles Verhalten |
|------------|---------------------|
| `SmartFocusCard.tsx` (SmartActions) | Kein Handler für `task.type === 'journal'` - fällt in DEFAULT |
| `ActionCardStack.tsx` Zeile 189-195 | `journal` type ruft `onTriggerChat(actionContext)` auf |

Das Journal landet im DEFAULT Case und triggert den Chat statt das QuickLogSheet.

---

## Lösung

### Änderung 1: SmartFocusCard.tsx - Neuer Journal Handler

Vor dem DEFAULT Case (Zeile 450) einen spezifischen `journal` Case einfügen:

```typescript
// JOURNAL: Open Quick Log Sheet (stay on homescreen)
if (task.type === 'journal') {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        openJournal(); // Opens QuickLogSheet Journal tab
      }}
      className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
    >
      <PenTool size={16} />
      <span>Journal schreiben</span>
      <ChevronRight size={14} className="opacity-60" />
    </button>
  );
}
```

### Änderung 2: Import hinzufügen

Am Anfang der Datei:

```typescript
import { openJournal } from '@/components/quick/quickAddBus';
```

### Änderung 3: Icon Import ergänzen

`PenTool` zum bestehenden Lucide Import hinzufügen (falls noch nicht vorhanden).

---

## Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `src/components/home/SmartFocusCard.tsx` | Import `openJournal` + `PenTool`, neuer `journal` Handler vor DEFAULT |

---

## Erwartetes Ergebnis

1. **Abend-Journal Karte** zeigt Button "Journal schreiben" (mit PenTool Icon)
2. **Klick** öffnet das QuickLogSheet mit aktivem Journal-Tab
3. **User bleibt auf dem Homescreen** - kein Seiten-Wechsel
4. Nach Speichern des Journals wird die Karte optional entfernt (falls gewünscht)

---

## Flow nach Implementierung

```text
User sieht Abend-Journal Karte
         |
         v
Klickt "Journal schreiben"
         |
         v
openJournal() → quickAddBus.emit({ type: 'journal' })
         |
         v
QuickLogSheet öffnet sich mit Journal-Tab
         |
         v
User schreibt Eintrag (Voice oder Text)
         |
         v
Speichern → Toast + Card wird entfernt
```
