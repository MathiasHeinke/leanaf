import React from 'react';
import { CardContent } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';
import { Zap, ArrowRight } from 'lucide-react';

interface NextBestActionCardProps {
  data: UsePlusDataResult;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({ data }) => {
  const { loading, proteinDelta, remainingKcal } = data;

  // Simple Next Best Action logic for now
  const getNextBestAction = () => {
    const currentHour = new Date().getHours();
    
    if (proteinDelta && proteinDelta > 30) {
      return {
        title: `+${proteinDelta}g Protein`,
        description: `Du brauchst noch ${proteinDelta}g Protein heute`,
        rationale: "Protein ist der wichtigste Makronährstoff für dein Ziel",
        cta: "Protein-Snack hinzufügen",
        type: "protein"
      };
    }
    
    if (remainingKcal && remainingKcal < -200) {
      return {
        title: "10-min Walk",
        description: `Du hast ${Math.abs(remainingKcal)} kcal zu viel gegessen`,
        rationale: "Bewegung hilft beim Kaloriendefizit",
        cta: "Walk starten",
        type: "activity"
      };
    }
    
    if (currentHour < 18) {
      return {
        title: "2 Gläser Wasser",
        description: "Hydration unterstützt deinen Stoffwechsel",
        rationale: "Ausreichend trinken reduziert Hungergefühle",
        cta: "500ml hinzufügen",
        type: "hydration"
      };
    }
    
    return {
      title: "Gut gemacht!",
      description: "Du bist heute auf einem guten Weg",
      rationale: "Halte den Kurs für dein Ziel",
      cta: "Morgen weitermachen",
      type: "success"
    };
  };

  const action = getNextBestAction();

  return (
    <PlusCard className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <div className="text-sm font-medium text-primary">Next Best Action</div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Jetzt
              </Badge>
            </div>
            
            <div>
              <div className="text-xl font-semibold mb-1">{action.title}</div>
              <div className="text-muted-foreground text-sm mb-2">{action.description}</div>
              <div className="text-xs text-muted-foreground italic">
                💡 {action.rationale}
              </div>
            </div>
            
            <Button className="w-full" size="sm">
              <span>{action.cta}</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </PlusCard>
  );
};