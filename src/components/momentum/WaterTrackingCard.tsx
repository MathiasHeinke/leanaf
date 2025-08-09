import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplets, Coffee, Wine, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';
// import { openFluidInput } from '@/components/quick/quickAddBus';

interface WaterTrackingCardProps {
  date: Date;
  onDataUpdate?: () => void;
}

interface FluidIntake {
  amount_ml: number;
  custom_name: string;
}

export const WaterTrackingCard: React.FC<WaterTrackingCardProps> = ({ date, onDataUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [todayIntake, setTodayIntake] = useState<FluidIntake[]>([]);
  const [commonDrinks, setCommonDrinks] = useState<{ type: string; count: number }[]>([]);
  
  const dateStr = useMemo(() => date.toISOString().slice(0, 10), [date]);
  
  const totalMl = useMemo(() => 
    todayIntake.reduce((sum, intake) => sum + intake.amount_ml, 0), 
    [todayIntake]
  );
  
  const dailyGoal = 2500; // 2.5L daily goal
  const progress = Math.min(1, totalMl / dailyGoal);
  
  const waterMl = useMemo(() => 
    todayIntake.filter(i => i.custom_name === 'Wasser' || i.custom_name?.includes('Wasser')).reduce((sum, i) => sum + i.amount_ml, 0),
    [todayIntake]
  );

  const fetchFluidData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get today's fluid intake
      const { data: fluids, error } = await supabase
        .from('user_fluids')
        .select('amount_ml, custom_name')
        .eq('user_id', user.id)
        .eq('date', dateStr);
      
      if (error) throw error;
      setTodayIntake(fluids || []);
      
      // Get most common drinks (last 30 days)
      const thirtyDaysAgo = new Date(date);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentFluids, error: recentError } = await supabase
        .from('user_fluids')
        .select('custom_name')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
        .neq('custom_name', 'Wasser');
      
      if (!recentError && recentFluids) {
        const counts = recentFluids.reduce((acc, fluid) => {
          if (fluid.custom_name) {
            acc[fluid.custom_name] = (acc[fluid.custom_name] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const sorted = Object.entries(counts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 2);
          
        setCommonDrinks(sorted);
      }
    } catch (e) {
      console.error('Failed to load fluid data:', e);
      toast.error('Fehler beim Laden der Flüssigkeitsdaten');
    } finally {
      setLoading(false);
    }
  };

  const addFluid = async (type: string, amountMl: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_fluids')
        .insert({
          user_id: user.id,
          custom_name: type,
          amount_ml: amountMl,
          date: dateStr,
          consumed_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success(`+${amountMl}ml ${type} hinzugefügt`);
      fetchFluidData();
      onDataUpdate?.();
    } catch (e) {
      console.error('Failed to add fluid:', e);
      toast.error('Fehler beim Hinzufügen');
    }
  };

  useEffect(() => {
    fetchFluidData();
  }, [user?.id, dateStr]);

  const getFluidIcon = (type: string) => {
    if (type.includes('Kaffee') || type.includes('Coffee')) return Coffee;
    if (type.includes('Tee') || type.includes('Tea')) return Wine;
    return Droplets;
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium">Flüssigkeiten</div>
            <div className="text-xs text-muted-foreground">{totalMl}ml von {dailyGoal}ml</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => {}}>
            <Plus className="h-4 w-4 mr-1" />
            Getränk
          </Button>
        </div>

        {loading ? (
          <div className="h-20 rounded-md bg-secondary animate-pulse" />
        ) : (
          <>
            {/* Progress Visualization */}
            <div className="mb-4">
              <div className="flex items-end justify-center h-16 bg-secondary/30 rounded-lg p-2">
                <div 
                  className="bg-primary/60 rounded-sm transition-all duration-500 flex items-end justify-center text-[10px] text-primary-foreground font-medium min-h-2"
                  style={{ 
                    height: `${Math.max(10, progress * 100)}%`,
                    width: '20px'
                  }}
                >
                  {progress >= 0.3 && `${Math.round(progress * 100)}%`}
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground mt-1">
                {waterMl}ml Wasser heute
              </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => addFluid('Wasser', 250)}
                className="text-xs"
              >
                <Droplets className="h-4 w-4 mr-1" />
                +250ml
              </Button>
              
              {commonDrinks.slice(0, 2).map((drink) => {
                const Icon = getFluidIcon(drink.type);
                return (
                  <Button
                    key={drink.type}
                    size="sm"
                    variant="secondary"
                    onClick={() => addFluid(drink.type, 200)}
                    className="text-xs"
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    +200ml
                  </Button>
                );
              })}
              
              {commonDrinks.length < 2 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addFluid('Kaffee', 200)}
                  className="text-xs"
                >
                  <Coffee className="h-4 w-4 mr-1" />
                  +200ml
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};