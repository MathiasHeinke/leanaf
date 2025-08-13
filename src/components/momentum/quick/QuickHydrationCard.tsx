import React, { useState, useEffect, useCallback } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuickFluidInput } from '@/components/QuickFluidInput';
import { Progress } from '@/components/ui/progress';
import { Droplets, Coffee, Wine } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';

interface FluidFavorite {
  name: string;
  amount: number;
  count: number;
}

export const QuickHydrationCard: React.FC = () => {
  const { user } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [todayIntake, setTodayIntake] = useState(0);
  const [favorites, setFavorites] = useState<FluidFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  
  const DAILY_GOAL = 2500; // ml

  const loadTodayIntake = useCallback(async () => {
    if (!user) return;

    try {
      const today = getCurrentDateString();
      const { data, error } = await supabase
        .from('user_fluids')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;

      const total = data?.reduce((sum, fluid) => sum + fluid.amount_ml, 0) || 0;
      setTodayIntake(total);
    } catch (error) {
      console.error('Error loading today intake:', error);
    }
  }, [user]);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('user_fluids')
        .select('custom_name, amount_ml, date')
        .eq('user_id', user.id)
        .gte('date', sinceStr);

      if (error) throw error;

      const counts: Record<string, { count: number; amounts: number[] }> = {};
      (data || []).forEach((row: any) => {
        const name = row.custom_name || 'Wasser';
        if (!counts[name]) counts[name] = { count: 0, amounts: [] };
        counts[name].count += 1;
        counts[name].amounts.push(row.amount_ml || 250);
      });

      const mode = (arr: number[]) => {
        const freq: Record<number, number> = {};
        arr.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        return sorted.length ? Number(sorted[0][0]) : Math.round((arr.reduce((s, n) => s + n, 0) / (arr.length || 1)) / 50) * 50;
      };

      const favoritesArray: FluidFavorite[] = Object.entries(counts)
        .map(([name, info]) => ({ name, amount: mode(info.amounts), count: info.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setFavorites(favoritesArray);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTodayIntake();
    loadFavorites();
  }, [loadTodayIntake, loadFavorites]);

  const addFluid = async (amount: number, name: string = 'Wasser') => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_fluids')
        .insert({
          user_id: user.id,
          amount_ml: amount,
          custom_name: name
        });

      if (error) throw error;

      toast.success(`${name} +${amount}ml hinzugefügt`);
      loadTodayIntake();
      triggerDataRefresh();
    } catch (error) {
      console.error('Error adding fluid:', error);
      toast.error('Fehler beim Hinzufügen');
    } finally {
      setLoading(false);
    }
  };

  const getFluidIcon = (name: string) => {
    if (name.toLowerCase().includes('kaffee') || name.toLowerCase().includes('coffee')) {
      return <Coffee className="h-3 w-3" />;
    }
    if (name.toLowerCase().includes('wein') || name.toLowerCase().includes('bier') || name.toLowerCase().includes('alkohol')) {
      return <Wine className="h-3 w-3" />;
    }
    return <Droplets className="h-3 w-3" />;
  };

  const progressPercent = Math.min(100, (todayIntake / DAILY_GOAL) * 100);
  const dataState = todayIntake === 0 ? 'empty' : 
                   todayIntake >= DAILY_GOAL ? 'done' : 'partial';

  return (
    <>
      <QuickCardShell
        title="Flüssigkeit"
        icon={<Droplets className="h-4 w-4" />}
        dataState={dataState}
        progressPercent={progressPercent}
        status={`${todayIntake} / ${DAILY_GOAL} ml`}
        quickActions={favorites.length >= 2 ? [
          {
            label: `${favorites[0].name} ${favorites[0].amount}ml`,
            onClick: () => addFluid(favorites[0].amount, favorites[0].name),
            disabled: loading
          },
          {
            label: `${favorites[1].name} ${favorites[1].amount}ml`,
            onClick: () => addFluid(favorites[1].amount, favorites[1].name),
            disabled: loading
          }
        ] : [
          { label: '+250ml', onClick: () => addFluid(250), disabled: loading },
          { label: '+500ml', onClick: () => addFluid(500), disabled: loading }
        ]}
        dropdownActions={(favorites.length ? favorites : [
          { name: 'Wasser', amount: 250, count: 0 },
          { name: 'Wasser', amount: 500, count: 0 }
        ]).map(fav => ({
          label: `${fav.name} ${fav.amount}ml`,
          icon: getFluidIcon(fav.name),
          onClick: () => addFluid(fav.amount, fav.name)
        }))}
        detailsAction={{
          label: 'Details',
          onClick: () => setDetailsOpen(true)
        }}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fortschritt:</span>
            <span className="font-medium">{todayIntake} / {DAILY_GOAL} ml</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {progressPercent >= 100 ? 'Tagesziel erreicht! 🎉' : `${Math.round(progressPercent)}% des Tagesziels`}
          </div>
        </div>
      </QuickCardShell>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Flüssigkeiten Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <QuickFluidInput onFluidUpdate={loadTodayIntake} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};