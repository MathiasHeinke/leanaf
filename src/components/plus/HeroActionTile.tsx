import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';
import { UsePlusDataResult } from '@/hooks/usePlusData';

interface HeroActionTileProps {
  data: UsePlusDataResult;
}

export const HeroActionTile: React.FC<HeroActionTileProps> = ({ data }) => {
  const nextAction = useMemo(() => {
    if (data.loading) return null;
    
    // Priority: Protein > Deficit > Steps
    const proteinDelta = data.proteinDelta || 0;
    const remainingKcal = data.remainingKcal || 0;
    
    if (proteinDelta > 20) {
      return {
        title: `+${Math.round(proteinDelta)} g Protein`,
        description: 'Wichtigster Makro für heute',
        progress: Math.max(0, 100 - (proteinDelta / (data.goals?.protein || 1)) * 100),
        variant: 'destructive' as const
      };
    }
    
    if (remainingKcal > 200) {
      return {
        title: `${Math.round(remainingKcal)} kcal verbleibend`,
        description: 'Defizit-Ziel erreichen',
        progress: Math.max(0, ((data.goals?.calories || 1) - remainingKcal) / (data.goals?.calories || 1) * 100),
        variant: 'default' as const
      };
    }
    
    return {
      title: 'Alle Tagesziele erreicht',
      description: 'Großartig gemacht!',
      progress: 100,
      variant: 'default' as const
    };
  }, [data]);

  if (data.loading || !nextAction) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">NEXT ACTION</span>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-1">{nextAction.title}</h2>
          <p className="text-sm text-muted-foreground">{nextAction.description}</p>
        </div>
        
        <div className="space-y-2">
          <Progress value={nextAction.progress} className="h-2" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {Math.round(nextAction.progress)}% erreicht
            </span>
            <Button size="sm" variant={nextAction.variant}>
              Eintragen →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};