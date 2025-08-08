import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';

interface CompactMacrosProps {
  data: UsePlusDataResult;
}

export const CompactMacros: React.FC<CompactMacrosProps> = ({ data }) => {
  if (data.loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
      </div>
    );
  }

  const proteinDelta = data.proteinDelta || 0;
  const carbBudget = data.carbBudget || 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Protein */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">
                {proteinDelta > 0 ? `+${Math.round(proteinDelta)}` : Math.round(proteinDelta)} g
              </div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <Badge variant={proteinDelta <= 0 ? 'default' : 'destructive'} className="text-xs">
              {proteinDelta <= 0 ? '✓' : 'Fehlt'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Carbs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">
                {Math.round(carbBudget)} g
              </div>
              <div className="text-xs text-muted-foreground">Carb Budget</div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Süßkram: Aus
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};