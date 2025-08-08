import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HotAction {
  id: string;
  title: string; // e.g. "+30 g Protein (+10 XP) →"
  subtitle?: string; // e.g. "dir fehlen 9 % bis Stage 2"
  onTap?: () => void;
}

interface Props {
  actions: HotAction[];
}

export const HotSwipeActionCard: React.FC<Props> = ({ actions }) => {
  const [index, setIndex] = React.useState(0);
  const has = actions.length > 0;

  const next = () => setIndex(i => (i + 1) % Math.max(1, actions.length));
  const prev = () => setIndex(i => (i - 1 + Math.max(1, actions.length)) % Math.max(1, actions.length));

  const current = has ? actions[index] : undefined;

  return (
    <Card className="sticky top-[56px] z-10 w-full mx-auto">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium truncate">
                {current?.title || 'Jetzt handeln – Vorschlag folgt'}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <button aria-label="Zurück" onClick={prev} className="p-1 rounded-md hover:bg-secondary">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button aria-label="Weiter" onClick={next} className="p-1 rounded-md hover:bg-secondary">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            {current?.subtitle && (
              <div className="text-xs text-muted-foreground truncate">{current.subtitle}</div>
            )}
          </div>
        </div>
        {current?.onTap && (
          <button
            onClick={current.onTap}
            className={cn('mt-3 w-full rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-secondary transition-colors')}
          >
            Ausführen
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default HotSwipeActionCard;
