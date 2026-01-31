import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Extended interface for enriched product data (54+ fields)
export interface ExtendedEnrichedData {
  // === PRODUCT (20+ fields) ===
  product_name?: string;
  brand_name?: string;
  form?: string;
  category?: string;
  pack_size?: number;
  pack_unit?: string;
  servings_per_pack?: number;
  dose_per_serving?: number;
  dose_unit?: string;
  dosage_per_serving?: string;
  serving_size?: string;
  price_eur?: number;
  price_per_serving?: number;
  is_vegan?: boolean;
  is_organic?: boolean;
  is_gluten_free?: boolean;
  allergens?: string[];
  quality_tags?: string[];
  timing?: string;
  short_description?: string;
  description?: string;
  ingredients?: string[];
  
  // === AMAZON (5 fields) ===
  amazon_asin?: string;
  amazon_url?: string;
  amazon_image?: string;
  amazon_name?: string;
  amazon_match_score?: number;
  
  // === BIG8 QUALITY SCORES (8 fields) ===
  quality_bioavailability?: number;
  quality_dosage?: number;
  quality_form?: number;
  quality_purity?: number;
  quality_research?: number;
  quality_synergy?: number;
  quality_transparency?: number;
  quality_value?: number;
  
  // === LEGACY QUALITY (7 fields) ===
  bioavailability?: number;
  potency?: number;
  reviews?: number;
  origin?: string;
  lab_tests?: string;
  purity?: number;
  value?: number;
  
  // === SCORES (3 fields) ===
  impact_score_big8?: number;
  popularity_score?: number;
  match_score?: number;
  
  // === INGREDIENT DATA (from supplement_database) ===
  synergies?: string[];
  blockers?: string[];
  timing_constraint?: string;
  cycling_protocol?: string;
  evidence_level?: string;
  necessity_tier?: string;
  hallmarks_addressed?: string[];
  clinical_dosage_min?: number;
  clinical_dosage_max?: number;
  clinical_dosage_unit?: string;
  
  // === BRAND DATA (from supplement_brands) ===
  brand_id?: string;
  brand_country?: string;
  brand_price_tier?: string;
  brand_certifications?: string[];
  brand_is_new?: boolean;
  
  // === META ===
  enrichment_version?: string;
  enriched_at?: string;
  enrichment_source?: 'ai' | 'rules' | 'hybrid';
}

export interface ProductSubmission {
  id: string;
  user_id: string;
  source_url: string;
  source_domain: string;
  status: 'pending' | 'approved' | 'rejected' | 'failed';
  extracted_data: ExtendedEnrichedData | null;
  matched_supplement_id: string | null;
  matched_supplement_name: string | null;
  match_confidence: number | null;
  rejection_reason: string | null;
  created_product_id: string | null;
  created_at: string;
  updated_at: string;
  is_enriched?: boolean;
}

export type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function useProductSubmissionsAdmin() {
  const [submissions, setSubmissions] = useState<ProductSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('product_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Type-safe mapping
      const mapped: ProductSubmission[] = (data || []).map((row: any) => {
        const hasScores = row.extracted_data?.quality_bioavailability != null ||
                          row.extracted_data?.impact_score_big8 != null;
        return {
          id: row.id,
          user_id: row.user_id,
          source_url: row.source_url,
          source_domain: row.source_domain,
          status: row.status,
          extracted_data: row.extracted_data,
          matched_supplement_id: row.matched_supplement_id,
          matched_supplement_name: row.matched_supplement_name,
          match_confidence: row.match_confidence,
          rejection_reason: row.rejection_reason,
          created_product_id: row.created_product_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          is_enriched: hasScores,
        };
      });

      setSubmissions(mapped);
    } catch (err) {
      console.error('[ADMIN] Failed to fetch submissions:', err);
      toast.error('Fehler beim Laden der Einreichungen');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_submissions')
        .select('status');

      if (error) throw error;

      const counts = { pending: 0, approved: 0, rejected: 0, total: 0 };
      (data || []).forEach((row: any) => {
        counts.total++;
        if (row.status === 'pending') counts.pending++;
        else if (row.status === 'approved') counts.approved++;
        else if (row.status === 'rejected') counts.rejected++;
      });

      setCounts(counts);
    } catch (err) {
      console.error('[ADMIN] Failed to fetch counts:', err);
    }
  }, []);

  const enrichSubmission = useCallback(async (submissionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('enrich-product-submission', {
        body: { submission_id: submissionId },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Produkt erfolgreich angereichert!');
        fetchSubmissions();
        return data.enriched_data;
      } else {
        throw new Error(data?.error || 'Enrichment failed');
      }
    } catch (err) {
      console.error('[ADMIN] Enrich failed:', err);
      toast.error('Fehler bei der Anreicherung');
      return null;
    }
  }, [fetchSubmissions]);

  const approveSubmission = useCallback(async (submission: ProductSubmission) => {
    if (!submission.extracted_data || !submission.matched_supplement_id) {
      toast.error('Fehlende Daten für Genehmigung');
      return false;
    }

    try {
      const extracted = submission.extracted_data;

      // 1. Insert into supplement_products with Big8 scores
      const { data: newProduct, error: insertError } = await supabase
        .from('supplement_products')
        .insert({
          supplement_id: submission.matched_supplement_id,
          product_name: extracted.product_name || 'Unbekanntes Produkt',
          brand_name: extracted.brand_name || null,
          price_eur: extracted.price_eur || null,
          pack_size: extracted.pack_size || null,
          pack_unit: extracted.pack_unit || null,
          dose_per_serving: extracted.dose_per_serving || null,
          dose_unit: extracted.dose_unit || null,
          servings_per_pack: extracted.servings_per_pack || null,
          price_per_serving: extracted.price_per_serving || null,
          amazon_asin: extracted.amazon_asin || null,
          amazon_image: extracted.amazon_image || null,
          is_vegan: extracted.is_vegan || false,
          is_organic: extracted.is_organic || false,
          quality_tags: extracted.quality_tags || [],
          ingredients: extracted.ingredients || [],
          description: extracted.description || null,
          source_url: submission.source_url,
          is_active: true,
          // Big8 Quality Scores
          quality_bioavailability: extracted.quality_bioavailability || null,
          quality_dosage: extracted.quality_dosage || null,
          quality_form: extracted.quality_form || null,
          quality_purity: extracted.quality_purity || null,
          quality_research: extracted.quality_research || null,
          quality_synergy: extracted.quality_synergy || null,
          quality_transparency: extracted.quality_transparency || null,
          quality_value: extracted.quality_value || null,
          impact_score_big8: extracted.impact_score_big8 || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 2. Update submission status
      const { error: updateError } = await supabase
        .from('product_submissions')
        .update({
          status: 'approved',
          created_product_id: newProduct.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast.success('Produkt genehmigt und zur Datenbank hinzugefügt!');
      fetchSubmissions();
      fetchCounts();
      return true;
    } catch (err) {
      console.error('[ADMIN] Approve failed:', err);
      toast.error('Fehler bei der Genehmigung');
      return false;
    }
  }, [fetchSubmissions, fetchCounts]);

  const rejectSubmission = useCallback(async (submissionId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('product_submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Einreichung abgelehnt');
      fetchSubmissions();
      fetchCounts();
      return true;
    } catch (err) {
      console.error('[ADMIN] Reject failed:', err);
      toast.error('Fehler beim Ablehnen');
      return false;
    }
  }, [fetchSubmissions, fetchCounts]);

  const deleteSubmission = useCallback(async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('product_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Einreichung gelöscht');
      fetchSubmissions();
      fetchCounts();
      return true;
    } catch (err) {
      console.error('[ADMIN] Delete failed:', err);
      toast.error('Fehler beim Löschen');
      return false;
    }
  }, [fetchSubmissions, fetchCounts]);

  useEffect(() => {
    fetchSubmissions();
    fetchCounts();
  }, [fetchSubmissions, fetchCounts]);

  return {
    submissions,
    loading,
    statusFilter,
    setStatusFilter,
    counts,
    enrichSubmission,
    approveSubmission,
    rejectSubmission,
    deleteSubmission,
    refresh: () => {
      fetchSubmissions();
      fetchCounts();
    },
  };
}
