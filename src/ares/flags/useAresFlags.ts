import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAresFlags() {
  const [flags, setFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    supabase.functions.invoke('ares-get-flags', { body: {} })
      .then(response => {
        setFlags(response.data?.flags ?? []);
      })
      .catch(error => {
        console.warn('[ARES-FLAGS] Failed to load flags:', error);
        setFlags([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);
  
  const has = (flag: string) => flags.includes(flag);
  
  return { flags, has, loading };
}