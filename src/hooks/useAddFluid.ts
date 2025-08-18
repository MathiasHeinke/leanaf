import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';

export function useAddFluid(userId?: string) {
  const busy = useRef(false);

  return async (ml: number, meta?: Partial<{ 
    name: string; 
    is_water: boolean; 
    has_alcohol: boolean;
    fluid_id: string;
  }>) => {
    if (!userId || busy.current) return;
    
    busy.current = true;
    try {
      const { error } = await supabase.from('user_fluids').insert({
        user_id: userId,
        amount_ml: ml,
        consumed_at: new Date().toISOString(),
        fluid_id: meta?.fluid_id || null,
        custom_name: meta?.name || null,
        notes: null
      });
      
      if (error) throw error;
      
      // Trigger global data refresh
      triggerDataRefresh();
      
      const drinkName = meta?.name || `${ml}ml`;
      toast.success(`${drinkName} hinzugefügt`);
    } catch (error: any) {
      toast.error('Fehler beim Hinzufügen');
      console.error('Add fluid error:', error);
    } finally { 
      busy.current = false; 
    }
  };
}