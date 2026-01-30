/**
 * useAresInstantCheck - Hook for ARES Instant Supplement Analysis
 * 
 * Provides a simple request/response pattern (no streaming)
 * for lightweight, inline supplement analysis.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PreferredTiming, TimingConstraint } from '@/types/supplementLibrary';

export interface SupplementAnalysisInput {
  name: string;
  dosage: string;
  unit: string;
  timing: PreferredTiming;
  brandName?: string;
  constraint?: TimingConstraint;
}

interface AnalysisResult {
  analysis: string;
  timing?: {
    load: number;
    ai: number;
    total: number;
  };
}

interface UseAresInstantCheckReturn {
  analyze: (supplement: SupplementAnalysisInput) => Promise<void>;
  isLoading: boolean;
  result: string | null;
  error: string | null;
  reset: () => void;
}

export function useAresInstantCheck(): UseAresInstantCheckReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (supplement: SupplementAnalysisInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[ARES-INSTANT-CHECK] Requesting analysis for:', supplement.name);

      const { data, error: fnError } = await supabase.functions.invoke<AnalysisResult>(
        'ares-instant-check',
        {
          body: { supplement },
        }
      );

      if (fnError) {
        console.error('[ARES-INSTANT-CHECK] Function error:', fnError);
        setError('Analyse fehlgeschlagen. Bitte versuche es erneut.');
        return;
      }

      if (data?.analysis) {
        console.log('[ARES-INSTANT-CHECK] Analysis received:', data.timing);
        setResult(data.analysis);
      } else {
        setError('Keine Analyse erhalten.');
      }
    } catch (err) {
      console.error('[ARES-INSTANT-CHECK] Error:', err);
      setError('Ein Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    analyze,
    isLoading,
    result,
    error,
    reset,
  };
}
