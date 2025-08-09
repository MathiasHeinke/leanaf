import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplets, Coffee, Wine, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';
import { quickAddBus } from '@/components/quick/quickAddBus';

interface FluidTrackingCardProps {
  date: Date;
  totalMl: number;
  goal?: number;
  onDataUpdate?: () => void;
}

interface FluidIntake {
  amount_ml: number;
  custom_name: string;
}

export const FluidTrackingCard: React.FC<FluidTrackingCardProps> = ({ 
  date, 
  totalMl, 
  goal = 2500, 
  onDataUpdate 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [commonDrinks, setCommonDrinks] = useState<{ type: string; count: number }[]>([]);
  
  const dateStr = useMemo(() => date.toISOString().slice(0, 10), [date]);
  const isToday = useMemo(() => dateStr === new Date().toISOString().slice(0, 10), [dateStr]);
  const progress = Math.min(1, totalMl / goal);

  const fetchCommonDrinks = useCallback(async () => {
    if (!user) return;
    
    try {
      const thirtyDaysAgo = new Date(date);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('user_fluids')
        .select('custom_name')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
        .neq('custom_name', 'Wasser');
      
      if (!error && data) {
        const counts = data.reduce((acc, fluid) => {
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
      console.error('Failed to load common drinks:', e);
    }
  }, [user, date]);

  const addFluid = useCallback(async (amount: number, name: string = 'Wasser') => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_fluids')
        .insert({
          user_id: user.id,
          amount_ml: amount,
          consumed_at: new Date().toISOString(),
          custom_name: name
        });
      
      if (error) throw error;
      toast.success(`${name} +${amount} ml`);
      onDataUpdate?.();
    } catch (e) {
      console.error('Failed to add fluid', e);
      toast.error('Flüssigkeit konnte nicht gespeichert werden');
    }
  }, [user, onDataUpdate]);

  useEffect(() => {
    fetchCommonDrinks();
  }, [fetchCommonDrinks]);

  // Listen to quick add bus for fluid events
  useEffect(() => {
    const unsub = (quickAddBus as any).subscribe
      ? (quickAddBus as any).subscribe((action: any) => {
          if (action?.type === 'fluid') {
            addFluid(250, 'Wasser');
          }
        })
      : undefined;
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [addFluid]);

  const getFluidIcon = (type: string) => {
    if (type.includes('Kaffee') || type.includes('Coffee')) return Coffee;
    if (type.includes('Tee') || type.includes('Tea')) return Wine;
    return Droplets;
  };

  return (
    <Card className="rounded-2xl border border-border/40">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl grid place-items-center bg-muted">
              <Droplets className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">Flüssigkeit</div>
              <div className="text-xs text-muted-foreground">{Math.round(totalMl)} / {Math.round(goal)} ml</div>
            </div>
          </div>
          {isToday && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addFluid(250, 'Wasser')}>+250 ml</Button>
              <Button size="sm" variant="outline" onClick={() => addFluid(500, 'Wasser')}>+500 ml</Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div 
              className="h-full bg-primary transition-[width] duration-300" 
              style={{ width: `${progress * 100}%` }} 
            />
          </div>
        </div>

        {/* Quick Add Buttons for common drinks */}
        {isToday && commonDrinks.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {commonDrinks.map((drink) => {
              const Icon = getFluidIcon(drink.type);
              return (
                <Button
                  key={drink.type}
                  size="sm"
                  variant="secondary"
                  onClick={() => addFluid(200, drink.type)}
                  className="text-xs"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  +200ml
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};