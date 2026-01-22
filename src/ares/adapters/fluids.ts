// ARES Adapter: Legacy Fluids <-> Modern Shape
// Provides clean interface between old user_fluids schema and new ARES expectations

import { supabase } from '@/integrations/supabase/client';

export type FluidLegacy = {
  amount_ml: number;
  date: string;
  fluid_type?: string;
  has_alcohol?: boolean;
  created_at?: string;
};

export type FluidModern = {
  volume_ml: number;
  intake_date: string;
  fluid_type?: string;
  has_alcohol?: boolean;
  timestamp?: string;
};

export const toLegacyFluid = (modern: FluidModern): FluidLegacy => ({
  amount_ml: modern.volume_ml,
  date: modern.intake_date,
  fluid_type: modern.fluid_type || 'water',
  has_alcohol: modern.has_alcohol || false,
  created_at: modern.timestamp || new Date().toISOString()
});

export const toModernFluid = (legacy: FluidLegacy): FluidModern => ({
  volume_ml: legacy.amount_ml,
  intake_date: legacy.date,
  fluid_type: legacy.fluid_type || 'water',
  has_alcohol: legacy.has_alcohol || false,
  timestamp: legacy.created_at || new Date().toISOString()
});

// Unified fluid saving (with ARES tracing)
export async function saveFluid(
  fluid: FluidModern,
  userId: string,
  fluidId?: string | null,
  customName?: string | null,
  traceId?: string
): Promise<void> {
  const { withTrace } = await import('../trace/withTrace');
  
  return withTrace(traceId, 'save_fluid', async () => {
    // Only include columns that exist in user_fluids table:
    // id, user_id, fluid_id, custom_name, amount_ml, consumed_at, date, notes, created_at, updated_at
    const today = new Date().toISOString().slice(0, 10);
    
    const fluidData = {
      user_id: userId,
      fluid_id: fluidId || null,
      custom_name: customName || null,
      amount_ml: fluid.volume_ml,
      date: today,
      consumed_at: fluid.timestamp || new Date().toISOString(),
    };

    console.log('[saveFluid] Inserting:', fluidData);

    const { error } = await supabase
      .from('user_fluids')
      .insert([fluidData]);

    if (error) {
      console.error('[saveFluid] Insert failed:', error);
      throw new Error(`Failed to save fluid: ${error.message}`);
    }
    
    console.log('[saveFluid] Success');
  }, { 
    volume_ml: fluid.volume_ml, 
    fluid_type: fluid.fluid_type,
    has_alcohol: fluid.has_alcohol 
  });
}

// Aggregate fluid data for ARES context
export const aggregateFluidContext = (fluids: FluidLegacy[]): any => {
  const total = fluids.reduce((sum, f) => sum + f.amount_ml, 0);
  const alcoholic = fluids.filter(f => f.has_alcohol).length;
  const types = [...new Set(fluids.map(f => f.fluid_type).filter(Boolean))];
  
  return {
    total_ml: total,
    entries_count: fluids.length,
    alcoholic_drinks: alcoholic,
    fluid_types: types,
    last_intake: fluids[0]?.created_at || null
  };
};