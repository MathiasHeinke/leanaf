import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';
import { Droplets, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';

interface PlusSupportTilesProps {
  data: UsePlusDataResult;
}

export const PlusSupportTiles: React.FC<PlusSupportTilesProps> = ({ data }) => {
  const { loading } = data;

  const hydrationCurrent: number = (data as any)?.hydrationMlToday ?? 0;
  const hydrationTarget: number = 2000;
  const sleepLastNight: number = (data as any)?.sleepDurationToday ?? 0;

  const hydrationPercentage = Math.min(100, (hydrationCurrent / hydrationTarget) * 100);

  const handleAdd250 = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) { toast.error('Bitte zuerst anmelden'); return; }
      const today = new Date().toISOString().slice(0,10);
      const { error } = await supabase.from('user_fluids').insert({ user_id: userId, amount_ml: 250, date: today, consumed_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('+250 ml erfasst');
      triggerDataRefresh();
    } catch (e) {
      toast.error('Fehler beim Hinzufügen');
    }
  };

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
                <div className="text-xl font-semibold">{hydrationCurrent} ml / {hydrationTarget} ml</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${hydrationPercentage}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-1">{Math.round(hydrationPercentage)}% des Ziels</div>
              </div>
                <Button size="sm" variant="outline" className="w-full" onClick={handleAdd250}>
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
                  <div className="text-xl font-semibold">{sleepLastNight}h</div>
                  <div className="text-sm text-muted-foreground">Ø 7 Tage: 7.5h</div>
                </div>
                <Badge variant={sleepLastNight >= 7 ? 'default' : 'secondary'}>
                  {sleepLastNight >= 7 ? 'Gut' : 'Verbesserbar'}
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