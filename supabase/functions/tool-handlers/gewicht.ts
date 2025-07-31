import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handleWeight(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  const weight = parseFloat(lastUserMsg.replace(',', '.'));
  
  if (isNaN(weight)) {
    return {
      role: 'assistant',
      content: 'Bitte gib dein Gewicht als Zahl an, z. B. „80,5".',
    };
  }
  
  try {
    await supabase.from('weight_entries')
      .insert({ user_id: userId, weight, date: new Date().toISOString() });
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'weight',
      payload: { value: weight, unit: 'kg', ts: Date.now() }
    };
  } catch (error) {
    console.error('Error saving weight:', error);
    return {
      role: 'assistant',
      content: 'Fehler beim Speichern des Gewichts. Bitte versuche es erneut.',
    };
  }
}