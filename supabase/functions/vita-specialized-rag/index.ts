import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VitaRAGRequest {
  query: string;
  user_context?: {
    age?: number;
    menopause_stage?: 'perimenopause' | 'menopause' | 'postmenopause';
    cycle_phase?: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
    health_conditions?: string[];
    current_symptoms?: string[];
  };
  search_method?: 'vita_specialized' | 'hybrid' | 'semantic';
  max_results?: number;
}

interface VitaSearchResult {
  knowledge_id: string;
  content_chunk: string;
  title: string;
  expertise_area: string;
  vita_relevance_score: number;
  life_stage_match: number;
  symptom_match: number;
  evidence_level: 'high' | 'medium' | 'low';
  source_type: 'research' | 'clinical' | 'practical';
}

// Dr. Vita Femina specialized query expansion
const VITA_QUERY_EXPANSIONS = {
  // Cycle-related terms
  cycle: ['menstrual', 'period', 'ovulation', 'luteal', 'follicular', 'hormone', 'östrogen', 'progesteron'],
  training: ['krafttraining', 'zyklusbasiert', 'periodisierung', 'weiblich', 'hormonell'],
  menopause: ['wechseljahre', 'perimenopause', 'postmenopause', 'hitzewallungen', 'östrogenmangel'],
  pcos: ['insulinresistenz', 'hyperandrogenismus', 'zyklusstörung', 'stoffwechsel'],
  endometriose: ['schmerzen', 'entzündung', 'chronisch', 'bewegung', 'lebensqualität'],
  pregnancy: ['schwangerschaft', 'prenatal', 'beckenboden', 'krafttraining', 'sicher'],
  
  // Life stage terms
  puberty: ['adoleszenz', 'erste periode', 'entwicklung', 'hormonell'],
  reproductive: ['fruchtbar', 'zyklus', 'empfängnis', 'hormonbalance'],
  postpartum: ['rückbildung', 'stillzeit', 'rektusdiastase', 'beckenboden', 'müdigkeit'],
  
  // Symptom clusters
  hormonal_symptoms: ['stimmungsschwankungen', 'schlafstörungen', 'gewichtszunahme', 'haarausfall'],
  cycle_symptoms: ['pms', 'krämpfe', 'brustspannen', 'blähungen', 'heißhunger'],
  menopause_symptoms: ['hitzewallungen', 'nachtschweiß', 'trockenheit', 'gelenkschmerzen', 'gehirnnebel']
};

// Evidence-based topic prioritization for Dr. Vita
const VITA_EXPERTISE_WEIGHTS = {
  'zyklusorientierte-periodisierung': 1.0,
  'hormonbalance-training': 0.95,
  'pcos-management': 0.9,
  'endometriose-support': 0.9,
  'menopause-coaching': 0.85,
  'schwangerschafts-fitness': 0.85,
  'postnatale-rückbildung': 0.8,
  'frauenspezifische-ernährung': 0.75,
  'evidenzbasierte-praxis': 0.7,
  'empathische-kommunikation': 0.65
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: VitaRAGRequest = await req.json();
    const {
      query,
      user_context,
      search_method = 'vita_specialized',
      max_results = 5
    } = request;

    console.log(`Dr. Vita RAG request: "${query}" with context:`, user_context);

    // Step 1: Enhanced query processing for female health topics
    const expandedQuery = expandVitaQuery(query, user_context);
    console.log(`Expanded query: "${expandedQuery}"`);

    // Step 2: Generate context-aware embedding
    const queryEmbedding = await generateContextAwareEmbedding(openAIApiKey, expandedQuery, user_context);

    // Step 3: Perform Vita-specialized search
    const searchResults = await performVitaSpecializedSearch(
      supabaseClient,
      expandedQuery,
      queryEmbedding,
      user_context,
      max_results
    );

    // Step 4: Apply Vita-specific relevance scoring
    const vitaRankedResults = applyVitaRelevanceScoring(searchResults, query, user_context);

    // Step 5: Build context with life-stage awareness
    const contextChunks = buildVitaContext(vitaRankedResults, user_context);

    const responseTime = Date.now() - startTime;

    // Enhanced telemetry for Dr. Vita
    try {
      const telemetryData = {
        coach_id: 'vita',
        query_text: query.substring(0, 100),
        expanded_query: expandedQuery.substring(0, 150),
        search_method,
        response_time_ms: responseTime,
        results_count: searchResults.length,
        user_life_stage: detectLifeStage(user_context),
        dominant_health_theme: detectHealthTheme(query, user_context),
        vita_specialization_match: calculateSpecializationMatch(searchResults),
        evidence_quality_score: calculateEvidenceQuality(vitaRankedResults),
        context_personalization_score: calculatePersonalizationScore(user_context, vitaRankedResults)
      };

      await supabaseClient
        .from('coach_trace_events')
        .insert({
          trace_id: `vita-rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          step: 'vita_rag_search',
          status: 'completed',
          data: telemetryData,
          created_at: new Date().toISOString()
        });
    } catch (metricsError) {
      console.error('Failed to save Vita RAG telemetry:', metricsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        context: contextChunks,
        search_results: vitaRankedResults,
        vita_insights: generateVitaInsights(vitaRankedResults, user_context),
        metadata: {
          search_method,
          response_time_ms: responseTime,
          results_count: searchResults.length,
          personalization_applied: !!user_context,
          life_stage_detected: detectLifeStage(user_context),
          health_focus_areas: extractHealthFocusAreas(query, user_context)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Dr. Vita RAG function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function expandVitaQuery(query: string, userContext?: any): string {
  let expandedTerms: string[] = [query];
  const lowerQuery = query.toLowerCase();

  // Add context-based expansions
  if (userContext?.cycle_phase) {
    expandedTerms.push(userContext.cycle_phase);
    expandedTerms.push('zyklus');
  }

  if (userContext?.menopause_stage) {
    expandedTerms.push(userContext.menopause_stage);
    expandedTerms.push('wechseljahre');
  }

  // Apply semantic expansions based on query content
  Object.entries(VITA_QUERY_EXPANSIONS).forEach(([category, terms]) => {
    if (terms.some(term => lowerQuery.includes(term.toLowerCase()))) {
      expandedTerms.push(...terms.slice(0, 3)); // Add top 3 related terms
    }
  });

  // Add life stage context
  const lifeStage = detectLifeStage(userContext);
  if (lifeStage && lifeStage !== 'unknown') {
    expandedTerms.push(lifeStage);
  }

  return [...new Set(expandedTerms)].join(' ');
}

async function generateContextAwareEmbedding(
  openAIApiKey: string, 
  query: string, 
  userContext?: any
): Promise<number[]> {
  // Enhanced query with context for better embeddings
  let contextualQuery = query;
  
  if (userContext) {
    const contextPrefix = buildContextPrefix(userContext);
    contextualQuery = `${contextPrefix} ${query}`;
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: contextualQuery,
      encoding_format: 'float'
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function buildContextPrefix(userContext: any): string {
  const contexts = [];
  
  if (userContext.age) {
    if (userContext.age < 25) contexts.push('junge Frau');
    else if (userContext.age > 45) contexts.push('reife Frau');
  }
  
  if (userContext.menopause_stage) contexts.push(userContext.menopause_stage);
  if (userContext.cycle_phase) contexts.push(userContext.cycle_phase);
  if (userContext.health_conditions?.length) contexts.push('gesundheitliche Herausforderungen');
  
  return contexts.length > 0 ? `Kontext: ${contexts.join(', ')}.` : '';
}

async function performVitaSpecializedSearch(
  supabaseClient: any,
  query: string,
  queryEmbedding: number[],
  userContext: any,
  maxResults: number
): Promise<VitaSearchResult[]> {
  
  // Use semantic search with Vita-specific filtering
  const { data, error } = await supabaseClient.rpc('search_knowledge_semantic', {
    query_embedding: queryEmbedding,
    coach_filter: 'vita',
    similarity_threshold: 0.5, // Lower threshold for specialized content
    match_count: maxResults * 2 // Get more results for better filtering
  });

  if (error) throw error;
  
  // Transform to Vita-specific format with enhanced scoring
  return (data || []).map((result: any) => ({
    knowledge_id: result.knowledge_id,
    content_chunk: result.content_chunk,
    title: result.title,
    expertise_area: result.expertise_area,
    vita_relevance_score: result.similarity || 0,
    life_stage_match: calculateLifeStageMatch(result, userContext),
    symptom_match: calculateSymptomMatch(result, userContext),
    evidence_level: determineEvidenceLevel(result),
    source_type: determineSourceType(result)
  })).slice(0, maxResults);
}

function applyVitaRelevanceScoring(
  results: VitaSearchResult[], 
  originalQuery: string, 
  userContext: any
): VitaSearchResult[] {
  return results.map(result => {
    let enhancedScore = result.vita_relevance_score;
    
    // Boost based on expertise area relevance
    const expertiseWeight = VITA_EXPERTISE_WEIGHTS[result.expertise_area] || 0.5;
    enhancedScore *= expertiseWeight;
    
    // Life stage matching bonus
    enhancedScore += result.life_stage_match * 0.2;
    
    // Symptom matching bonus
    enhancedScore += result.symptom_match * 0.15;
    
    // Evidence quality bonus
    const evidenceBonus = result.evidence_level === 'high' ? 0.1 : 
                         result.evidence_level === 'medium' ? 0.05 : 0;
    enhancedScore += evidenceBonus;
    
    // Recent content bonus (if available)
    if (result.title.includes('2024') || result.title.includes('2025')) {
      enhancedScore += 0.05;
    }
    
    result.vita_relevance_score = Math.min(enhancedScore, 1.0);
    return result;
  }).sort((a, b) => b.vita_relevance_score - a.vita_relevance_score);
}

function buildVitaContext(results: VitaSearchResult[], userContext: any): any[] {
  return results.map((result, index) => ({
    content: result.content_chunk,
    title: result.title,
    expertise_area: result.expertise_area,
    relevance_score: result.vita_relevance_score,
    evidence_level: result.evidence_level,
    source_type: result.source_type,
    vita_personalization: {
      life_stage_match: result.life_stage_match,
      symptom_match: result.symptom_match,
      context_applied: !!userContext
    },
    priority_rank: index + 1
  }));
}

function calculateLifeStageMatch(result: any, userContext: any): number {
  if (!userContext) return 0.5; // Neutral if no context
  
  const content = (result.content_chunk + ' ' + result.title).toLowerCase();
  let score = 0;
  
  if (userContext.age) {
    if (userContext.age < 25 && content.includes('pubertät')) score += 0.3;
    if (userContext.age >= 25 && userContext.age <= 40 && content.includes('fruchtbar')) score += 0.3;
    if (userContext.age > 40 && content.includes('menopause')) score += 0.3;
  }
  
  if (userContext.menopause_stage) {
    if (content.includes(userContext.menopause_stage)) score += 0.4;
    if (content.includes('wechseljahre')) score += 0.2;
  }
  
  if (userContext.cycle_phase && content.includes(userContext.cycle_phase)) {
    score += 0.3;
  }
  
  return Math.min(score, 1.0);
}

function calculateSymptomMatch(result: any, userContext: any): number {
  if (!userContext?.current_symptoms) return 0.5;
  
  const content = (result.content_chunk + ' ' + result.title).toLowerCase();
  const symptoms = userContext.current_symptoms;
  let matches = 0;
  
  symptoms.forEach((symptom: string) => {
    if (content.includes(symptom.toLowerCase())) {
      matches++;
    }
  });
  
  return symptoms.length > 0 ? matches / symptoms.length : 0.5;
}

function determineEvidenceLevel(result: any): 'high' | 'medium' | 'low' {
  const content = result.content_chunk.toLowerCase();
  const title = result.title.toLowerCase();
  
  if (content.includes('studie') || content.includes('research') || 
      content.includes('evidenz') || title.includes('systematic review')) {
    return 'high';
  }
  
  if (content.includes('leitlinien') || content.includes('empfehlung') ||
      content.includes('guidelines')) {
    return 'medium';
  }
  
  return 'low';
}

function determineSourceType(result: any): 'research' | 'clinical' | 'practical' {
  const content = result.content_chunk.toLowerCase();
  
  if (content.includes('studie') || content.includes('forschung')) return 'research';
  if (content.includes('behandlung') || content.includes('therapie')) return 'clinical';
  return 'practical';
}

function detectLifeStage(userContext: any): string {
  if (!userContext) return 'unknown';
  
  if (userContext.age) {
    if (userContext.age < 18) return 'adoleszenz';
    if (userContext.age < 25) return 'junge-erwachsene';
    if (userContext.age < 35) return 'frühe-fruchtbarkeit';
    if (userContext.age < 45) return 'späte-fruchtbarkeit';
    if (userContext.age < 55) return 'perimenopause';
    return 'postmenopause';
  }
  
  if (userContext.menopause_stage) {
    return userContext.menopause_stage;
  }
  
  return 'unknown';
}

function detectHealthTheme(query: string, userContext: any): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('zyklus') || userContext?.cycle_phase) return 'menstrual-health';
  if (lowerQuery.includes('menopause') || userContext?.menopause_stage) return 'menopause-transition';
  if (lowerQuery.includes('pcos')) return 'pcos-management';
  if (lowerQuery.includes('endometriose')) return 'endometriosis-support';
  if (lowerQuery.includes('schwanger')) return 'pregnancy-fitness';
  if (lowerQuery.includes('training') || lowerQuery.includes('kraft')) return 'female-training';
  if (lowerQuery.includes('hormone')) return 'hormone-balance';
  
  return 'general-health';
}

function calculateSpecializationMatch(results: any[]): number {
  if (results.length === 0) return 0;
  
  const vitaSpecificCount = results.filter(r => 
    r.coach_id === 'vita' || 
    Object.keys(VITA_EXPERTISE_WEIGHTS).some(area => 
      r.expertise_area.includes(area)
    )
  ).length;
  
  return vitaSpecificCount / results.length;
}

function calculateEvidenceQuality(results: VitaSearchResult[]): number {
  if (results.length === 0) return 0;
  
  const qualityScore = results.reduce((sum, result) => {
    switch (result.evidence_level) {
      case 'high': return sum + 1;
      case 'medium': return sum + 0.6;
      case 'low': return sum + 0.3;
      default: return sum;
    }
  }, 0);
  
  return qualityScore / results.length;
}

function calculatePersonalizationScore(userContext: any, results: VitaSearchResult[]): number {
  if (!userContext || results.length === 0) return 0;
  
  const avgLifeStageMatch = results.reduce((sum, r) => sum + r.life_stage_match, 0) / results.length;
  const avgSymptomMatch = results.reduce((sum, r) => sum + r.symptom_match, 0) / results.length;
  
  return (avgLifeStageMatch + avgSymptomMatch) / 2;
}

function generateVitaInsights(results: VitaSearchResult[], userContext: any): any {
  return {
    primary_health_focus: detectHealthTheme('', userContext),
    evidence_quality_distribution: {
      high: results.filter(r => r.evidence_level === 'high').length,
      medium: results.filter(r => r.evidence_level === 'medium').length,
      low: results.filter(r => r.evidence_level === 'low').length
    },
    personalization_applied: !!userContext,
    life_stage_specific_content: results.filter(r => r.life_stage_match > 0.5).length,
    vita_catchphrase: getVitaCatchphrase(userContext),
    recommended_follow_up: generateFollowUpRecommendations(results, userContext)
  };
}

function getVitaCatchphrase(userContext: any): string {
  const catchphrases = [
    "Von der ersten Periode bis zur goldenen Reife - jede Phase hat ihre Power! 🌺",
    "Wir trainieren im Takt des Lebens - und der schlägt in 28-Tage-Zyklen! ✨",
    "Dein weiblicher Rhythmus ist dein Vorteil, nicht dein Hindernis! 💫"
  ];
  
  const lifeStage = detectLifeStage(userContext);
  if (lifeStage.includes('menopause')) {
    return "Von der ersten Periode bis zur goldenen Reife - jetzt beginnt deine Königinnen-Phase! 🌺";
  }
  
  return catchphrases[Math.floor(Math.random() * catchphrases.length)];
}

function generateFollowUpRecommendations(results: VitaSearchResult[], userContext: any): string[] {
  const recommendations = [];
  
  if (userContext?.cycle_phase) {
    recommendations.push('Zyklustracking für optimale Trainingsplanung');
  }
  
  if (userContext?.menopause_stage) {
    recommendations.push('Hormonelle Gesundheitsanalyse');
  }
  
  const hasHighEvidenceContent = results.some(r => r.evidence_level === 'high');
  if (hasHighEvidenceContent) {
    recommendations.push('Vertiefende wissenschaftliche Literatur');
  }
  
  return recommendations;
}

function extractHealthFocusAreas(query: string, userContext: any): string[] {
  const areas = [];
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('training') || lowerQuery.includes('kraft')) areas.push('training');
  if (lowerQuery.includes('zyklus') || userContext?.cycle_phase) areas.push('cycle-health');
  if (lowerQuery.includes('hormone')) areas.push('hormones');
  if (lowerQuery.includes('ernährung')) areas.push('nutrition');
  if (lowerQuery.includes('menopause') || userContext?.menopause_stage) areas.push('menopause');
  
  return areas.length > 0 ? areas : ['general-health'];
}