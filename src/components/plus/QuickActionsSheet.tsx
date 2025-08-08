import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  Utensils, 
  Dumbbell, 
  Footprints, 
  Droplets, 
  Moon, 
  Smile 
} from 'lucide-react';

interface QuickActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (action: string) => void;
}

const QUICK_ACTIONS = [
  { id: 'meal', icon: Utensils, label: 'Mahlzeit', description: 'Essen tracken' },
  { id: 'workout', icon: Dumbbell, label: 'Workout', description: 'Training erfassen' },
  { id: 'steps', icon: Footprints, label: 'Schritte', description: 'Aktivität loggen' },
  { id: 'water', icon: Droplets, label: 'Wasser', description: 'Hydration tracken' },
  { id: 'sleep', icon: Moon, label: 'Schlaf', description: 'Regeneration erfassen' },
  { id: 'mood', icon: Smile, label: 'Stimmung', description: 'Wohlbefinden tracken' }
];

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({
  open,
  onOpenChange,
  onSelect
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="text-center pb-4">
          <SheetTitle>Quick Add</SheetTitle>
          <SheetDescription>
            Was möchtest du erfassen?
          </SheetDescription>
        </SheetHeader>
        
        <div className="grid grid-cols-3 gap-3 pb-6">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-20 flex flex-col gap-1 p-3"
                onClick={() => {
                  onSelect(action.id);
                  onOpenChange(false);
                }}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};