// ARES Research - Perplexity-powered Scientific Research with SSE Streaming
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
  stream?: boolean; // Enable SSE streaming
  deepResearch?: boolean; // Research Plus mode - uses sonar-deep-research
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
    const { query, focus, language = 'de', maxResults = 5, stream = true, deepResearch = false } = body;

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Query too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select model based on deepResearch flag
    const model = deepResearch ? 'sonar-deep-research' : 'sonar-pro';
    const searchMode = deepResearch ? 'academic' : undefined;
    
    console.log(`[ARES-Research] ${traceId} Query: "${query}", Focus: ${focus || 'general'}, Stream: ${stream}, DeepResearch: ${deepResearch}, Model: ${model}`);

    // Build research-optimized prompt
    const focusContext = focus ? getFocusContext(focus) : '';
    const systemPrompt = buildResearchSystemPrompt(language, focusContext);
    
    // Translate query to English for better academic results
    const researchQuery = language === 'de' 
      ? `${query} (translate to English for search, respond in German)`
      : query;

    // ═══════════════════════════════════════════════════════════════════════════
    // SSE STREAMING MODE (preferred)
    // ═══════════════════════════════════════════════════════════════════════════
    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          const enqueue = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            // Status: Searching
            enqueue({ 
              type: 'research_status', 
              step: 'searching', 
              message: deepResearch ? 'Durchsuche akademische Datenbanken...' : 'Suche relevante Quellen...',
              complete: false
            });

            // Call Perplexity with streaming enabled
            console.log(`[ARES-Research] ${traceId} Calling Perplexity with model=${model}, stream=true`);
            const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: researchQuery }
                ],
                ...(searchMode && { search_mode: searchMode }),
                ...(deepResearch && { search_domain_filter: getAcademicDomains(focus) }),
                temperature: 0.1,
                stream: true, // Enable Perplexity streaming
              }),
            });

            if (!perplexityResponse.ok) {
              const errorText = await perplexityResponse.text();
              console.error(`[ARES-Research] ${traceId} Perplexity error:`, errorText);
              
              if (perplexityResponse.status === 429) {
                enqueue({ type: 'error', error: 'Rate limit erreicht. Bitte später erneut versuchen.' });
                controller.close();
                return;
              }
              
              throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
            }

            // Update status: Analyzing
            enqueue({ 
              type: 'research_status', 
              step: 'searching', 
              message: 'Durchsuche akademische Datenbanken...',
              complete: true
            });
            enqueue({ 
              type: 'research_status', 
              step: 'analyzing', 
              message: 'Analysiere Studienergebnisse...',
              complete: false
            });

            // Process Perplexity SSE stream
            if (!perplexityResponse.body) {
              throw new Error('No response body from Perplexity');
            }

            const reader = perplexityResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            let citations: string[] = [];
            let chunkCount = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                
                const jsonStr = trimmed.slice(6);
                if (jsonStr === '[DONE]') continue;

                try {
                  const chunk = JSON.parse(jsonStr);
                  const delta = chunk.choices?.[0]?.delta?.content || '';
                  
                  if (delta) {
                    fullContent += delta;
                    chunkCount++;
                    
                    // Send content chunk
                    enqueue({ type: 'content', delta });
                    
                    // Update status after first content (switch from analyzing to citing)
                    if (chunkCount === 1) {
                      enqueue({ 
                        type: 'research_status', 
                        step: 'analyzing', 
                        message: 'Analysiere Studienergebnisse...',
                        complete: true
                      });
                      enqueue({ 
                        type: 'research_status', 
                        step: 'citing', 
                        message: 'Extrahiere Quellen & Zitate...',
                        complete: false
                      });
                    }
                  }

                  // Capture citations if present
                  if (chunk.citations) {
                    citations = chunk.citations;
                  }
                } catch (parseError) {
                  // Ignore parse errors for incomplete chunks
                  console.warn(`[ARES-Research] Parse warning:`, parseError);
                }
              }
            }

            // Final status update
            enqueue({ 
              type: 'research_status', 
              step: 'citing', 
              message: `${citations.length} Quellen gefunden`,
              complete: true
            });

            // Append formatted citations as Markdown links
            if (citations.length > 0) {
              const formattedCitations = formatCitationsAsMarkdown(citations.slice(0, maxResults));
              enqueue({ type: 'content', delta: formattedCitations });
            }

            // Send done event with metadata
            enqueue({ 
              type: 'done', 
              traceId,
              citations: citations.slice(0, maxResults),
              model: model,
              searchMode: searchMode || 'default'
            });

            console.log(`[ARES-Research] ${traceId} Stream complete - ${citations.length} citations`);

            // Log usage (fire and forget)
            supabase.from('ai_usage_tracking').insert({
              user_id: user.id,
              service_type: 'perplexity_research',
              request_metadata: {
                query: query.substring(0, 200),
                focus,
                citations_count: citations.length,
                trace_id: traceId,
                streamed: true
              }
            }).then(() => {}).catch(() => {});

            controller.close();

          } catch (error) {
            console.error(`[ARES-Research] ${traceId} Stream error:`, error);
            enqueue({ 
              type: 'error', 
              error: error instanceof Error ? error.message : 'Research failed',
              traceId 
            });
            controller.close();
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BLOCKING MODE (legacy fallback)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`[ARES-Research] ${traceId} Using blocking mode with model=${model}`);
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: researchQuery }
        ],
        ...(searchMode && { search_mode: searchMode }),
        ...(deepResearch && { search_domain_filter: getAcademicDomains(focus) }),
        temperature: 0.1,
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

    // Log usage
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

    return new Response(
      JSON.stringify({
        answer,
        citations: citations.slice(0, maxResults),
        model: model,
        searchMode: searchMode || 'default'
      }),
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

// Format citations as clickable Markdown links
function formatCitationsAsMarkdown(citations: string[]): string {
  if (!citations.length) return '';
  
  let markdown = '\n\n---\n\n**📚 Quellen:**\n\n';
  citations.forEach((url, i) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      markdown += `${i + 1}. [${domain}](${url})\n`;
    } catch {
      markdown += `${i + 1}. ${url}\n`;
    }
  });
  
  return markdown;
}

function buildResearchSystemPrompt(language: string, focusContext: string): string {
  if (language === 'de') {
    return `Du bist ein wissenschaftlicher Recherche-Assistent für ARES, einen Elite-Fitness-Coach.

AUFGABE:
- Suche nach aktuellen, peer-reviewed Studien und wissenschaftlicher Evidenz
- Priorisiere Meta-Analysen, RCTs und systematische Reviews
- Zitiere konkrete Studien mit Autoren und Jahr
- Antworte auf Deutsch, auch wenn du auf Englisch suchst

FORMATIERUNG (WICHTIG):
- Verwende **fett** für wichtige Begriffe und Zahlen
- Gliedere mit Überschriften (## Ergebnis, ## Dosierung, etc.)
- Nutze Bullet-Points für Aufzählungen
- Inline-Zitate mit [1], [2] etc.

STRUKTUR:
1. Kurze Zusammenfassung der Evidenzlage (2-3 Sätze)
2. Wichtigste Studienergebnisse mit Quellenangabe
3. Praktische Implikationen für Training/Ernährung
4. Limitationen (falls relevant)

${focusContext}

WICHTIG: Nur evidenzbasierte Aussagen. Bei unsicherer Datenlage dies klar kommunizieren.`;
  }
  
  return `You are a scientific research assistant for ARES, an elite fitness coach.

TASK:
- Search for current, peer-reviewed studies and scientific evidence
- Prioritize meta-analyses, RCTs, and systematic reviews
- Cite specific studies with authors and year

FORMATTING (IMPORTANT):
- Use **bold** for key terms and numbers
- Structure with headings (## Results, ## Dosage, etc.)
- Use bullet points for lists
- Inline citations with [1], [2] etc.

FORMAT:
1. Brief summary of evidence (2-3 sentences)
2. Key study findings with citations
3. Practical implications for training/nutrition
4. Limitations (if relevant)

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
