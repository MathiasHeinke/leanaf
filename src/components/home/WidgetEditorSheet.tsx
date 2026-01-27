import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { WIDGET_DEFINITIONS, WidgetSize, WidgetConfig, WidgetDefinition } from '@/types/widgets';

interface WidgetEditorSheetProps {
  open: boolean;
  onClose: () => void;
}

const sizeLabelMap: Record<WidgetSize, string> = {
  small: 'Klein',
  medium: 'Mittel',
  large: 'Groß',
  wide: 'Breit',
  flat: 'Flach',
};

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
      <SheetContent 
        side="bottom" 
        className="max-h-[80vh] rounded-t-3xl border-t border-border/50 bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader className="pb-4 text-left">
          <SheetTitle className="text-xl font-bold">Widgets anpassen</SheetTitle>
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
