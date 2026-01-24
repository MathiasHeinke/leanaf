// ARES Research - Perplexity-powered Scientific Research
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ResearchRequest {
  query: string;
  focus?: 'peptides' | 'nutrition' | 'training' | 'supplements' | 'longevity' | 'hormones';
  language?: 'de' | 'en';
  maxResults?: number;
}

interface ResearchResult {
  answer: string;
  citations: string[];
  model: string;
  searchMode: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID();
  console.log(`[ARES-Research] ${traceId} Starting research request`);

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ResearchRequest = await req.json();
    const { query, focus, language = 'de', maxResults = 5 } = body;

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Query too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ARES-Research] ${traceId} Query: "${query}", Focus: ${focus || 'general'}`);

    // Build research-optimized prompt
    const focusContext = focus ? getFocusContext(focus) : '';
    const systemPrompt = buildResearchSystemPrompt(language, focusContext);
    
    // Translate query to English for better academic results
    const researchQuery = language === 'de' 
      ? `${query} (translate to English for search, respond in German)`
      : query;

    // Call Perplexity with academic search mode
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-reasoning',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: researchQuery }
        ],
        search_mode: 'academic',
        search_domain_filter: getAcademicDomains(focus),
        temperature: 0.1, // Low for factual accuracy
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`[ARES-Research] ${traceId} Perplexity error:`, errorText);
      
      if (perplexityResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
    }

    const data = await perplexityResponse.json();
    const answer = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`[ARES-Research] ${traceId} Success - ${citations.length} citations`);

    // Log research query for analytics
    try {
      await supabase.from('ai_usage_tracking').insert({
        user_id: user.id,
        service_type: 'perplexity_research',
        request_metadata: {
          query: query.substring(0, 200),
          focus,
          citations_count: citations.length,
          trace_id: traceId
        }
      });
    } catch (logError) {
      console.warn('[ARES-Research] Failed to log usage:', logError);
    }

    const result: ResearchResult = {
      answer,
      citations: citations.slice(0, maxResults),
      model: 'sonar-reasoning',
      searchMode: 'academic'
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error(`[ARES-Research] ${traceId} Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Research failed',
        traceId 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildResearchSystemPrompt(language: string, focusContext: string): string {
  if (language === 'de') {
    return `Du bist ein wissenschaftlicher Recherche-Assistent f${'\u00fc'}r ARES, einen Elite-Fitness-Coach.

AUFGABE:
- Suche nach aktuellen, peer-reviewed Studien und wissenschaftlicher Evidenz
- Priorisiere Meta-Analysen, RCTs und systematische Reviews
- Zitiere konkrete Studien mit Autoren und Jahr
- Antworte auf Deutsch, auch wenn du auf Englisch suchst

FORMAT:
1. Kurze Zusammenfassung der Evidenzlage (2-3 S${'\u00e4'}tze)
2. Wichtigste Studienergebnisse mit Quellenangabe
3. Praktische Implikationen f${'\u00fc'}r Training/Ern${'\u00e4'}hrung

${focusContext}

WICHTIG: Nur evidenzbasierte Aussagen. Bei unsicherer Datenlage dies klar kommunizieren.`;
  }
  
  return `You are a scientific research assistant for ARES, an elite fitness coach.

TASK:
- Search for current, peer-reviewed studies and scientific evidence
- Prioritize meta-analyses, RCTs, and systematic reviews
- Cite specific studies with authors and year

FORMAT:
1. Brief summary of evidence (2-3 sentences)
2. Key study findings with citations
3. Practical implications for training/nutrition

${focusContext}

IMPORTANT: Only evidence-based statements. Clearly communicate when data is uncertain.`;
}

function getFocusContext(focus: string): string {
  const contexts: Record<string, string> = {
    peptides: 'Fokus auf Peptid-Forschung: GLP-1 Agonisten (Semaglutide, Tirzepatide, Retatrutide), BPC-157, TB-500, Growth Hormone Secretagogues.',
    nutrition: 'Fokus auf Ern${"\u00e4"}hrungswissenschaft: Makron${"\u00e4"}hrstoffe, Meal Timing, Metabolismus, Gewichtsmanagement.',
    training: 'Fokus auf Trainingswissenschaft: Hypertrophie, Kraft, Periodisierung, Recovery, Muskelaufbau.',
    supplements: 'Fokus auf Supplement-Forschung: Creatin, Protein, Vitamine, Mineralstoffe, Nootropics.',
    longevity: 'Fokus auf Longevity-Forschung: Senolytika, NAD+, Sirtuine, Mitochondrien, Telomere, Epigenetik.',
    hormones: 'Fokus auf Hormonforschung: Testosteron, Cortisol, Insulin, Schilddr${"\u00fc"}se, HGH.',
  };
  return contexts[focus] || '';
}

function getAcademicDomains(focus?: string): string[] {
  // Always include these
  const baseDomains = ['pubmed.ncbi.nlm.nih.gov', 'scholar.google.com', 'ncbi.nlm.nih.gov'];
  
  const focusDomains: Record<string, string[]> = {
    peptides: ['clinicaltrials.gov', 'nature.com', 'nejm.org'],
    nutrition: ['nutrition.org', 'ajcn.nutrition.org'],
    training: ['journals.lww.com', 'springer.com'],
    supplements: ['examine.com', 'ods.od.nih.gov'],
    longevity: ['aging-us.com', 'cell.com', 'nature.com'],
    hormones: ['endocrine.org', 'academic.oup.com'],
  };
  
  return [...baseDomains, ...(focusDomains[focus || ''] || [])];
}
