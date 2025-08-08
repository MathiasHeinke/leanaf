import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';
import { Droplets, Moon } from 'lucide-react';

interface PlusSupportTilesProps {
  data: UsePlusDataResult;
}

export const PlusSupportTiles: React.FC<PlusSupportTilesProps> = ({ data }) => {
  const { loading } = data;

  // Mock data for now - in real implementation, this would come from usePlusData
  const hydration = { current: 1200, target: 2000 }; // ml
  const sleep = { lastNight: 7.2, weeklyMedian: 7.5, quality: 'gut' };

  const hydrationPercentage = Math.min(100, (hydration.current / hydration.target) * 100);

  return (
    <PlusCard>
      <CardHeader>
        <CardTitle>Hydration & Schlaf</CardTitle>
        <CardDescription>Unterstützende Faktoren für dein Ziel</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6">
        {/* Hydration */}
        <div className="rounded-xl glass-card p-4">
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                <div className="text-sm text-muted-foreground">Flüssigkeit heute</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{hydration.current} ml / {hydration.target} ml</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${hydrationPercentage}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-1">{Math.round(hydrationPercentage)}% des Ziels</div>
              </div>
              <Button size="sm" variant="outline" className="w-full">
                +250 ml hinzufügen
              </Button>
            </div>
          )}
        </div>

        {/* Sleep */}
        <div className="rounded-xl glass-card p-4">
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" />
                <div className="text-sm text-muted-foreground">Schlaf letzte Nacht</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">{sleep.lastNight}h</div>
                  <div className="text-sm text-muted-foreground">Ø 7 Tage: {sleep.weeklyMedian}h</div>
                </div>
                <Badge variant={sleep.quality === 'gut' ? 'default' : 'secondary'}>
                  {sleep.quality === 'gut' ? 'Gut' : 'Verbesserbar'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                💡 Tipp: 22:30 ins Bett für optimale Recovery
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </PlusCard>
  );
};