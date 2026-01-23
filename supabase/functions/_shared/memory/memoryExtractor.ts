/**
 * Memory Extractor - Extracts insights from user messages using LLM
 */

import { ExtractedInsight, InsightCategory, INSIGHT_CATEGORIES } from './types.ts';

const EXTRACTION_SYSTEM_PROMPT = `Du bist ein Insight-Extractor für einen KI-Fitness-Coach.

Deine Aufgabe: Analysiere die User-Nachricht und extrahiere WICHTIGE Informationen über den User.

KATEGORIEN:
- koerper: Gewicht, Groesse, Koerperbau, Verletzungen
- gesundheit: Krankheiten, Medikamente, Blutwerte, Allergien
- ernaehrung: Essgewohnheiten, Diaeten, Unvertraeglichkeiten, Kaffee/Alkohol-Konsum
- training: Trainingsgewohnheiten, Sportarten, Leistungsniveau
- schlaf: Schlafgewohnheiten, Schlafqualitaet, Schlafprobleme
- stress: Stresslevel, Stressoren
- emotionen: Motivation, Frustrationen, mentaler Zustand
- gewohnheiten: Tagesablauf, Routinen
- ziele: Konkrete Ziele, Motivationen
- privat: Beruf, Familie, Lebensumstaende
- substanzen: Supplements, Peptide, Medikamente die der User nimmt (Retatrutide, Semaglutide, Tirzepatide, etc.)
- muster: Wiederholte Verhaltensweisen

REGELN:
1. Extrahiere SOWOHL konkrete Fakten ("trinkt 5 Kaffee") ALS AUCH relevante Aussagen ("trinkt viel Kaffee")
2. Bei Mengenangaben: Schaetze wenn noetig ("viel Kaffee" -> "hoher Kaffeekonsum")
3. Peptide/Medikamente/Supplements IMMER extrahieren wenn erwaehnt - das ist KRITISCH!
4. Bewerte Confidence: 0.9+ bei klaren Aussagen, 0.7-0.9 bei Implikationen
5. Bewerte Importance: critical (Gesundheit/Medikamente/Peptide), high (wichtig fuer Coaching), medium (nuetzlich)
6. KEINE Duplikate zu existierenden Insights
7. Extrahiere IMPLIZITE FAKTEN aus Fragen:
   - "Sind 4 Tassen Kaffee schlimm?" -> User trinkt 4 Tassen Kaffee/Tag
   - "Ist 1800kcal zu wenig?" -> User isst ca. 1800kcal
   - Bei solchen Fragen: confidence 0.85 (implizit aber klar)

Antworte IMMER mit einem JSON-Objekt in diesem Format:
{
  "insights": [
    {
      "category": "gesundheit",
      "subcategory": "peptide",
      "insight": "Nimmt Retatrutide",
      "rawQuote": "ich nehme Retatrutide",
      "confidence": 0.95,
      "importance": "critical"
    }
  ]
}

Wenn nichts Neues, gib zurueck: {"insights": []}`;

export async function extractInsightsFromMessage(
  message: string,
  userId: string,
  source: 'chat' | 'journal',
  existingInsights: string[]
): Promise<ExtractedInsight[]> {
  // Skip very short messages - reduced threshold to catch short but relevant messages
  if (message.length < 10) {
    console.log('[MemoryExtractor] Skipping short message:', message.length, 'chars');
    return [];
  }
  
  console.log('[MemoryExtractor] Processing message for insights, length:', message.length, 'chars');

  const existingContext = existingInsights.length > 0
    ? `\n\nBEREITS BEKANNTE INSIGHTS (KEINE DUPLIKATE!):\n${existingInsights.join('\n')}`
    : '';

  const userPrompt = `USER-NACHRICHT:\n"${message}"${existingContext}\n\nExtrahiere neue Insights (JSON-Array):`;

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('[MemoryExtractor] No OpenAI API key');
      return [];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.error('[MemoryExtractor] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return [];
    }

    // Parse JSON response - handle various OpenAI response structures
    console.log('[MemoryExtractor] Raw LLM response:', content.substring(0, 500));
    
    const parsed = JSON.parse(content);
    let insights: any[] = [];
    
    if (Array.isArray(parsed)) {
      insights = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Try common response wrapper keys
      insights = parsed.insights 
        || parsed.extracted_insights 
        || parsed.data 
        || parsed.results 
        || parsed.extracted
        || [];
      
      // If still empty but object has array-like values, try first array found
      if (insights.length === 0) {
        const values = Object.values(parsed);
        for (const val of values) {
          if (Array.isArray(val) && val.length > 0) {
            insights = val;
            break;
          }
        }
      }
    }
    
    console.log('[MemoryExtractor] Parsed', insights.length, 'raw insights from response');

    // Validate and filter insights
    const validInsights = insights.filter((insight: any) => 
      isValidInsight(insight)
    ).map((insight: any) => ({
      category: insight.category as InsightCategory,
      subcategory: insight.subcategory,
      insight: insight.insight,
      rawQuote: insight.rawQuote,
      confidence: Math.min(1, Math.max(0, insight.confidence || 0.8)),
      importance: validateImportance(insight.importance)
    }));
    
    console.log('[MemoryExtractor] Validated', validInsights.length, 'insights after filtering');
    return validInsights;

  } catch (error) {
    console.error('[MemoryExtractor] Error:', error);
    return [];
  }
}

function isValidInsight(insight: any): boolean {
  if (!insight || typeof insight !== 'object') return false;
  if (!insight.category || !INSIGHT_CATEGORIES.includes(insight.category)) return false;
  if (!insight.insight || typeof insight.insight !== 'string') return false;
  if (insight.insight.length < 10) return false;
  return true;
}

function validateImportance(imp: any): 'critical' | 'high' | 'medium' | 'low' {
  const valid = ['critical', 'high', 'medium', 'low'];
  return valid.includes(imp) ? imp : 'medium';
}
