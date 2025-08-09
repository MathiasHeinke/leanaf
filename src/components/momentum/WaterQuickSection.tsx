import React, { useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplets } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { quickAddBus } from '@/components/quick/quickAddBus';

interface WaterQuickSectionProps {
  date: Date;
  totalMl: number;
  goal?: number;
  onDataUpdate?: () => void;
}

export const WaterQuickSection: React.FC<WaterQuickSectionProps> = ({ date, totalMl, goal = 2500, onDataUpdate }) => {
  const { user } = useAuth();

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
    const unsub = (quickAddBus as any).subscribe
      ? (quickAddBus as any).subscribe((action: any) => {
          if (action?.type === 'fluid') {
            addFluid(250, 'Wasser');
          }
        })
      : undefined;
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [addFluid]);

  const pct = Math.min(1, Math.max(0, goal ? totalMl / goal : 0));

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Flüssigkeit</div>
              <div className="text-xs text-muted-foreground">{Math.round(totalMl)} / {Math.round(goal)} ml</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addFluid(250, 'Wasser')}>+250 ml</Button>
            <Button size="sm" variant="outline" onClick={() => addFluid(500, 'Wasser')}>+500 ml</Button>
          </div>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct * 100}%` }} />
        </div>
      </CardContent>
    </Card>
  );
};
