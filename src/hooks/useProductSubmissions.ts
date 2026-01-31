import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ExtractedProduct {
  product_name: string;
  brand_name: string | null;
  price_eur: number | null;
  pack_size: number | null;
  pack_unit: string | null;
  dose_per_serving: number | null;
  dose_unit: string | null;
  servings_per_pack: number | null;
  price_per_serving: number | null;
  amazon_asin: string | null;
  amazon_image: string | null;
  is_vegan: boolean;
  is_organic: boolean;
  quality_tags: string[];
  ingredients: string[];
  description: string | null;
}

export interface MatchedSupplement {
  id: string;
  name: string;
  confidence: number;
}

export interface ScrapeResult {
  success: boolean;
  error?: string;
  message?: string;
  is_valid_supplement?: boolean;
  matched_supplement?: MatchedSupplement | null;
  extracted?: ExtractedProduct;
  submission_id?: string;
  is_duplicate?: boolean;
  domain_supported?: boolean;
}

export type SubmissionState = 
  | 'idle' 
  | 'scraping' 
  | 'preview' 
  | 'submitting' 
  | 'success' 
  | 'error';

export function useProductSubmissions() {
  const { user } = useAuth();
  const [state, setState] = useState<SubmissionState>('idle');
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrapeUrl = useCallback(async (url: string): Promise<ScrapeResult | null> => {
    if (!user) {
      toast.error('Du musst angemeldet sein');
      return null;
    }

    if (!url || !url.trim()) {
      toast.error('Bitte gib eine URL ein');
      return null;
    }

    setState('scraping');
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-product-link', {
        body: { url: url.trim() },
      });

      if (error) {
        console.error('[SCRAPE] Edge function error:', error);
        setState('error');
        setErrorMessage('Verbindungsfehler. Bitte versuche es erneut.');
        return null;
      }

      const scrapeResult = data as ScrapeResult;
      setResult(scrapeResult);

      if (!scrapeResult.success) {
        setState('error');
        setErrorMessage(scrapeResult.message || 'Unbekannter Fehler');
        return scrapeResult;
      }

      setState('preview');
      return scrapeResult;

    } catch (err) {
      console.error('[SCRAPE] Exception:', err);
      setState('error');
      setErrorMessage('Netzwerkfehler. Bitte überprüfe deine Verbindung.');
      return null;
    }
  }, [user]);

  const confirmSubmission = useCallback(() => {
    if (result?.success && result.submission_id) {
      setState('success');
      toast.success('Produkt zur Prüfung eingereicht!');
    }
  }, [result]);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setErrorMessage(null);
  }, []);

  return {
    state,
    result,
    errorMessage,
    scrapeUrl,
    confirmSubmission,
    reset,
    isLoading: state === 'scraping' || state === 'submitting',
  };
}
