import React from 'react';
import { motion } from 'framer-motion';
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
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { WIDGET_DEFINITIONS, WidgetSize, WidgetType } from '@/types/widgets';

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

export const WidgetEditorSheet: React.FC<WidgetEditorSheetProps> = ({ open, onClose }) => {
  const { widgets, toggleWidget, updateWidgetSize } = useWidgetConfig();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="max-h-[80vh] rounded-t-3xl border-t border-border/50 bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader className="pb-4 text-left">
          <SheetTitle className="text-xl font-bold">Widgets anpassen</SheetTitle>
          <SheetDescription>
            Wähle aus welche Metriken du sehen möchtest und in welcher Größe
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-1">
            {WIDGET_DEFINITIONS.map((def, index) => {
              const config = widgets.find(w => w.type === def.type);
              const isEnabled = config?.enabled ?? false;
              const currentSize = config?.size || def.defaultSize;
              const IconComponent = def.icon;
              
              return (
                <motion.div 
                  key={def.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center justify-between py-4 border-b border-border/50",
                    !isEnabled && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn(
                      "p-2 rounded-xl",
                      isEnabled 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{def.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{def.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Size Selector */}
                    <Select 
                      value={currentSize} 
                      onValueChange={(v) => updateWidgetSize(def.type, v as WidgetSize)}
                      disabled={!isEnabled}
                    >
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {def.availableSizes.map(s => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {sizeLabelMap[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Toggle */}
                    <Switch 
                      checked={isEnabled}
                      onCheckedChange={() => toggleWidget(def.type)}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Änderungen werden automatisch gespeichert
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
