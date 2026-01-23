/**
 * Memory Extractor - Extracts insights from user messages using LLM
 */

import { ExtractedInsight, InsightCategory, INSIGHT_CATEGORIES } from './types.ts';

const EXTRACTION_SYSTEM_PROMPT = `Du bist ein Insight-Extractor für einen KI-Fitness-Coach.

Deine Aufgabe: Analysiere die User-Nachricht und extrahiere KONKRETE, FAKTISCHE Informationen über den User.

KATEGORIEN:
- körper: Gewicht, Größe, Körperbau, Verletzungen
- gesundheit: Krankheiten, Medikamente, Blutwerte, Allergien
- ernährung: Essgewohnheiten, Diäten, Unverträglichkeiten, Kaffee/Alkohol
- training: Trainingsgewohnheiten, Sportarten, Leistungsniveau
- schlaf: Schlafgewohnheiten, Schlafqualität, Schlafprobleme
- stress: Stresslevel, Stressoren, Coping
- emotionen: Emotionale Zustände, Motivation, Frustrationen
- gewohnheiten: Tagesablauf, Routinen, Laster
- wissen: Was der User über Fitness/Ernährung weiß oder nicht weiß
- ziele: Konkrete Ziele, Deadlines, Motivationen
- privat: Beruf, Familie, Lebensumstände
- muster: Wiederholte Verhaltensweisen

REGELN:
1. Extrahiere NUR KONKRETE FAKTEN, keine Vermutungen
2. Jeder Insight muss SPEZIFISCH sein ("trinkt 5 Tassen Kaffee" nicht "trinkt Kaffee")
3. Zitiere die relevante Stelle aus der Nachricht
4. Bewerte Confidence: 0.9+ bei klaren Aussagen, 0.7-0.9 bei Implikationen
5. Bewerte Importance: critical (Gesundheit!), high (wichtig für Coaching), medium (nützlich), low (nice-to-know)
6. KEINE Duplikate zu existierenden Insights
7. Wenn nichts Neues, gib leeres Array zurück

Antworte NUR mit einem JSON-Array:
[
  {
    "category": "ernährung",
    "subcategory": "koffein",
    "insight": "Trinkt 5-6 Tassen Kaffee pro Tag",
    "rawQuote": "ich trink so 5-6 Kaffee am Tag",
    "confidence": 0.95,
    "importance": "high"
  }
]`;

export async function extractInsightsFromMessage(
  message: string,
  userId: string,
  source: 'chat' | 'journal',
  existingInsights: string[]
): Promise<ExtractedInsight[]> {
  // Skip very short messages (lowered threshold for German fitness context)
  if (message.length < 15) {
    console.log('[MemoryExtractor] Skipping short message:', message.length, 'chars');
    return [];
  }
  
  console.log('[MemoryExtractor] Processing message for insights, length:', message.length);

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

    // Parse JSON response
    const parsed = JSON.parse(content);
    const insights = Array.isArray(parsed) ? parsed : (parsed.insights || []);

    // Validate and filter insights
    return insights.filter((insight: any) => 
      isValidInsight(insight)
    ).map((insight: any) => ({
      category: insight.category as InsightCategory,
      subcategory: insight.subcategory,
      insight: insight.insight,
      rawQuote: insight.rawQuote,
      confidence: Math.min(1, Math.max(0, insight.confidence || 0.8)),
      importance: validateImportance(insight.importance)
    }));

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
