import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';

interface PlusMacroDeltasProps {
  data: UsePlusDataResult;
}

export const PlusMacroDeltas: React.FC<PlusMacroDeltasProps> = ({ data }) => {
  const { loading, goals, today, proteinDelta, carbBudget } = data;

  const proteinBadgeVariant: 'default' | 'secondary' = (today?.total_protein || 0) >= (goals?.protein || 0) ? 'default' : 'secondary';

  return (
    <PlusCard>
      <CardHeader>
        <CardTitle>Makro-Deltas</CardTitle>
        <CardDescription>Protein-Delta und Carb‑Budget für heute</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Protein */}
        <div className="rounded-xl glass-card p-4">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Protein</div>
                <div className="text-xl font-semibold">Fehlen noch: +{proteinDelta ?? 0} g</div>
                <div className="text-sm text-muted-foreground">Heute: {(today?.total_protein || 0)} g / Ziel: {(goals?.protein || 0)} g</div>
              </div>
              <Badge variant={proteinBadgeVariant}>{(today?.total_protein || 0) >= (goals?.protein || 0) ? '≥ 1.8 g/kg erreicht?' : 'Weiter so'}</Badge>
            </div>
          )}
        </div>

        {/* Carbs */}
        <div className="rounded-xl glass-card p-4">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Carb‑Kontrolle</div>
                <div className="text-xl font-semibold">Budget übrig: {carbBudget ?? 0} g</div>
                <div className="text-sm text-muted-foreground">Heute: {(today?.total_carbs || 0)} g / Ziel: {(goals?.carbs || 0)} g</div>
              </div>
              <Badge variant="outline">Süßkram‑Lock: Aus</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </PlusCard>
  );
};
