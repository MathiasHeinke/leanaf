import { supabase } from '@/integrations/supabase/client';

export async function quickAddFluid(userId: string, amountMl: number, opts?: {
  category?: string; alcohol_percent?: number;
}) {
  const { error } = await supabase.from('user_fluids').insert({
    user_id: userId,
    amount_ml: amountMl,
    consumed_at: new Date().toISOString(),
    notes: opts?.category || null
  });
  if (error) throw error;
}