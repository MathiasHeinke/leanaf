

# Widget-Sortierung im Editor Sheet

## Uebersicht

Der Screenshot zeigt den Widget-Editor mit Toggle und Groessen-Auswahl - aber ohne Moeglichkeit die Reihenfolge zu aendern. Wir fuegen eine moderne Drag-and-Drop Sortierung hinzu.

## Technischer Ansatz

Wir nutzen die bereits installierte `@dnd-kit` Library (wie in Dashboard.tsx verwendet) zusammen mit der vorhandenen `reorderWidgets` Funktion aus dem Hook.

## Aenderungen

### Datei: `src/components/home/WidgetEditorSheet.tsx`

**1. Neue Imports hinzufuegen:**

```typescript
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
```

**2. reorderWidgets aus Hook nutzen (Zeile 37):**

```typescript
const { widgets, toggleWidget, updateWidgetSize, reorderWidgets } = useWidgetConfig();
```

**3. Sortierbare Widget-Komponente erstellen:**

Neue Komponente innerhalb oder vor WidgetEditorSheet:

```typescript
interface SortableWidgetItemProps {
  widget: WidgetConfig;
  definition: WidgetDefinition;
  onToggle: () => void;
  onSizeChange: (size: WidgetSize) => void;
}

const SortableWidgetItem: React.FC<SortableWidgetItemProps> = ({ 
  widget, definition, onToggle, onSizeChange 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.type });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties;

  const IconComponent = definition.icon;
  const isEnabled = widget.enabled;
  const currentSize = widget.size || definition.defaultSize;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between py-4 border-b border-border/50 bg-background",
        !isEnabled && "opacity-60",
        isDragging && "shadow-lg rounded-xl"
      )}
    >
      {/* Drag Handle (links) */}
      <div 
        {...attributes}
        {...listeners}
        className="p-2 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      
      {/* Icon + Text */}
      <div className="flex items-center gap-3 flex-1">
        <div className={cn(
          "p-2 rounded-xl",
          isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{definition.label}</p>
          <p className="text-xs text-muted-foreground truncate">{definition.description}</p>
        </div>
      </div>

      {/* Size + Toggle (rechts) */}
      <div className="flex items-center gap-3 shrink-0">
        <Select 
          value={currentSize} 
          onValueChange={(v) => onSizeChange(v as WidgetSize)}
          disabled={!isEnabled}
        >
          <SelectTrigger className="w-20 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {definition.availableSizes.map(s => (
              <SelectItem key={s} value={s} className="text-xs">
                {sizeLabelMap[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Switch 
          checked={isEnabled}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
};
```

**4. DndContext in der Hauptkomponente:**

```typescript
export const WidgetEditorSheet: React.FC<WidgetEditorSheetProps> = ({ open, onClose }) => {
  const { widgets, toggleWidget, updateWidgetSize, reorderWidgets } = useWidgetConfig();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex(w => w.type === active.id);
      const newIndex = widgets.findIndex(w => w.type === over.id);
      const newOrder = arrayMove(widgets.map(w => w.type), oldIndex, newIndex);
      reorderWidgets(newOrder);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent ...>
        <SheetHeader>
          <SheetTitle>Widgets anpassen</SheetTitle>
          <SheetDescription>
            Wähle aus welche Metriken du sehen möchtest, in welcher Größe und Reihenfolge
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[50vh] pr-4">
          <DndContext 
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={widgets.map(w => w.type)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {widgets.map((widget) => {
                  const def = WIDGET_DEFINITIONS.find(d => d.type === widget.type);
                  if (!def) return null;
                  return (
                    <SortableWidgetItem
                      key={widget.type}
                      widget={widget}
                      definition={def}
                      onToggle={() => toggleWidget(widget.type)}
                      onSizeChange={(size) => updateWidgetSize(widget.type, size)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
        
        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Halte gedrückt zum Sortieren • Änderungen werden automatisch gespeichert
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

---

## Visuelles Ergebnis

```text
┌─────────────────────────────────────────────────────────┐
│  Widgets anpassen                              [X]      │
│  Wähle Metriken, Größe und Reihenfolge                 │
├─────────────────────────────────────────────────────────┤
│  ≡  [🧠] ARES Protokoll           [Flach ▾]    ●───    │ <- Drag Handle links
│─────────────────────────────────────────────────────────│
│  ≡  [🍴] Ernährung                [Breit ▾]    ●───    │
│─────────────────────────────────────────────────────────│
│  ≡  [💧] Wasser                   [Flach ▾]    ●───    │
│─────────────────────────────────────────────────────────│
│  ≡  [🏋️] Training                 [Mittel ▾]   ●───    │
│─────────────────────────────────────────────────────────│
│  ≡  [🌙] Schlaf                   [Mittel ▾]   ●───    │
│─────────────────────────────────────────────────────────│
│                                                         │
│     Halte gedrückt zum Sortieren                        │
│     Änderungen werden automatisch gespeichert           │
└─────────────────────────────────────────────────────────┘
```

**Drag-Interaktion:**
- User drueckt und haelt auf `≡` Icon (GripVertical)
- Widget wird angehoben (opacity 0.5, shadow)
- Beim Loslassen wird `reorderWidgets` aufgerufen
- Dashboard aktualisiert sich sofort (dank sortedWidgets Memo)

---

## Warum @dnd-kit statt Alternativen?

| Bibliothek | Vorteile | Nachteile |
|------------|----------|-----------|
| @dnd-kit | Bereits installiert, Touch-optimiert, performant | - |
| @hello-pangea/dnd | Auch installiert, klassisch | Weniger modern |
| Framer Motion Reorder | Elegante Animationen | Erfordert state restructure |

**Entscheidung:** @dnd-kit - bereits im Projekt verwendet (Dashboard.tsx), bewaehrtes Pattern.

---

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/WidgetEditorSheet.tsx` | DndContext + SortableContext + SortableWidgetItem |

---

## Touch-Optimierung

Die @dnd-kit Library ist bereits touch-optimiert:
- `touch-none` auf dem Handle verhindert Scroll-Konflikte
- Natuerliche Verzoegerung vor Drag-Start (kein versehentliches Ziehen)
- Smooth Animation bei Neuordnung

