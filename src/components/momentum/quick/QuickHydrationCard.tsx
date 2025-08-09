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
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('user_fluids')
        .select('custom_name, amount_ml, fluid_database(name)')
        .eq('user_id', user.id)
        .gte('consumed_at', sevenDaysAgo.toISOString())
        .not('custom_name', 'eq', 'Wasser')
        .not('fluid_database.name', 'eq', 'Wasser');

      if (error) throw error;

      // Count occurrences and average amounts
      const favoriteMap = new Map<string, { totalAmount: number; count: number }>();
      
      data?.forEach(fluid => {
        const name = fluid.fluid_database?.name || fluid.custom_name || 'Unbekannt';
        if (name !== 'Wasser') {
          const existing = favoriteMap.get(name) || { totalAmount: 0, count: 0 };
          favoriteMap.set(name, {
            totalAmount: existing.totalAmount + fluid.amount_ml,
            count: existing.count + 1
          });
        }
      });

      // Convert to array and sort by frequency, take top 3
      const favoritesArray = Array.from(favoriteMap.entries())
        .map(([name, data]) => ({
          name,
          amount: Math.round(data.totalAmount / data.count),
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

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

  return (
    <>
      <QuickCardShell
        title="Flüssigkeit"
        icon={<Droplets className="h-4 w-4" />}
        status={`${todayIntake} / ${DAILY_GOAL} ml`}
        quickActions={[
          {
            label: '+250ml',
            onClick: () => addFluid(250),
            disabled: loading
          },
          {
            label: '+500ml',
            onClick: () => addFluid(500),
            disabled: loading
          }
        ]}
        dropdownActions={favorites.map(fav => ({
          label: `${fav.name} ${fav.amount}ml`,
          icon: getFluidIcon(fav.name),
          onClick: () => addFluid(fav.amount, fav.name)
        }))}
        detailsAction={{
          label: 'Details',
          onClick: () => setDetailsOpen(true)
        }}
      >
        <div className="space-y-2">
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