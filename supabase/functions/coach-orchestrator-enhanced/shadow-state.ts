import type { Meta } from './open-intake.ts';

export async function saveShadowState(supabase: any, { userId, traceId, meta }: {
  userId: string; 
  traceId: string; 
  meta: Meta;
}) {
  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes TTL
    
    await supabase
      .from('shadow_state')
      .upsert({ 
        user_id: userId, 
        trace_id: traceId, 
        meta, 
        expires_at: expiresAt 
      });
  } catch (error) {
    console.error('saveShadowState error:', error);
    // Non-blocking - continue without shadow state if needed
  }
}

export async function loadShadowState(supabase: any, { userId, traceId }: {
  userId: string; 
  traceId: string;
}): Promise<Meta | undefined> {
  try {
    const { data, error } = await supabase
      .from('shadow_state')
      .select('meta')
      .eq('user_id', userId)
      .eq('trace_id', traceId)
      .gt('expires_at', new Date().toISOString()) // Only non-expired entries
      .maybeSingle();
    
    if (error || !data) {
      return undefined;
    }
    
    return data.meta as Meta;
  } catch (error) {
    console.error('loadShadowState error:', error);
    return undefined;
  }
}

export async function cleanupExpiredShadowState(supabase: any) {
  try {
    await supabase
      .from('shadow_state')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('cleanupExpiredShadowState error:', error);
  }
}