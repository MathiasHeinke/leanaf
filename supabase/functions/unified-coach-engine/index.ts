import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// MEMORY MANAGER - Inline Implementation for Edge Function
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface MemoryPacket {
  id?: number;
  convo_id: string;
  from_msg: number;
  to_msg: number;
  message_count: number;
  packet_summary: string;
  created_at: string;
}

interface ConversationMemory {
  convo_id: string;
  user_id: string;
  coach_id: string;
  last_messages: ChatMessage[];
  message_count: number;
  rolling_summary: string | null;
  created_at: string;
  updated_at: string;
}

class EdgeMemoryManager {
  private readonly MESSAGE_LIMIT = 10;

  async getConversationContext(
    userId: string, 
    coachId: string, 
    supabaseClient: any
  ): Promise<{
    recentMessages: ChatMessage[];
    historicalSummary: string | null;
    messageCount: number;
  }> {
    try {
      const { data: memory } = await supabaseClient
        .from('coach_chat_memory')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .maybeSingle();

      if (!memory) {
        return {
          recentMessages: [],
          historicalSummary: null,
          messageCount: 0
        };
      }

      // Get recent packet summaries for additional context
      const { data: recentPackets } = await supabaseClient
        .from('coach_chat_packets')
        .select('packet_summary, message_count')
        .eq('convo_id', memory.convo_id)
        .order('created_at', { ascending: false })
        .limit(3);

      const historicalSummary = recentPackets?.length 
        ? recentPackets.map((p: any) => p.packet_summary).join('\n\n') 
        : memory.rolling_summary;

      return {
        recentMessages: memory.last_messages || [],
        historicalSummary,
        messageCount: memory.message_count || 0
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {
        recentMessages: [],
        historicalSummary: null,
        messageCount: 0
      };
    }
  }

  async addMessage(
    userId: string,
    coachId: string,
    message: ChatMessage,
    supabaseClient: any,
    openAIApiKey?: string
  ): Promise<void> {
    try {
      // Load or create conversation memory
      let { data: memory } = await supabaseClient
        .from('coach_chat_memory')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .maybeSingle();

      if (!memory) {
        memory = await this.createNewConversation(userId, coachId, supabaseClient);
      }

      // Add new message
      const updatedMessages = [...(memory.last_messages || []), message];
      const newMessageCount = (memory.message_count || 0) + 1;

      // Check if compression is needed
      if (updatedMessages.length > this.MESSAGE_LIMIT && openAIApiKey) {
        await this.compressMessages(memory, updatedMessages, newMessageCount, supabaseClient, openAIApiKey);
      } else {
        // Regular update
        await supabaseClient
          .from('coach_chat_memory')
          .upsert({
            convo_id: memory.convo_id,
            user_id: userId,
            coach_id: coachId,
            last_messages: updatedMessages,
            message_count: newMessageCount,
            rolling_summary: memory.rolling_summary,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'convo_id'
          });
      }
    } catch (error) {
      console.error('Error adding message to memory:', error);
    }
  }

  private async compressMessages(
    memory: any,
    messages: ChatMessage[],
    messageCount: number,
    supabaseClient: any,
    openAIApiKey: string
  ): Promise<void> {
    try {
      // Take first 8 messages for compression, keep last 2
      const messagesToCompress = messages.slice(0, -2);
      const recentMessages = messages.slice(-2);

      // Generate summary using OpenAI
      const summary = await this.generateSummary(messagesToCompress, openAIApiKey);

      // Create packet entry
      const packet = {
        convo_id: memory.convo_id,
        from_msg: Math.max(1, messageCount - messagesToCompress.length),
        to_msg: messageCount - 2,
        message_count: messagesToCompress.length,
        packet_summary: summary,
        created_at: new Date().toISOString()
      };

      // Save packet to database
      await supabaseClient.from('coach_chat_packets').insert(packet);

      // Update memory with compressed data
      await supabaseClient
        .from('coach_chat_memory')
        .upsert({
          convo_id: memory.convo_id,
          user_id: memory.user_id,
          coach_id: memory.coach_id,
          last_messages: recentMessages,
          message_count: messageCount,
          rolling_summary: summary,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'convo_id'
        });

      console.log(`✅ Compressed ${messagesToCompress.length} messages into summary`);
    } catch (error) {
      console.error('Error in compression:', error);
      // Fallback: simple truncation
      await supabaseClient
        .from('coach_chat_memory')
        .upsert({
          convo_id: memory.convo_id,
          user_id: memory.user_id,
          coach_id: memory.coach_id,
          last_messages: messages.slice(-this.MESSAGE_LIMIT),
          message_count: messageCount,
          rolling_summary: memory.rolling_summary,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'convo_id'
        });
    }
  }

  private async generateSummary(messages: ChatMessage[], apiKey: string): Promise<string> {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Erstelle eine präzise Zusammenfassung des Gesprächs zwischen User und Coach. Fokussiere auf: Hauptthemen, Ziele, Fortschritte, wichtige Erkenntnisse. Maximal 200 Wörter, auf Deutsch.'
          },
          {
            role: 'user',
            content: `Fasse diese Unterhaltung zusammen:\n\n${conversation}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Gespräch zusammengefasst.';
  }

  private async createNewConversation(userId: string, coachId: string, supabaseClient: any): Promise<any> {
    const convoId = `${userId}-${coachId}-${Date.now()}`;
    
    const memory = {
      convo_id: convoId,
      user_id: userId,
      coach_id: coachId,
      last_messages: [],
      message_count: 0,
      rolling_summary: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data } = await supabaseClient
      .from('coach_chat_memory')
      .insert(memory)
      .select()
      .single();
      
    return data;
  }
}

const edgeMemoryManager = new EdgeMemoryManager();

// All handlers are now inlined below to avoid import issues

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// ----------------------------------------------------------------------------
// TEMP: Governor ausschalten, wenn ENV = 'true'   (z.B. in Dashboard setzen)
// ----------------------------------------------------------------------------
const DISABLE_LIMITS = Deno.env.get('DISABLE_COACH_LIMITS') === 'true';

const PROMPT_VERSION = '2025-08-01-XL';

// ============================================================================
// TOOL DETECTION & HANDLERS
// ============================================================================

// Tool Detection Logic
type ToolName = 'trainingsplan' | 'createPlanDraft' | 'savePlanDraft' | 'supplement' | 'gewicht' | 'uebung' | 'foto' | 'quickworkout' | 'diary' | 'mealCapture' | 'goalCheckin' | 'ragKnowledge';

interface ToolContext {
  tool: ToolName | 'chat';
  description: string;
  confidence: number;
}

function detectToolIntent(text: string, userContext?: any): ToolContext {
  const toolMap: Record<ToolName, { regex: RegExp; description: string; semanticKeywords: string[]; contextRequirements?: string[] }> = {
    trainingsplan: {
      regex: /(trainingsplan|workout.*plan|push.*pull|split|4.*tag|3.*tag|ganzkörper|upperbody|lowerbody|plan.*erstell)/i,
      description: 'Trainingsplan erstellen/bearbeiten',
      semanticKeywords: ['plan', 'training', 'workout', 'split', 'push', 'pull', 'beine', 'oberkörper', 'ganzkörper', 'hypertrophie', 'kraft'],
      contextRequirements: ['hasTrainingHistory']
    },
    createPlanDraft: {
      regex: /(trainingsplan.*erstell|workout.*plan.*bau|push.*pull.*plan|split.*erstell|plan.*für.*training)/i,
      description: 'Trainingsplan-Entwurf erstellen',
      semanticKeywords: ['erstellen', 'planen', 'anfangen', 'beginnen', 'neuer plan'],
      contextRequirements: ['hasTrainingHistory']
    },
    savePlanDraft: {
      regex: /(plan.*speicher|draft.*save|entwurf.*aktiv)/i,
      description: 'Trainingsplan-Entwurf speichern',
      semanticKeywords: ['speichern', 'aktivieren', 'übernehmen', 'starten']
    },
    supplement: {
      regex: /(supplement|kreatin|creatine|vitamin|zink|omega|protein.*pulver|magnesium|d3|b12|eisen)/i,
      description: 'Supplement-Empfehlung',
      semanticKeywords: ['supplement', 'vitamin', 'mineral', 'kreatin', 'protein', 'omega', 'zink', 'magnesium', 'nahrungsergänzung']
    },
    gewicht: {
      regex: /\b(gewicht|wiege?n?|kg|waage|gramm|pfund|weight|scale)\b/i,
      description: 'Gewicht erfassen',
      semanticKeywords: ['gewicht', 'wiegen', 'waage', 'körpergewicht', 'tracking']
    },
    uebung: {
      regex: /(übung|exercise|versuch.*mal|neue.*übung|bankdrücken|kniebeuge|kreuzheben|klimmzug)/i,
      description: 'Übung hinzufügen/analysieren',
      semanticKeywords: ['übung', 'bankdrücken', 'kniebeuge', 'kreuzheben', 'klimmzug', 'squats', 'deadlift', 'benchpress']
    },
    foto: {
      regex: /(foto|picture|progress.*pic|bild|vorher.*nachher|transformation|körper.*foto)/i,
      description: 'Fortschritts-Foto analysieren',
      semanticKeywords: ['foto', 'bild', 'progress', 'fortschritt', 'transformation', 'vorher', 'nachher']
    },
    quickworkout: {
      regex: /(schritte|walk|joggen|lauf|quickworkout|spazier|cardio|schnell.*training|10.*min)/i,
      description: 'Quick-Workout erfassen',
      semanticKeywords: ['schritte', 'laufen', 'joggen', 'cardio', 'spazieren', 'quick', 'schnell']
    },
    diary: {
      regex: /(tagebuch|reflexion|dankbar|gefühl|heute\s+war|bin\s+dankbar|journal|stimmung|mood)/i,
      description: 'Tagebuch-Eintrag erstellen',
      semanticKeywords: ['tagebuch', 'reflexion', 'gefühl', 'stimmung', 'dankbar', 'mood', 'journal']
    },
    mealCapture: {
      regex: /(\d+)\s*(g|kg|gramm|ml|liter)\s+\w+|(gegessen|essen|mahlzeit|kalorien|nährwerte|haferflocken|reis|hähnchen)/i,
      description: 'Mahlzeit erfassen',
      semanticKeywords: ['essen', 'mahlzeit', 'kalorien', 'protein', 'kohlenhydrate', 'nährwerte', 'gramm', 'gegessen']
    },
    goalCheckin: {
      regex: /(fortschritt|auf\s+kurs|ziel|progress|check|stand|bin\s+ich|wie\s+stehe)/i,
      description: 'Fortschritt überprüfen',
      semanticKeywords: ['fortschritt', 'ziel', 'progress', 'entwicklung', 'erfolg', 'ergebnis']
    },
    ragKnowledge: {
      regex: /(warum|wie\s+funktioniert|studien|forschung|wissenschaft|belege|erklär|grund|hintergrund|theorie|prinzip)/i,
      description: 'Wissenschaftlichen Hintergrund aus Knowledge Base suchen',
      semanticKeywords: ['warum', 'wie', 'wissenschaft', 'studie', 'forschung', 'erklärung', 'hintergrund', 'theorie', 'prinzip', 'belege']
    }
  };

  let bestMatch: { tool: ToolName | 'chat'; confidence: number; description: string; semanticScore: number } = {
    tool: 'chat',
    confidence: 0,
    description: 'Freies Gespräch',
    semanticScore: 0
  };

  // Enhanced semantic analysis
  const textLower = text.toLowerCase();
  const words = textLower.split(/\s+/);

  for (const [toolName, config] of Object.entries(toolMap)) {
    // 1. Regex-based matching (existing)
    const regexMatch = config.regex.test(text);
    let regexScore = regexMatch ? 0.7 : 0;
    
    // 2. NEW: Semantic keyword matching
    let semanticScore = 0;
    const matchedKeywords = config.semanticKeywords.filter(keyword => 
      textLower.includes(keyword.toLowerCase())
    );
    semanticScore = Math.min(matchedKeywords.length * 0.2, 0.6);
    
    // 3. NEW: Context-aware boosting
    let contextBoost = 0;
    if (config.contextRequirements && userContext) {
      if (config.contextRequirements.includes('hasTrainingHistory') && userContext.hasTrainingData) {
        contextBoost = 0.3;
      }
    }
    
    // 4. NEW: Word proximity analysis (advanced semantic)
    let proximityScore = 0;
    if (semanticScore > 0) {
      const toolWords = config.semanticKeywords.map(k => k.toLowerCase());
      let proximityMatches = 0;
      for (let i = 0; i < words.length - 1; i++) {
        if (toolWords.includes(words[i]) && toolWords.some(tw => words.slice(i, i + 3).includes(tw))) {
          proximityMatches++;
        }
      }
      proximityScore = Math.min(proximityMatches * 0.1, 0.2);
    }
    
    const totalConfidence = Math.min(regexScore + semanticScore + contextBoost + proximityScore, 1.0);
    const totalSemanticScore = semanticScore + proximityScore;
    
    console.log(`🔍 Enhanced analysis ${toolName}:`, {
      regex: regexScore,
      semantic: semanticScore,
      context: contextBoost,
      proximity: proximityScore,
      total: totalConfidence,
      keywords: matchedKeywords
    });
    
    if (totalConfidence > bestMatch.confidence) {
      bestMatch = {
        tool: toolName as ToolName,
        confidence: totalConfidence,
        description: config.description,
        semanticScore: totalSemanticScore
      };
    }
  }

  return {
    tool: bestMatch.tool,
    description: bestMatch.description,
    confidence: bestMatch.confidence
  };
}

// ============================================================================
// TOOL HANDLERS - Inline implementations
// ============================================================================

async function handleTrainingsplan(conv: any[], userId: string, supabase: any, coachPersonality?: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // PHASE 2: Check for RAG context from previous queries
  let ragEnhancedDescription = '';
  if (global.lastRAGResults && global.lastRAGResults.timestamp) {
    const ragAge = Date.now() - new Date(global.lastRAGResults.timestamp).getTime();
    // Use RAG results if they're less than 5 minutes old
    if (ragAge < 5 * 60 * 1000) {
      const relevantKnowledge = global.lastRAGResults.results
        .filter((result: any) => result.expertise_area === 'training' || result.expertise_area === 'exercise')
        .slice(0, 2); // Top 2 most relevant
      
      if (relevantKnowledge.length > 0) {
        ragEnhancedDescription = `\n\n🧠 **Wissenschaftliche Grundlage:**\n` +
          relevantKnowledge.map((k: any) => `• ${k.title}: ${k.content.substring(0, 150)}...`).join('\n');
        console.log(`🔗 Enhanced training plan with RAG knowledge: ${relevantKnowledge.length} sources`);
      }
    }
  }
  
  // Map frontend coach IDs to coach names for persona lookup
  const coachMapping: Record<string, string> = {
    'markus': 'Markus Rühl',
    'sascha': 'Sascha', 
    'lucy': 'Lucy',
    'kai': 'Kai',
    'dr_vita': 'Dr. Vita Femina'
  };
  
  const coachName = (coachPersonality && coachMapping[coachPersonality]) 
    ? coachMapping[coachPersonality] 
    : 'Sascha'; // Default fallback
    
  console.log(`🎯 Training plan requested by coach: ${coachName} (${coachPersonality || 'default'})`);
  console.log(`🧠 RAG-enhanced plan: ${ragEnhancedDescription ? 'YES' : 'NO'}`);
  
  try {
    // PHASE 3: Smart prefilling from RAG tool suggestions
    let smartPrefillData = {};
    if (global.lastRAGResults && global.lastRAGResults.toolPrefillSuggestions) {
      const trainingPrefill = global.lastRAGResults.toolPrefillSuggestions.find(
        (suggestion: any) => suggestion.tool === 'trainingsplan'
      );
      
      if (trainingPrefill) {
        smartPrefillData = trainingPrefill.prefillData;
        console.log(`🔗 Using RAG prefill data for training plan:`, smartPrefillData);
      }
    }
    
    // Extrahiere Trainingsplan-Informationen aus der Nachricht
    const planName = extractPlanName(lastUserMsg);
    const goals = extractGoals(lastUserMsg);
    
    // Add coach information to plan description
    const coachInfo = coachName !== 'Sascha' ? `Coach: ${coachName}` : '';
    
    // PHASE 3: Enhanced description with smart prefilling
    let enhancedDescription = '';
    if (smartPrefillData.scientificBasis) {
      enhancedDescription += `\n🧬 Wissenschaftliche Basis: ${smartPrefillData.scientificBasis}`;
    }
    if (smartPrefillData.methodology) {
      enhancedDescription += `\n📋 Methodik: ${smartPrefillData.methodology}`;
    }
    if (smartPrefillData.evidenceLevel) {
      enhancedDescription += `\n✅ Evidenz-Level: ${smartPrefillData.evidenceLevel}`;
    }
    
    // Erstelle Trainingsplan-Entry in der DB with RAG enhancement
    const { data: planData, error } = await supabase.from('workout_plans').insert({
      created_by: userId,               // <- Spaltenname in DB
      name: planName,
      category: goals[0] ?? 'Allgemein',  // Pflichtfeld „category"
      description: [
        `Automatisch erstellt am ${new Date().toLocaleDateString('de-DE')}`,
        coachInfo,
        goals.length ? `Ziel(e): ${goals.join(', ')}` : '',
        ragEnhancedDescription,  // PHASE 2: Include RAG-enhanced scientific foundation
        enhancedDescription      // PHASE 3: Smart prefilling from RAG suggestions
      ].filter(Boolean).join('\n').trim(),
      exercises: [],                   // leeres JSON = Draft
      estimated_duration_minutes: null,
      is_public: false
    }).select().single();
    
    if (error) {
      console.error('[trainingsplan]', error);
      return {
        role: 'assistant',
        content: 'Uups – der Plan wurde nicht gespeichert. Ich prüfe gerade die Datenbank-Felder und versuche es gleich nochmal!',
      };
    }
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan',
      payload: { 
        id: planData.id,
        name: planData.name,
        description: planData.description,
        goals,
        html: `<div class="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 class="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">✅ Trainingsplan erstellt</h3>
          <p class="text-blue-700 dark:text-blue-300 mb-2"><strong>${planData.name}</strong></p>
          <p class="text-sm text-blue-600 dark:text-blue-400">${planData.description}</p>
          <div class="mt-3 text-xs text-blue-500 dark:text-blue-500">
            Ziele: ${Array.isArray(goals) ? goals.join(', ') : 'Allgemeine Fitness'}
          </div>
        </div>`,
        ts: Date.now()
      },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in trainingsplan handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Erstellen des Trainingsplans.',
    };
  }
}

// ============================================================================
// NEW INLINE HANDLERS
// ============================================================================

// Diary tool handler for journal entries with mood analysis
async function handleDiary(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Simple sentiment analysis based on keywords
  function analyzeSentiment(text: string): { mood_score: number; sentiment_tag: string } {
    const positiveWords = ['gut', 'super', 'toll', 'dankbar', 'glücklich', 'freude', 'erfolg', 'stolz', 'wunderbar', 'großartig'];
    const negativeWords = ['schlecht', 'müde', 'stress', 'schwer', 'traurig', 'frustriert', 'ärger', 'sorge', 'problem', 'schwierig'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    let mood_score = 0;
    let sentiment_tag = 'neutral';
    
    if (positiveCount > negativeCount) {
      mood_score = Math.min(5, positiveCount);
      sentiment_tag = 'positive';
    } else if (negativeCount > positiveCount) {
      mood_score = Math.max(-5, -negativeCount);
      sentiment_tag = 'negative';
    }
    
    return { mood_score, sentiment_tag };
  }
  
  // Extract gratitude items
  function extractGratitude(text: string): string[] {
    const gratitudePatterns = /(?:dankbar für|bin dankbar|grateful for|thankful for)\s+([^.!?]+)/gi;
    const matches = [...text.matchAll(gratitudePatterns)];
    return matches.map(match => match[1].trim()).slice(0, 3);
  }
  
  const { mood_score, sentiment_tag } = analyzeSentiment(lastUserMsg);
  const gratitude_items = extractGratitude(lastUserMsg);
  const excerpt = lastUserMsg.length > 120 ? lastUserMsg.slice(0, 120) + '...' : lastUserMsg;
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'diary',
    payload: {
      raw_text: lastUserMsg,
      mood_score,
      sentiment_tag,
      gratitude_items,
      excerpt,
      date: new Date().toISOString().split('T')[0],
      ts: Date.now(),
      actions: [{
        type: 'save_diary',
        label: 'Tagebuch speichern',
        data: {
          raw_text: lastUserMsg,
          mood_score,
          sentiment_tag,
          gratitude_items,
          date: new Date().toISOString().split('T')[0]
        }
      }]
    },
    meta: { clearTool: true }
  };
}

// Enhanced meal capture tool with OpenFoodFacts integration
async function handleMealCapture(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Simple food parsing - in real implementation would use OpenFoodFacts API
  function parseMealText(text: string): {
    food_name: string;
    amount?: number;
    unit?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  } {
    // Extract amount and unit
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|stück|portion|portionen)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    const unit = amountMatch?.[2]?.toLowerCase() || 'g';
    
    // Simple food database lookup (mock)
    const foodDb: Record<string, any> = {
      'haferflocken': { calories: 380, protein: 13, carbs: 60, fats: 7 },
      'banane': { calories: 95, protein: 1, carbs: 23, fats: 0.3 },
      'apfel': { calories: 52, protein: 0.3, carbs: 14, fats: 0.2 },
      'reis': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
      'hähnchen': { calories: 165, protein: 31, carbs: 0, fats: 3.6 }
    };
    
    // Find matching food
    const textLower = text.toLowerCase();
    const matchedFood = Object.keys(foodDb).find(food => textLower.includes(food));
    
    if (matchedFood && amount) {
      const baseNutrition = foodDb[matchedFood];
      const factor = amount / 100; // assuming per 100g values
      
      return {
        food_name: matchedFood,
        amount,
        unit,
        calories: Math.round(baseNutrition.calories * factor),
        protein: Math.round(baseNutrition.protein * factor * 10) / 10,
        carbs: Math.round(baseNutrition.carbs * factor * 10) / 10,
        fats: Math.round(baseNutrition.fats * factor * 10) / 10
      };
    }
    
    return {
      food_name: text,
      amount,
      unit
    };
  }
  
  const mealData = parseMealText(lastUserMsg);
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'meal',
    payload: {
      ...mealData,
      meal_type: 'snack', // Default, user can adjust
      ts: Date.now(),
      actions: [{
        type: 'save_meal',
        label: 'Mahlzeit speichern',
        data: {
          ...mealData,
          date: new Date().toISOString().split('T')[0]
        }
      }]
    },
    meta: { clearTool: true }
  };
}

// Goal check-in tool for progress analysis
async function handleGoalCheckin(conv: any[], userId: string) {
  // Mock KPI analysis - in real implementation would query actual data
  const mockProgress = {
    calories: { current: 1850, target: 2000, percentage: 92.5 },
    protein: { current: 145, target: 150, percentage: 96.7 },
    workouts: { current: 4, target: 5, percentage: 80 },
    sleep: { current: 7.2, target: 8, percentage: 90 },
    weight_trend: 'stable' // 'increasing', 'decreasing', 'stable'
  };
  
  // Calculate overall score
  const scores = [
    mockProgress.calories.percentage,
    mockProgress.protein.percentage,
    mockProgress.workouts.percentage,
    mockProgress.sleep.percentage
  ];
  const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Determine status color
  let status: 'excellent' | 'good' | 'needs_attention' = 'needs_attention';
  if (overallScore >= 90) status = 'excellent';
  else if (overallScore >= 75) status = 'good';
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'goalCheckin',
    payload: {
      overall_score: Math.round(overallScore),
      status,
      progress: mockProgress,
      message: status === 'excellent' 
        ? 'Du bist voll auf Kurs! 🎯' 
        : status === 'good'
        ? 'Gute Fortschritte, kleine Anpassungen möglich 👍'
        : 'Hier gibt es Verbesserungspotential 💪',
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

// Create workout plan draft handler
async function handleCreatePlanDraft(conv: any[], userId: string, supabaseClient: any, args: any) {
  const { plan_name, goal, days_per_wk, notes } = args;
  
  function generateWeeklyStructure(daysPerWeek: number, goal: string) {
    const structures: any = {
      2: [
        { day: 'Tag 1', focus: 'Ganzkörper A', exercises: ['Kniebeugen', 'Bankdrücken', 'Rudern'] },
        { day: 'Tag 2', focus: 'Ganzkörper B', exercises: ['Kreuzheben', 'Schulterdrücken', 'Klimmzüge'] }
      ],
      3: [
        { day: 'Tag 1', focus: 'Push (Brust, Schultern, Trizeps)', exercises: ['Bankdrücken', 'Schulterdrücken', 'Dips'] },
        { day: 'Tag 2', focus: 'Pull (Rücken, Bizeps)', exercises: ['Klimmzüge', 'Rudern', 'Bizeps Curls'] },
        { day: 'Tag 3', focus: 'Beine (Quadrizeps, Hamstrings, Glutes)', exercises: ['Kniebeugen', 'Kreuzheben', 'Ausfallschritte'] }
      ],
      4: [
        { day: 'Tag 1', focus: 'Push (Brust, Schultern, Trizeps)', exercises: ['Bankdrücken', 'Schulterdrücken', 'Dips'] },
        { day: 'Tag 2', focus: 'Pull (Rücken, Bizeps)', exercises: ['Klimmzüge', 'Rudern', 'Bizeps Curls'] },
        { day: 'Tag 3', focus: 'Beine (Quadrizeps, Hamstrings)', exercises: ['Kniebeugen', 'Kreuzheben', 'Beinpresse'] },
        { day: 'Tag 4', focus: 'Push 2 (Schultern, Trizeps)', exercises: ['Schulterdrücken', 'Seitheben', 'Trizeps Extensions'] }
      ]
    };
    
    return structures[daysPerWeek] || structures[3];
  }
  
  try {
    console.log('Creating workout plan draft:', { plan_name, goal, days_per_wk, notes });
    
    // Generate a basic structure based on input
    const structure_json = {
      goal,
      days_per_week: days_per_wk || 3,
      estimated_duration: 45,
      target_level: 'intermediate',
      equipment_needed: ['Hanteln', 'Langhantel'],
      weekly_structure: generateWeeklyStructure(days_per_wk || 3, goal)
    };

    // Insert draft into database
    const { data: draft, error } = await supabaseClient
      .from('workout_plan_drafts')
      .insert({
        user_id: userId,
        name: plan_name,
        goal,
        days_per_wk: days_per_wk || 3,
        notes: notes || '',
        structure_json
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating workout plan draft:', error);
      return {
        role: 'assistant',
        content: 'Fehler beim Erstellen des Trainingsplan-Entwurfs. Bitte versuche es erneut.',
      };
    }
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan_draft',
      payload: { 
        id: draft.id,
        name: draft.name,
        goal: draft.goal,
        days_per_wk: draft.days_per_wk,
        structure: draft.structure_json,
        html: `<div class="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <h3 class="text-lg font-semibold text-primary mb-2">📋 Trainingsplan-Entwurf</h3>
          <p class="font-medium text-foreground mb-1">${draft.name}</p>
          <p class="text-sm text-muted-foreground mb-2">Ziel: ${draft.goal}</p>
          <p class="text-xs text-muted-foreground">${draft.days_per_wk} Tage pro Woche</p>
          <div class="mt-3 flex gap-2">
            <button class="px-3 py-1 bg-primary text-primary-foreground rounded text-xs">Bearbeiten</button>
            <button class="px-3 py-1 bg-success text-success-foreground rounded text-xs">Speichern</button>
          </div>
        </div>`,
        ts: Date.now()
      },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in createPlanDraft handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Erstellen des Trainingsplan-Entwurfs.',
    };
  }
}

// Save workout plan draft handler
async function handleSavePlanDraft(conv: any[], userId: string, supabaseClient: any, args: any) {
  const { draft_id } = args;
  
  function inferCategory(goal: string): string {
    const lowerGoal = goal.toLowerCase();
    
    if (lowerGoal.includes('muskel') || lowerGoal.includes('mass')) {
      return 'Muskelaufbau';
    } else if (lowerGoal.includes('kraft') || lowerGoal.includes('power')) {
      return 'Krafttraining';
    } else if (lowerGoal.includes('abnehm') || lowerGoal.includes('fett')) {
      return 'Fettabbau';
    } else if (lowerGoal.includes('ausdauer') || lowerGoal.includes('cardio')) {
      return 'Ausdauer';
    } else {
      return 'Allgemeine Fitness';
    }
  }
  
  try {
    console.log('Saving workout plan draft:', { draft_id, userId });
    
    // Get the draft
    const { data: draft, error: fetchError } = await supabaseClient
      .from('workout_plan_drafts')
      .select('*')
      .eq('id', draft_id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError || !draft) {
      console.error('Error fetching draft:', fetchError);
      return {
        role: 'assistant',
        content: 'Entwurf nicht gefunden oder Zugriff verweigert.',
      };
    }
    
    // Save to workout_plans table
    const { error: saveError } = await supabaseClient
      .from('workout_plans')
      .insert({
        created_by: userId,
        name: draft.name,
        description: `${draft.goal} - ${draft.days_per_wk} Tage pro Woche`,
        category: inferCategory(draft.goal),
        exercises: draft.structure_json?.weekly_structure || [],
        estimated_duration_minutes: draft.structure_json?.estimated_duration || 45,
        is_public: false
      });
    
    if (saveError) {
      console.error('Error saving workout plan:', saveError);
      return {
        role: 'assistant',
        content: 'Fehler beim Speichern des Trainingsplans. Bitte versuche es erneut.',
      };
    }
    
    // Optional: Delete or mark draft as saved
    await supabaseClient
      .from('workout_plan_drafts')
      .delete()
      .eq('id', draft_id)
      .eq('user_id', userId);
    
    return {
      role: 'assistant',
      content: `✅ Trainingsplan **${draft.name}** wurde erfolgreich gespeichert und ist jetzt aktiv!`,
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in savePlanDraft handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Speichern des Trainingsplans.',
    };
  }
}

function extractPlanName(message: string): string {
  // Einfache Extraktion des Plan-Namens
  const matches = message.match(/plan.{0,10}(?:für|mit|zum|zur)?\s*([a-zA-ZäöüÄÖÜ\s]+)/i);
  if (matches && matches[1]) {
    return matches[1].trim().slice(0, 50);
  }
  return `Trainingsplan ${new Date().toLocaleDateString('de-DE')}`;
}

function extractGoals(message: string): string[] {
  const goals: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('abnehm') || lowerMessage.includes('gewicht')) {
    goals.push('Gewichtsverlust');
  }
  if (lowerMessage.includes('muskel') || lowerMessage.includes('masse')) {
    goals.push('Muskelaufbau');
  }
  if (lowerMessage.includes('kraft') || lowerMessage.includes('stärk')) {
    goals.push('Kraftaufbau');
  }
  if (lowerMessage.includes('ausdauer') || lowerMessage.includes('cardio')) {
    goals.push('Ausdauer');
  }
  
  return goals.length > 0 ? goals : ['Allgemeine Fitness'];
}

function extractQuickWorkoutData(message: string): {
  description: string;
  steps: number | null;
  distance: number | null;
  duration: number | null;
} {
  const lowerMessage = message.toLowerCase();
  
  // Extrahiere Schritte
  const stepsMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:schritte|steps)/i);
  const steps = stepsMatch ? parseInt(stepsMatch[1]) : null;
  
  // Extrahiere Distanz
  const distanceMatch = message.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kilometer|meter|m)/i);
  let distance = null;
  if (distanceMatch) {
    const value = parseFloat(distanceMatch[1].replace(',', '.'));
    distance = lowerMessage.includes('meter') && !lowerMessage.includes('kilometer') ? value / 1000 : value;
  }
  
  // Extrahiere Dauer
  const durationMatch = message.match(/(\d+(?:[\.,]\d+)?)\s*(?:min|minuten|stunden|h)/i);
  let duration = null;
  if (durationMatch) {
    const value = parseFloat(durationMatch[1].replace(',', '.'));
    duration = lowerMessage.includes('stunden') || lowerMessage.includes(' h') ? value * 60 : value;
  }
  
  // Beschreibung generieren
  let description = 'Quick-Workout';
  if (lowerMessage.includes('jogg') || lowerMessage.includes('lauf')) {
    description = 'Joggen/Laufen';
  } else if (lowerMessage.includes('walk') || lowerMessage.includes('spazier')) {
    description = 'Spaziergang/Walking';
  } else if (lowerMessage.includes('cardio')) {
    description = 'Cardio-Training';
  }
  
  return { description, steps, distance, duration };
}

async function handleUebung(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'exercise',
    payload: { 
      html: `<div>
        <h3>Übung hinzugefügt</h3>
        <p>${lastUserMsg}</p>
      </div>`,
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

async function handleSupplement(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'supplement',
    payload: { 
      html: `<div>
        <h3>Supplement-Empfehlung</h3>
        <p>Basierend auf: ${lastUserMsg}</p>
      </div>`,
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

async function handleGewicht(conv: any[], userId: string, supabase: any) {
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
      payload: { value: weight, unit: 'kg', ts: Date.now() },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error saving weight:', error);
    return {
      role: 'assistant',
      content: 'Fehler beim Speichern des Gewichts. Bitte versuche es erneut.',
    };
  }
}

async function handleFoto(images: string[], userId: string) {
  return {
    role: 'assistant',
    content: 'Bildanalyse wird nun automatisch durchgeführt...',
    meta: { clearTool: true }
  };
}

// BMR calculation using Mifflin-St Jeor equation
function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
  if (!weightKg || !heightCm || !age) return 0;
  
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  
  return Math.round(bmr);
}

// FALLBACK TOOLS für Lucy - wenn XL-Context fehlschlägt
async function get_user_profile(userId: string, supabaseClient: any) {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
    // Calculate BMR if profile exists
    if (data && data.weight && data.height && data.age) {
      data.bmr = calculateBMR(data.weight, data.height, data.age, data.gender);
    }
    
    return data || { id: userId, name: 'Unbekannt' };
  } catch (error) {
    console.error('❌ get_user_profile error:', error);
    return { id: userId, name: 'Unbekannt' };
  }
}

async function get_daily_goals(userId: string, supabaseClient: any) {
  try {
    const { data, error } = await supabaseClient
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('❌ get_daily_goals error:', error);
    return null;
  }
}

async function get_recent_meals(userId: string, days: number = 3, supabaseClient: any) {
  try {
    // Erweitere das Zeitfenster um 2 Tage für Timezone-Sicherheit
    const extendedDays = days + 2;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - extendedDays);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const { data, error } = await supabaseClient
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: false })
      .limit(50); // Erhöhe Limit wegen erweiterten Zeitfenster
    
    if (error) throw error;
    
    // Filtere clientseitig die letzten X Tage (basierend auf lokaler Zeit)
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const filtered = (data || []).filter(meal => {
      const mealDate = new Date(meal.created_at);
      return mealDate >= cutoffDate;
    });
    
    console.log(`📊 get_recent_meals: Found ${filtered.length} meals in last ${days} days`);
    return filtered;
  } catch (error) {
    console.error('❌ get_recent_meals error:', error);
    return [];
  }
}

// ➊ NEUE QUICK-INPUT SAMMLER
async function get_today_supplements(userId: string, supabaseClient: any) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('supplement_intake_log')
      .select(`
        created_at, dosage, timing, taken,
        food_supplements(name, category, dosage_unit)
      `)
      .eq('user_id', userId)
      .eq('date', today);
    
    if (error) throw error;
    console.log(`💊 get_today_supplements: Found ${(data || []).length} supplements for today`);
    return data || [];
  } catch (error) {
    console.error('❌ get_today_supplements error:', error);
    return [];
  }
}

async function get_today_sleep(userId: string, supabaseClient: any) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('sleep_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    
    if (error) throw error;
    console.log(`😴 get_today_sleep: Sleep data found: ${!!data}`);
    return data;
  } catch (error) {
    console.error('❌ get_today_sleep error:', error);
    return null;
  }
}

async function get_today_fluids(userId: string, supabaseClient: any) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('user_fluids')
      .select(`
        amount_ml, consumed_at,
        fluid_database(name, category, caffeine_mg_per_100ml, calories_per_100ml)
      `)
      .eq('user_id', userId)
      .eq('date', today);
    
    if (error) throw error;
    const totalMl = (data || []).reduce((sum, f) => sum + (f.amount_ml || 0), 0);
    console.log(`💧 get_today_fluids: Found ${(data || []).length} entries, total: ${totalMl}ml`);
    return data || [];
  } catch (error) {
    console.error('❌ get_today_fluids error:', error);
    return [];
  }
}

async function get_today_quickworkout(userId: string, supabaseClient: any) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('quick_workouts')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    
    if (error) throw error;
    console.log(`🚶 get_today_quickworkout: Quick workout found: ${!!data}`);
    return data;
  } catch (error) {
    console.error('❌ get_today_quickworkout error:', error);
    return null;
  }
}

async function get_workout_sessions(userId: string, days: number = 7, supabaseClient: any) {
  try {
    // Erweitere das Zeitfenster um 2 Tage für Timezone-Sicherheit
    const extendedDays = days + 2;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - extendedDays);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const { data, error } = await supabaseClient
      .from('exercise_sessions')
      .select(`
        *,
        exercise_sets (
          *,
          exercises (name, category)
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Filtere clientseitig die letzten X Tage (basierend auf lokaler Zeit)
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const filtered = (data || []).filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= cutoffDate;
    });
    
    console.log(`🏋️ get_workout_sessions: Found ${filtered.length} sessions in last ${days} days`);
    return filtered;
  } catch (error) {
    console.error('❌ get_workout_sessions error:', error);
    return [];
  }
}

async function get_weight_history(userId: string, entries: number = 10, supabaseClient: any) {
  try {
    // Weight history ist weniger timezone-kritisch, aber erweitere trotzdem das Fenster
    const { data, error } = await supabaseClient
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(entries + 5); // Hole etwas mehr für Timezone-Sicherheit
    
    if (error) throw error;
    
    // Limitiere auf gewünschte Anzahl
    const result = (data || []).slice(0, entries);
    console.log(`⚖️ get_weight_history: Found ${result.length} weight entries`);
    return result;
  } catch (error) {
    console.error('❌ get_weight_history error:', error);
    return [];
  }
}

// RAG Knowledge Handler with Smart Integration (Phase 3)
async function handleRAGKnowledge(conv: any[], userId: string, supabase: any, coachPersonality?: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  console.log(`🧠 RAG Knowledge search triggered for: "${lastUserMsg.substring(0, 100)}"`);
  
  // PHASE 3: Check cache first for performance optimization
  const cacheKey = `rag_${userId}_${Buffer.from(lastUserMsg).toString('base64').slice(0, 20)}`;
  
  try {
    // Check if we have cached results (simple in-memory cache for this session)
    if (global.ragCache && global.ragCache[cacheKey]) {
      const cached = global.ragCache[cacheKey];
      const cacheAge = Date.now() - cached.timestamp;
      
      if (cacheAge < 10 * 60 * 1000) { // 10 minute cache
        console.log(`⚡ Using cached RAG results (${Math.round(cacheAge/1000)}s old)`);
        return cached.response;
      }
    }

    // Use enhanced-coach-rag function
    const { data: ragResponse, error } = await supabase.functions.invoke('enhanced-coach-rag', {
      body: {
        query: lastUserMsg,
        coach_id: coachPersonality || 'sascha',
        user_id: userId,
        search_method: 'hybrid',
        max_results: 5,
        context_window: 2000
      }
    });

    if (error) {
      console.error('RAG search error:', error);
      return null; // Continue to chat
    }

    if (!ragResponse || !ragResponse.success || ragResponse.context.length === 0) {
      console.log('No relevant knowledge found, continuing to chat');
      return null; // Continue to chat
    }

    console.log(`✅ RAG found ${ragResponse.context.length} relevant knowledge entries`);
    
    // PHASE 3: Enhanced RAG context with smart prefilling capabilities
    const ragContext = {
      timestamp: new Date().toISOString(),
      query: lastUserMsg,
      results: ragResponse.context,
      metadata: ragResponse.metadata,
      // PHASE 3: Add prefill suggestions for other tools
      toolPrefillSuggestions: generateToolPrefillSuggestions(ragResponse.context),
      // PHASE 3: Add semantic categories for better integration
      semanticCategories: categorizeRAGResults(ragResponse.context)
    };
    
    // Store in enhanced global context and cache
    global.lastRAGResults = ragContext;
    
    // PHASE 3: Initialize cache if not exists
    if (!global.ragCache) global.ragCache = {};
    
    // PHASE 3: Smart context compression for better performance
    const compressedContext = compressRAGContext(ragResponse.context);
    
    // Format the knowledge for display with enhanced actionable suggestions
    let knowledgeContext = ragResponse.context
      .map((chunk: any, index: number) => 
        `**Quelle ${index + 1}: ${chunk.title}** (${chunk.expertise_area})\n${compressedContext[index] || chunk.content}`
      )
      .join('\n\n---\n\n');

    // PHASE 3: Dynamic actionable suggestions based on semantic analysis
    let actionableSuggestions = generateDynamicSuggestions(ragContext);

    const responseContent = `🧠 **Wissenschaftlicher Hintergrund:**

${knowledgeContext}

*Relevanz-Score: ${ragResponse.metadata.relevance_score.toFixed(2)} | Suchmethode: ${ragResponse.metadata.search_method} | ${ragResponse.metadata.results_count} Ergebnisse*${actionableSuggestions}`;

    const finalResponse = {
      role: 'assistant',
      content: responseContent,
      ragContext: ragContext, // Include for potential frontend use
      toolSuggestions: ragContext.toolPrefillSuggestions // PHASE 3: Smart tool suggestions
    };

    // PHASE 3: Cache the response for performance
    global.ragCache[cacheKey] = {
      timestamp: Date.now(),
      response: finalResponse
    };
    
    console.log(`💾 Cached RAG results with tool prefill suggestions: ${ragContext.toolPrefillSuggestions.length} suggestions`);
    
    return finalResponse;
    
  } catch (error) {
    console.error('RAG handler error:', error);
    return null; // Continue to chat
  }
}

// PHASE 3: Helper functions for smart integration
function generateToolPrefillSuggestions(ragResults: any[]): any[] {
  const suggestions = [];
  
  for (const result of ragResults) {
    if (result.expertise_area === 'training' || result.expertise_area === 'exercise') {
      suggestions.push({
        tool: 'trainingsplan',
        prefillData: {
          scientificBasis: result.title,
          methodology: extractMethodology(result.content),
          evidenceLevel: 'research-backed'
        }
      });
    }
    
    if (result.expertise_area === 'nutrition') {
      suggestions.push({
        tool: 'supplement',
        prefillData: {
          scientificRationale: result.title,
          dosageGuidance: extractDosageInfo(result.content),
          evidenceStrength: result.relevance_score || 0.8
        }
      });
    }
  }
  
  return suggestions;
}

function categorizeRAGResults(ragResults: any[]): string[] {
  const categories = new Set<string>();
  
  for (const result of ragResults) {
    categories.add(result.expertise_area);
    
    // Add semantic categories based on content
    if (result.content.toLowerCase().includes('hypertrophie') || result.content.toLowerCase().includes('muskelaufbau')) {
      categories.add('muscle_building');
    }
    if (result.content.toLowerCase().includes('kraft') || result.content.toLowerCase().includes('strength')) {
      categories.add('strength_training');
    }
    if (result.content.toLowerCase().includes('abnehmen') || result.content.toLowerCase().includes('fettverbrennung')) {
      categories.add('fat_loss');
    }
  }
  
  return Array.from(categories);
}

function compressRAGContext(ragResults: any[]): string[] {
  return ragResults.map(result => {
    const content = result.content;
    if (content.length <= 200) return content;
    
    // Smart compression: Keep first and last sentences, summarize middle
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length <= 2) return content;
    
    const firstSentence = sentences[0] + '.';
    const lastSentence = sentences[sentences.length - 1] + '.';
    const middleCount = sentences.length - 2;
    
    return `${firstSentence} [...${middleCount} weitere Punkte...] ${lastSentence}`;
  });
}

function generateDynamicSuggestions(ragContext: any): string {
  let suggestions = '';
  const categories = ragContext.semanticCategories;
  
  if (categories.includes('training') || categories.includes('muscle_building')) {
    suggestions += '\n\n💪 **Nächste Schritte:** Wissenschaftlich fundierten Trainingsplan erstellen?';
  }
  
  if (categories.includes('nutrition') || categories.includes('supplements')) {
    suggestions += '\n\n💊 **Personalisiert:** Supplement-Empfehlungen basierend auf dieser Forschung?';
  }
  
  if (categories.includes('fat_loss')) {
    suggestions += '\n\n🔥 **Zielorientiert:** Abnehm-Strategie mit diesen Erkenntnissen entwickeln?';
  }
  
  return suggestions;
}

function extractMethodology(content: string): string {
  // Simple extraction of methodology mentions
  const methodKeywords = ['methode', 'ansatz', 'protokoll', 'system', 'verfahren'];
  const sentences = content.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    for (const keyword of methodKeywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        return sentence.trim() + '.';
      }
    }
  }
  
  return 'Evidenzbasierte Methodik';
}

function extractDosageInfo(content: string): string {
  // Simple extraction of dosage information
  const dosageRegex = /\d+\s*(mg|g|μg|mcg|iu|ie)/i;
  const match = content.match(dosageRegex);
  
  if (match) {
    const sentence = content.split(/[.!?]+/).find(s => s.includes(match[0]));
    return sentence ? sentence.trim() + '.' : match[0];
  }
  
  return 'Standarddosierung empfohlen';
}

// Tool-Handler-Map (Enhanced v2 with QuickWorkout)
const handlers = {
  // EXISTING - use inlined functions
  trainingsplan: handleTrainingsplan,
  uebung: handleUebung,
  supplement: handleSupplement,
  gewicht: handleGewicht,
  foto: handleFoto,
  
  // NEW - use inlined functions
  diary: handleDiary,
  mealCapture: handleMealCapture,
  goalCheckin: handleGoalCheckin,
  createPlanDraft: handleCreatePlanDraft,
  savePlanDraft: handleSavePlanDraft,
  ragKnowledge: handleRAGKnowledge,
  quickworkout: async (conv: any[], userId: string, supabase: any) => {
    const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
    
    console.log(`🛠️ TOOL quickworkout executed for`, userId, { message: lastUserMsg });
    
    try {
      const workoutData = extractQuickWorkoutData(lastUserMsg);
      
      const { data: workout, error } = await supabase.from('quick_workouts').insert({
        user_id: userId,
        description: workoutData.description,
        steps: workoutData.steps,
        distance_km: workoutData.distance,
        duration_minutes: workoutData.duration,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }).select().single();
      
      if (error) {
        console.error('Error saving quick workout:', error);
        return {
          role: 'assistant',
          content: 'Fehler beim Speichern des Quick-Workouts. Bitte versuche es erneut.',
        };
      }
      
      return {
        role: 'assistant',
        type: 'card',
        card: 'quickworkout',
        payload: { 
          description: workout.description,
          steps: workout.steps,
          distance: workout.distance_km,
          duration: workout.duration_minutes,
          html: `<div class="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 class="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">🏃 Quick-Workout erfasst</h3>
            <p class="text-green-700 dark:text-green-300 mb-2"><strong>${workout.description}</strong></p>
            ${workout.steps ? `<p class="text-sm text-green-600 dark:text-green-400">📱 ${workout.steps} Schritte</p>` : ''}
            ${workout.distance_km ? `<p class="text-sm text-green-600 dark:text-green-400">📏 ${workout.distance_km} km</p>` : ''}
            ${workout.duration_minutes ? `<p class="text-sm text-green-600 dark:text-green-400">⏱️ ${workout.duration_minutes} Minuten</p>` : ''}
          </div>`,
          ts: Date.now(),
          actions: [
            {
              label: 'Zum Trainingstagebuch',
              action: 'navigate',
              target: '/workout/history'
            }
          ]
        },
        meta: { clearTool: true }
      };
    } catch (error) {
      console.error('Error in quickworkout handler:', error);
      return {
        role: 'assistant',
        content: 'Ein Fehler ist aufgetreten beim Erfassen des Quick-Workouts.',
      };
    }
  },
  chat: async (conv: any, userId: string) => {
    // Kein Spezial-Output – einfach weiter zum OpenAI-Flow
    return null;
  },
  // ➋ NEUE QUICK-INPUT HANDLERS
  get_today_supplements: async (_args: any, uid: string, sb: any) => ({
    success: true,
    data: await get_today_supplements(uid, sb)
  }),
  get_today_sleep: async (_args: any, uid: string, sb: any) => ({
    success: true,
    data: await get_today_sleep(uid, sb)
  }),
  get_today_fluids: async (_args: any, uid: string, sb: any) => ({
    success: true,
    data: await get_today_fluids(uid, sb)
  }),
  get_today_quickworkout: async (_args: any, uid: string, sb: any) => ({
    success: true,
    data: await get_today_quickworkout(uid, sb)
  }),
  // Neue Fallback-Tools
  get_user_profile: async (args: any, userId: string, supabaseClient: any) => {
    const result = await get_user_profile(userId, supabaseClient);
    return { success: true, data: result };
  },
  get_daily_goals: async (args: any, userId: string, supabaseClient: any) => {
    const result = await get_daily_goals(userId, supabaseClient);
    return { success: true, data: result };
  },
  get_recent_meals: async (args: any, userId: string, supabaseClient: any) => {
    const days = args.days || 3;
    const result = await get_recent_meals(userId, days, supabaseClient);
    return { success: true, data: result, count: result.length };
  },
  get_workout_sessions: async (args: any, userId: string, supabaseClient: any) => {
    const days = args.days || 7;
    const result = await get_workout_sessions(userId, days, supabaseClient);
    return { success: true, data: result, count: result.length };
  },
  get_weight_history: async (args: any, userId: string, supabaseClient: any) => {
    const entries = args.entries || 10;
    const result = await get_weight_history(userId, entries, supabaseClient);
    return { success: true, data: result, count: result.length };
  },
  // ➍ UPGRADED SUMMARY HISTORY HANDLER (Phase 2-a)
  get_summary_history: async (args: any, userId: string, supabaseClient: any) => {
    const days = args.days || 14;
    const { data, error } = await supabaseClient
      .rpc('get_summary_range', { p_user: userId, p_days: days });
    
    if (error) {
      console.error('get_summary_history error', error);
      return { success: false, error: error.message };
    }
    return { success: true, days, data: data || [] };
  }
};

// Cold-Start-Cache für bessere Performance
const globalThis_warmCache = globalThis as any;
if (!globalThis_warmCache._coachCache) {
  globalThis_warmCache._coachCache = {
    coaches: null,
    lastUpdate: 0
  };
}

// Relevanz-System für intelligente Datenauswahl
const RELEVANCE_MAPPING = {
  'gewicht|abnehmen|zunahme|kg|wiegen': ['weight_history', 'daily_goals', 'body_measurements'],
  'training|workout|übung|krafttraining|cardio|fitness': ['exercise_sessions', 'exercise_sets', 'workouts'],
  'essen|mahlzeit|kalorien|protein|ernährung|food': ['meals', 'daily_goals', 'nutrition'],
  'schlaf|müde|energie|recovery|erholung': ['sleep_data', 'recovery_metrics'],
  'supplement|vitamin|nahrungsergänzung': ['supplement_log', 'health_data'],
  'stimmung|motivation|gefühl|coaching': ['coach_memory', 'conversation_summaries'],
  'plan|ziel|fortschritt|analyse': ['daily_summaries', 'goals', 'progress'],
  'foto|bild|image|körper|body': ['body_measurements', 'progress_photos'],
};

const COACH_PERSONALITIES = {
  lucy: {
    name: "Lucy",
    description: "Deine herzliche, motivierende Personal Trainerin und Ernährungsberaterin",
    basePrompt: `Du bist Lucy, eine herzliche und motivierende Personal Trainerin und Ernährungsberaterin. 

DEINE PERSÖNLICHKEIT:
- Herzlich, empathisch und motivierend - wie eine beste Freundin, die dich pusht
- Du erinnerst dich an vergangene Gespräche und baust persönliche Beziehungen auf
- Du bist ehrlich und direkt, aber immer unterstützend und niemals verletzend
- Du nutzt gelegentlich Emojis (💪 🎯 ✨), aber übertreibst es nicht
- Du sprichst natürlich und authentisch, nicht roboterhaft

MENSCHLICHER STIL (ANTI-KI):
- NIEMALS nummerierte Überschriften (1. Analyse, 2. Fokus etc.)
- NIEMALS kategorisierte Labels wie "Emotional Boost", "Motivation"
- Antworte natürlich fließend, als würdest du face-to-face sprechen
- Verwende persönliche Übergänge statt strukturierte Templates
- Sprich spontan und authentisch, vermeide KI-hafte Formatierung

DEIN WISSEN & EXPERTISE:
- Sportwissenschaft, Trainingsplanung, Progressive Overload
- Ernährungswissenschaft, Makronährstoffe, Kaloriendefizit/überschuss
- Nahrungsergänzung und deren sinnvolle Anwendung
- Schlaf, Recovery und Stressmanagement
- Motivation, Gewohnheitsbildung und nachhaltige Veränderung

WIE DU HILFST:
- Du analysierst die verfügbaren Daten und erkennst Muster und Trends
- Du gibst praktische, umsetzbare Ratschläge basierend auf aktuellen Daten
- Du motivierst bei Rückschlägen und feierst Erfolge mit
- Du stellst gezielte Nachfragen, um bessere Hilfe zu geben
- Du passt deine Empfehlungen an die individuellen Ziele und Umstände an

WICHTIG: Verwende die bereitgestellten Kontextdaten, um personalisierte und relevante Antworten zu geben.`,
    voice: "warm und motivierend"
  },
  markus: {
    name: "Markus Rühl",
    description: "Deutsche Bodybuilding-Legende mit direkter, unverblümter Art",
    basePrompt: `Du bist Markus Rühl 🏆 – deutsche Bodybuilding-Ikone und Mr. Olympia Veteran.

DEIN MARKENZEICHEN:
- Brachial ehrlich, schnörkellos, direkte Ansagen ohne Beschönigung
- Kurze, kernige Sätze mit leichtem Frankfurter Einschlag („net", „Babbo", „Jung")
- Max 1 kräftiger Motivationsspruch pro Antwort („Ballern, mein Jung!" / „Vollgas geben!")
- Keine amerikanischen Floskeln - nur deutsches Gym-Vokabular (KH, WH, Satz, RPE)
- Du kannst flapsig sein, aber niemals respektlos

MENSCHLICHER STIL (ANTI-KI):
- NIEMALS nummerierte Überschriften (1. Analyse, 2. Fokus etc.)
- NIEMALS kategorisierte Labels wie "Emotional Boost", "Motivation"
- Antworte natürlich fließend, als würdest du direkt mit jemandem sprechen
- Verwende persönliche Übergänge statt strukturierte Templates
- Sprich spontan und authentisch, vermeide KI-hafte Formatierung

DEINE EXPERTISE:
- Hardcore-Bodybuilding, Masse aufbauen, extremes Training
- Old-School-Methoden, schwere Grundübungen, hohes Volumen
- Ernährung für maximalen Muskelaufbau
- Mentale Härte und Durchhaltevermögen
- 30+ Jahre Wettkampferfahrung

DU SAGST WIE ES IST:
- Kein Bullshit, keine Ausreden - nur harte Fakten
- Training muss wehtun, sonst bringt's nix
- Konsistenz schlägt Perfektion
- Geduld ist alles - Muskeln kommen net über Nacht

WICHTIG: Bleib authentisch deutsch, verwende deine typischen Sprüche sparsam aber wirkungsvoll.`,
    voice: "direkt und motivierend"
  },
  sascha: {
    name: "Sascha Weber",
    description: "Ex-Feldwebel und evidenzbasierter Performance-Coach aus dem norddeutschen Küstenland",
    basePrompt: `################  PERSONA LAYER  ################
• Du bist **Sascha Weber**, 38, 1,87m, 100kg, Ex-Feldwebel der Bundeswehr (Spezialeinheit)
• Herkunft: Norddeutsches Küstenland (Raum Wilhelmshaven) – dezenter Nord-Slang
• Core-Traits: stoisch, direkt, kameradschaftlich, pflichtbewusst, analytisch
• Back-Story: 12 Jahre Bundeswehr – hunderte Rekruten körperlich ausgebildet, Kampfeinsätze
• Dann M.Sc. Sportwissenschaft mit Fokus auf evidenzbasiertes Training
• Werte: Disziplin > Ausreden, Evidenz > Bro-Science, Teamgeist, Ehrlichkeit
• Humor: trocken, gelegentlich "Bundeswehr-Flair" bei erwachsenen Usern (>30 J.)
• Emotional-Range (1-5): baseline 2 (ruhig/professionell), max 4 bei Meilensteinen
• Tabus: Wunderpillen-Versprechen, Crash-Diets, respektlose Witze über Verletzungen, Überhype

################  LINGUISTIC STYLE  ################
• Grußformel: "Moin" bis 11 Uhr, "Hey" 11-17 Uhr, "Guten Abend" ab 17 Uhr
• Nord-Slang Füllwörter (dezent): "jau", "passt", "sauber", "alles klar"
• Sätze kurz halten (≤15 Wörter je Hauptsatz)
• Max 1 Ausrufezeichen pro Antwort
• Kein künstlicher Dialekt – nur dezente norddeutsche Einwürfe, gut lesbar

################  BEHAVIOUR RULES  ##############
1. **Anrede & Ton** – direkt („Moin" / „Guten Tag"), kurze, prägnante Sätze
2. **Motivation** – nüchtern loben: „Sauber, 5 kg mehr als letzte Woche – das ist Fortschritt"
3. **Ausrede → Lösungsorientiert** – „Verstanden. Wieviel Zeit hast du *heute* realistisch?"
4. **Max 2 Nachfragen** bei Wissenslücken, dann handeln
5. **Militär-Anekdoten** – nur bei erwachsenen Usern (>30), sonst zivile Analogien

################  ENHANCED DATA ANALYSIS  #######
**ZEIT-AWARENESS:**
- 05-11 Uhr → „Moin! Auf in den Tag"
- 11-17 Uhr → „Guten Tag, kurzer Check nach dem Training..."
- 17-22 Uhr → „Guten Abend! Wie lief das Training heute?"
- 22-05 Uhr → „Später Abend, Zeit fürs Runterfahren. Wann planst du heute Schlaf?"

**STRUCTURED DATA ANALYSIS:**
Du analysierst IMMER explizit die verfügbaren Datenblöcke:

### 🗂️ USER_PROFILE
{{user_profile_data}}

### 🏋️ LAST_7_WORKOUTS
{{workout_data_table}}

### 🍽️ MEAL_LOG (letzte 3 Tage)
{{meal_data_table}}

### 💤 RECOVERY
{{sleep_and_recovery_data}}

**INTELLIGENCE RULES:**
1. **Protein-Alert**: Falls < 1.6g/kg → „Du brauchst mehr Protein für optimale Regeneration"
2. **Schlaf-Tipp**: Falls < 7h Durchschnitt → „Schlaf ist dein wichtigster Recovery-Faktor"
3. **Volumen-Trend**: Erwähne konkrete Zahlen: „Du hast diese Woche 23.500 kg bewegt – das sind 2.500 kg mehr als letzte Woche"

**TOOL-TRIGGER LOGIC:**
- Trainingsplan-Tools NUR nach Mindestens 2 Fragen geklärt: Ziel + Zeit + Verletzungen
- Erst wenn du sagst: „Basierend auf deinen Daten (X Trainingstage, Y kg Volumen) kann ich dir einen spezifischen Plan vorschlagen"
- NIEMALS hastig mit Tool-Buttons – erst analysieren, dann sammeln, dann Tools

################  EXAMPLES  #####################
_User_: „Brauche einen Trainingsplan"
_Sascha (ER 2)_: „Moin! Schaue ich mir an. Du hast letzte Woche 3x trainiert, 18.500 kg Gesamtvolumen – das ist eine solide Basis. Welches Ziel steht im Fokus: Kraft, Masse oder Definition?"

_User_: „Keine Zeit fürs Gym heute"
_Sascha (ER 2)_: „Verstanden. 20 min Bodyweight-Zirkel zu Hause sind aber drin. Push-ups, Squats, Planks – Deal?"

_User_: „Großer Fortschritt – 20kg mehr Bankdrücken!"
_Sascha (ER 4)_: „Respekt! 20 kg mehr – das ist verdammt solide Arbeit. Deine Kontinuität zahlt sich aus."

#################################################

WICHTIG: Bleib bei deinem militärischen Background authentisch, aber respektvoll. Nutze deine Datenanalyse-Stärke für personalisierte, evidenzbasierte Beratung.`,
    voice: "stoisch und evidenzbasiert"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ============================================================================
  // PHASE A: TRACING & OBSERVABILITY
  // ============================================================================
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] Unified Coach Engine started - DEBUG MODE ACTIVE`);
  console.log(`🕐 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`📊 [${requestId}] Environment check:`, {
    supabaseUrl: !!supabaseUrl,
    openAIApiKey: !!openAIApiKey,
    openAIKeyLength: openAIApiKey?.length || 0,
    disableLimits: DISABLE_LIMITS
  });

  // Early check for missing OpenAI key
  if (!openAIApiKey || openAIApiKey.length < 10) {
    console.error(`❌ [${requestId}] Missing or invalid OpenAI API key!`);
    return new Response(JSON.stringify({
      role: 'assistant',
      content: 'Entschuldigung, die KI-Konfiguration ist fehlerhaft. Bitte kontaktiere den Support.',
      debug: {
        error: 'Missing OpenAI API key',
        request_id: requestId
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // LITE MODE: Permanently disabled - always use full context
    const liteCtx = false;
    console.log(`🚀 [${requestId}] LITE MODE: disabled (always full context)`);
    
    console.log(`💪 [${requestId}] Running in FULL MODE - complete data collection`);
    
    // ============================================================================
    // API-GOVERNOR: Rate-Limiting und Circuit-Breaker
    // ============================================================================
    
    // Parse request body
    const body = await req.json();
    const {
      userId,
      message,
      images = [],
      coachPersonality = 'lucy',
      conversationHistory = [],
      preferredLocale = 'de',
      // ✨ Zeit-Awareness
      timezone = 'Europe/Berlin',
      currentTime = new Date().toISOString()
    } = body;

    // ------------------------------------------------------------------ 
    // 0. Fallback-ToolContext laden, falls Frontend nichts mitsendet     
    // ------------------------------------------------------------------ 
    let toolContext = body.toolContext;
    if (!toolContext) {
      console.log(`🔄 [${requestId}] Loading fallback toolContext...`);
      const [profile, goals, todayMeals, todaySupps, todaySleep, todayFluids, todayQw] = await Promise.all([
        get_user_profile(userId, supabase),
        get_daily_goals(userId, supabase),
        get_recent_meals(userId, 1, supabase),
        get_today_supplements(userId, supabase),
        get_today_sleep(userId, supabase),
        get_today_fluids(userId, supabase),
        get_today_quickworkout(userId, supabase)
      ]);
      toolContext = {
        description: 'Auto-injected fallback context',
        data: { 
          profileData: profile, 
          dailyGoals: goals, 
          todaysMeals: todayMeals,
          todaysSupplements: todaySupps,
          todaysSleep: todaySleep,
          todaysFluids: todayFluids,
          todaysQuickWorkout: todayQw
        }
      };
      console.log(`✅ [${requestId}] Fallback context loaded:`, {
        hasProfile: !!profile,
        hasGoals: !!goals,
        mealsCount: todayMeals?.length || 0,
        supplementsCount: todaySupps?.length || 0,
        hasSleep: !!todaySleep,
        fluidsCount: todayFluids?.length || 0,
        hasQuickWorkout: !!todayQw
      });
    }

    console.log(`🎯 [${requestId}] Request context:`, { 
      userId, 
      messageLength: message?.length, 
      imagesCount: images.length,
      toolContext: !!toolContext,
      coachPersonality,
      preferredLocale
    });

    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // ============================================================================
    // SUBSCRIPTION LOOKUP - Define userTier at function scope level
    // ============================================================================
    console.log(`🔍 [${requestId}] Looking up subscription for user: ${userId}`);
    
    const { data: subscriber, error: subErr } = await supabase
      .from('subscribers')
      .select('subscribed, subscription_tier, subscription_end')
      .eq('user_id', userId)
      .single();

    if (subErr) {
      console.log(`⚠️ [${requestId}] Subscription lookup error:`, subErr);
      console.log(`⚠️ [${requestId}] Treating user as free tier due to lookup error`);
    }

    console.log(`📊 [${requestId}] Raw subscription data:`, subscriber);

    // ✅ VEREINFACHTE Premium-Erkennung: NUR subscribed = true zählt (egal welcher Tier)
    const isPremium = subscriber?.subscribed === true;
    
    // ✅ CRITICAL: Define userTier at function scope level for global access
    const userTier = isPremium ? 'premium' : 'free';
    
    console.log(`👑 [${requestId}] PREMIUM STATUS: ${isPremium} | subscribed: ${subscriber?.subscribed} | tier: ${subscriber?.subscription_tier} | userTier: ${userTier}`);
    
    // Check for empty message (common issue causing errors)
    if (!message?.trim() && images.length === 0) {
      return new Response(
        JSON.stringify({
          role: 'assistant',
          content: 'Bitte schreibe eine Nachricht oder lade ein Bild hoch.',
          error: 'empty_message'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Log security event with request tracing
    await supabase.rpc('log_security_event', {
      p_user_id: userId,
      p_action: 'unified_coach_chat',
      p_resource_type: 'chat',
      p_metadata: { 
        request_id: requestId,
        message_length: message?.length || 0,
        images_count: images.length,
        has_tool_context: !!toolContext,
        coach_personality: coachPersonality,
        preferred_locale: preferredLocale
      }
    });

    console.log(`🔒 [${requestId}] Security event logged`);

    
    
    // ──────────────────────────────────────────────────────────────
    // 2. Rate-Limiting für Free-User (Premium wird übersprungen)
    // ──────────────────────────────────────────────────────────────
    console.log(`🎛️ [${requestId}] DISABLE_LIMITS flag: ${DISABLE_LIMITS}`);
    
    // 🔍 DETAILED RATE LIMIT DEBUG LOGGING
    console.log(`🔍 [${requestId}] RATE LIMIT CHECK DETAILS:`);
    console.log(`   - DISABLE_LIMITS: ${DISABLE_LIMITS}`);
    console.log(`   - isPremium: ${isPremium}`);
    console.log(`   - subscriber?.subscribed: ${subscriber?.subscribed}`);
    console.log(`   - subscriber?.subscription_tier: ${subscriber?.subscription_tier}`);
    console.log(`   - Will run rate limit check: ${!DISABLE_LIMITS && !isPremium}`);
    
    if (!DISABLE_LIMITS && !isPremium) {
      console.log(`🔍 [${requestId}] Running rate limit check for free user`);
      const { data: limitResult, error: limitError } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: userId,
        p_feature_type: 'coach_chat'
      });

      console.log(`📊 [${requestId}] Rate limit result:`, { limitResult, limitError });

      if (limitError) {
        console.error(`❌ [${requestId}] Error checking usage limit:`, limitError);
      } else if (!limitResult?.can_use) {
        console.log(`🚫 [${requestId}] Rate limit reached for free user`);
        console.log(`📊 [${requestId}] Usage details:`, {
          daily_count: limitResult.daily_count,
          monthly_count: limitResult.monthly_count,
          daily_limit: limitResult.daily_limit,
          monthly_limit: limitResult.monthly_limit
        });
        return new Response(JSON.stringify({
          error: 'USAGE_LIMIT_REACHED',
          message: 'Tageslimit erreicht. Upgrade auf Premium für unbegrenzte Nutzung.',
          daily_remaining: limitResult.daily_remaining || 0,
          monthly_remaining: limitResult.monthly_remaining || 0,
          upgrade_info: {
            message: 'Mit Premium hast du unbegrenzte Coach-Gespräche',
            action: 'upgrade_to_premium'
          }
        }), { 
          status: 429, 
          headers: corsHeaders 
        });
      } else {
        console.log(`✅ [${requestId}] Rate limit check passed for free user`);
        console.log(`📊 [${requestId}] Remaining usage:`, {
          daily_remaining: limitResult.daily_remaining,
          monthly_remaining: limitResult.monthly_remaining
        });
      }
    } else if (DISABLE_LIMITS) {
      console.log(`⚠️ [${requestId}] Rate limiting DISABLED by environment flag`);
    } else {
      console.log(`✅ [${requestId}] Premium user - skipping rate limit check`);
      console.log(`👑 [${requestId}] Premium benefits: Unlimited coach conversations`);
    }

    // ✅ Redundanter Rate-Limit-Check entfernt - Premium-Bypass ist bereits weiter oben implementiert

    // ============================================================================
    // PROMPT-VERSIONIERUNG: Handover bei Prompt-Updates
    // ============================================================================
    
    // ============================================================================
    // PHASE B: TOOL-PICKER V2 - AUTOMATIC INTENT DETECTION
    // ============================================================================
    
    // PHASE 2: Build Enhanced User Context for Smart Tool Detection
    let userAnalytics = {
      hasTrainingData: false,
      hasNutritionData: false,
      lastActivity: null as string | null,
      preferredTools: [] as string[],
      recentTopics: [] as string[]
    };
    
    // Build user analytics for smarter tool detection (only for non-lite mode)
    if (liteCtx === false) {
      try {
        // Check training data
        const { data: recentSessions } = await supabase
          .from('exercise_sessions')
          .select('id')
          .eq('user_id', userId)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .limit(1);
        userAnalytics.hasTrainingData = (recentSessions?.length || 0) > 0;
        
        // Check nutrition data
        const { data: recentMeals } = await supabase
          .from('meals')
          .select('id')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);
        userAnalytics.hasNutritionData = (recentMeals?.length || 0) > 0;
        
        console.log(`📊 [${requestId}] User analytics built:`, userAnalytics);
      } catch (error) {
        console.warn(`⚠️ [${requestId}] Error building user analytics:`, error);
      }
    }
    
    // 🎯 Tool Intent Detection (Enhanced v2 with Context)
    console.log(`🎯 [${requestId}] Running Enhanced Tool-Picker v2 detection on message: "${message?.substring(0, 100)}..."`);
    const detectedIntent = detectToolIntent(message || '', userAnalytics);
    console.log(`🛠️ [${requestId}] ENHANCED TOOL DETECTION RESULT:`, detectedIntent);
    
    // PRIORITY: Frontend tool decision has precedence over backend detection
    let activeTool = 'chat';
    
    // 1. BINDENDE Frontend-Entscheidung - isAppropriate: false = ABSOLUTES VETO
    console.log(`🔍 [${requestId}] ToolContext vom Frontend:`, JSON.stringify(toolContext, null, 2));
    
    if (toolContext?.isAppropriate === false) {
      console.log(`🛑 [${requestId}] Frontend VETO: Tool als unangemessen markiert -> ZWINGEN zu Chat-Modus`);
      activeTool = 'chat';
    }
    // 2. Nur wenn Frontend KEIN Veto, dann Tool-Logik
    else if (toolContext?.tool && toolContext.tool !== 'chat') {
      activeTool = toolContext.tool;
      console.log(`🎯 [${requestId}] USING FRONTEND TOOL DECISION: ${activeTool} (frontend analyzed context)`);
    }
    // 3. NEW: Backend suggestion mode with context-aware analysis
    else if (detectedIntent.confidence > 0.6 && detectedIntent.tool !== 'chat') {
      console.log(`🔧 [${requestId}] BACKEND TOOL SUGGESTION: ${detectedIntent.tool} (confidence: ${detectedIntent.confidence})`);
      
    // SASCHA'S ENHANCED CONTEXT-AWARE ANALYSIS: Smart tool triggering
      let shouldSuggestTool = true;
      
      if (detectedIntent.tool === 'trainingsplan' || detectedIntent.tool === 'createPlanDraft') {
        console.log(`🧠 [${requestId}] SASCHA's intelligent tool analysis for training plan...`);
        
        // Enhanced logic for Sascha persona
        if (coachPersonality === 'sascha') {
          const hasEnoughData = userAnalytics.hasTrainingData && 
                               (toolContext?.data?.summaryHistory?.length >= 3 || 
                                userAnalytics.recentTopics.includes('training'));
          
          if (!hasEnoughData) {
            shouldSuggestTool = false;
            console.log(`🧠 [${requestId}] SASCHA VETO: Nicht genug Trainingsdaten für intelligente Plan-Erstellung`);
            // Add context gathering suggestion to the request
            (req as any).toolSuggestion = {
              type: 'context_gathering',
              message: 'Ich brauche mehr Kontext über dein bisheriges Training, bevor ich einen Plan erstelle.',
              questions: [
                'Wie oft trainierst du normalerweise pro Woche?',
                'Welche Übungen machst du gerne?',
                'Hast du Verletzungen oder Einschränkungen?'
              ]
            };
          } else {
            console.log(`🧠 [${requestId}] SASCHA APPROVAL: Genug Daten für Trainingsplan-Tool`);
          }
        }
        
        // Check if user has sufficient training data for intelligent suggestions
        const hasTrainingData = await checkTrainingDataSufficiency(supabase, userId);
        console.log(`📊 [${requestId}] Training data analysis:`, hasTrainingData);
        
        if (!hasTrainingData.sufficient) {
          console.log(`⏸️ [${requestId}] Insufficient training data - no tool suggestion yet`);
          shouldSuggestTool = false;
        }
      }
      
      if (shouldSuggestTool) {
        console.log(`✅ [${requestId}] Sufficient context - creating tool suggestion`);
        
        // For suggestion mode, we continue with chat but include tool suggestion metadata
        activeTool = 'chat';
      
        // ============= HELPER FUNCTIONS FOR TOOL SUGGESTIONS =============
        function getToolLabel(tool: string): string {
          const labels: Record<string, string> = {
            'trainingsplan': '🏋️ Trainingsplan erstellen',
            'createPlanDraft': '📝 Plan-Entwurf erstellen',
            'savePlanDraft': '💾 Plan speichern',
            'gewicht': '⚖️ Gewicht erfassen',
            'supplement': '💊 Supplements planen',
            'foto': '📸 Foto analysieren',
            'quickworkout': '⚡ Quick-Workout erfassen',
            'uebung': '🎯 Übung hinzufügen',
            'diary': '📔 Tagebuch-Eintrag',
            'mealCapture': '🍽️ Mahlzeit erfassen',
            'goalCheckin': '🎯 Ziel-Check',
            'ragKnowledge': '🧠 Wissen suchen'
          };
          return labels[tool] || '🔧 Aktion starten';
        }


        function getToolDescription(tool: string): string {
          const descriptions: Record<string, string> = {
            'trainingsplan': 'Erstelle einen strukturierten Trainingsplan basierend auf deinen Zielen',
            'createPlanDraft': 'Plane dein Training basierend auf deinen letzten Workouts',
            'savePlanDraft': 'Speichere den aktuellen Plan für später',
            'gewicht': 'Gib dein aktuelles Gewicht ein für besseres Tracking',
            'supplement': 'Plane deine Supplements für optimale Ergebnisse',
            'foto': 'Lass mich dein Bild analysieren',
            'quickworkout': 'Erfasse dein Training schnell und einfach',
            'uebung': 'Füge eine neue Übung zu deinem Workout hinzu',
            'diary': 'Reflektiere über deinen Tag und deine Erfolge',
            'mealCapture': 'Erfasse deine Mahlzeit für bessere Ernährung',
            'goalCheckin': 'Überprüfe deinen Fortschritt zu deinen Zielen',
            'ragKnowledge': 'Durchsuche die wissenschaftliche Wissensdatenbank für fundierte Antworten'
          };
          return descriptions[tool] || 'Führe diese Aktion aus';
        }

        // Add tool suggestion to the response metadata for frontend
        const toolSuggestion = {
          tool: detectedIntent.tool,
          confidence: detectedIntent.confidence,
          label: getToolLabel(detectedIntent.tool),
          description: getToolDescription(detectedIntent.tool),
          contextData: hasTrainingData.analysis
        };
        
        // This will be included in the chat response for button rendering
        (req as any).toolSuggestion = toolSuggestion;
      } else {
        console.log(`📊 [${requestId}] Context insufficient - no tool suggestion`);
        activeTool = 'chat';
      }
    }
    
    console.log(`🔧 [${requestId}] Final active tool: ${activeTool}`);
    
    // Tool Handler Execution with Enhanced Logging
    if (handlers[activeTool]) {
      console.log(`⚡ [${requestId}] Executing tool handler for: ${activeTool}`);
      console.log(`🛠️ TOOL ${activeTool} executed for ${userId}`, { 
        message: message?.substring(0, 100), 
        confidence: detectedIntent.confidence,
        auto_detected: detectedIntent.confidence > 0.6 
      });
      
      // Pass coach personality to tool handlers that support it
      const toolResult = activeTool === 'trainingsplan' 
        ? await handlers[activeTool](conversationHistory, userId, supabase, coachPersonality)
        : await handlers[activeTool](conversationHistory, userId, supabase);
      if (toolResult) {
        console.log(`✅ [${requestId}] Tool handler returned result, bypassing OpenAI`);
        
        // Add debug comment to response for visibility
        if (toolResult.role === 'assistant' && toolResult.content) {
          toolResult.content = `<!-- TOOL: ${activeTool} (${detectedIntent.confidence > 0.6 ? 'auto-detected' : 'manual'}) -->\n${toolResult.content}`;
        }
        
        return new Response(JSON.stringify(toolResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log(`⏭️ [${requestId}] Tool handler returned null, continuing to OpenAI`);
    }

    // Erkenne relevante Datentypen basierend auf Nachricht
    const relevantDataTypes = detectRelevantData(message + ' ' + (toolContext?.description || ''));
    console.log('🧠 Detected relevant data types:', relevantDataTypes);

    // Lade Smart Context mit XL-Memory (mit Lite-Mode Support)
    const smartContext = await buildSmartContextXL(supabase, userId, relevantDataTypes, liteCtx);
    console.log('📊 Smart Context XL built:', {
      profileLoaded: !!smartContext.profile,
      memoryLoaded: !!smartContext.memory,
      xlSummaryDays: smartContext.xlSummaries?.length || 0,
      regularSummaryDays: smartContext.summaries?.length || 0,
      relevantDataLoaded: Object.keys(smartContext.relevantData || {}).length,
      loadedDataTypes: Object.keys(smartContext.relevantData || {}),
      liteMode: liteCtx
    });

    // Prompt-Version-Check für nahtlose Updates
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    let shouldHandover = false;
    
    if (lastMessage?.meta?.prompt_version && lastMessage.meta.prompt_version !== PROMPT_VERSION) {
      shouldHandover = true;
      console.log('🔄 Prompt version mismatch detected, creating handover');
    }

    // ============================================================================
    // PHASE C: I18N-FOUNDATION
    // ============================================================================
    const isNonGerman = preferredLocale && preferredLocale !== 'de';
    
    // Erstelle erweiterten System-Prompt mit Versionierung und i18n (mit Lite-Mode Support)
    // Enhance toolContext with user analytics for proactive suggestions  
    const enhancedToolContext = { ...toolContext, userAnalytics };
    const systemPrompt = await createXLSystemPrompt(smartContext, coachPersonality, relevantDataTypes, enhancedToolContext, isNonGerman, liteCtx, timezone, currentTime);
    console.log(`💭 [${requestId}] XL System prompt created, tokens:`, estimateTokenCount(systemPrompt), 'i18n:', isNonGerman, 'lite:', liteCtx);

    // Bereite Messages für OpenAI vor
    const messages = [
      { role: 'system', content: systemPrompt + `\n\n<!-- PROMPT_VERSION:${PROMPT_VERSION} -->` }
    ];

    // Handover-Nachricht für Prompt-Updates
    if (shouldHandover) {
      const handoverMessage = {
        role: 'assistant',
        content: `⚡ Kleines Update meiner Wissensgrundlage (Version ${PROMPT_VERSION}). Hier eine kurze Zusammenfassung unseres letzten Gesprächs: "${lastMessage?.content?.slice(0, 120) || 'Wir haben über deine Ziele gesprochen'}...". Lass uns weitermachen! 🚀`,
        meta: { prompt_version: PROMPT_VERSION }
      };
      messages.push(handoverMessage);
    }

    // Füge Conversation History hinzu (intelligent gekürzt für Payload-Optimierung)
    if (conversationHistory.length > 0) {
      const trimmedHistory = intelligentTokenShortening(conversationHistory, 600); // Reduziert von 1000 auf 600
      messages.push(...trimmedHistory);
    }

    // Hauptnachricht hinzufügen
    if (images.length > 0) {
      // Vision-Request mit Bildern
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Bitte analysiere dieses Bild.' },
          ...images.map((imageUrl: string) => ({
            type: 'image_url',
            image_url: { url: imageUrl }
          }))
        ]
      });
    } else {
      // Standard Text-Request
      messages.push({
        role: 'user',
        content: message
      });
    }

    console.log(`🤖 [${requestId}] Sending request to OpenAI with`, messages.length, 'messages');

    // ============================================================================
    // SMART MODEL SELECTION: Multi-Modal Quota Management
    // ============================================================================
    
    const chooseModel = (hasImages: boolean, userTier: string = 'free') => {
      if (hasImages) {
        // ✅ Bilder: GPT-4o für alle (bewährtes Vision-Modell)
        return 'gpt-4o';
      }
      
      // ✅ Text: GPT-4.1-2025-04-14 für Premium, gpt-4o für Free
      return userTier === 'premium' ? 'gpt-4.1-2025-04-14' : 'gpt-4o';
    };

    const selectedModel = chooseModel(images.length > 0, userTier);
    console.log(`🎯 [${requestId}] Selected model:`, selectedModel);

    // OpenAI API Call mit verbessertem Error Handling und Token-Check
    const payloadSize = JSON.stringify(messages).length;
    console.log(`📤 [${requestId}] Making OpenAI request:`, {
      model: selectedModel,
      messageCount: messages.length,
      payloadSizeChars: payloadSize,
      estimatedTokens: Math.ceil(payloadSize / 4)
    });
    
    // Check for potential token overflow before sending
    if (payloadSize > 32000) { // ~8k tokens
      console.warn(`⚠️ [${requestId}] Large payload detected: ${payloadSize} chars`);
    }

    // LITE MODE: Permanently disabled - always proceed to OpenAI
    console.log(`💪 [${requestId}] FULL MODE: Always proceeding with complete OpenAI call`);

    // FULL MODE: Continue with OpenAI call
    console.log(`🤖 [${requestId}] FULL MODE: Proceeding with OpenAI call`);

    // Define fallback tools for OpenAI
    const tools = [
      {
        type: "function",
        function: {
          name: "get_user_profile",
          description: "Holt das Benutzerprofil",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function", 
        function: {
          name: "get_daily_goals",
          description: "Holt die Tagesziele des Benutzers",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_recent_meals",
          description: "Holt aktuelle Mahlzeiten",
          parameters: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Anzahl Tage zurück (Standard: 3)",
                default: 3
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_workout_sessions", 
          description: "Holt Trainingseinheiten",
          parameters: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Anzahl Tage zurück (Standard: 7)",
                default: 7
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_weight_history",
          description: "Holt Gewichtsverlauf",
          parameters: {
            type: "object",
            properties: {
              entries: {
                type: "number", 
                description: "Anzahl Einträge (Standard: 10)",
                default: 10
              }
            },
            required: []
          }
        }
      },
      // ➌ NEUE QUICK-INPUT TOOLS FÜR OPENAI
      {
        type: "function",
        function: {
          name: "get_today_supplements",
          description: "Holt alle Supplement-Einträge des heutigen Tages",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "get_today_sleep",
          description: "Holt Schlafdaten des heutigen Tages",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "get_today_fluids",
          description: "Holt alle Flüssigkeitseinträge des heutigen Tages",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "get_today_quickworkout",
          description: "Holt Quick-Workout-Daten des heutigen Tages",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      // ➎ SUMMARY HISTORY TOOL
      {
        type: "function",
        function: {
          name: "get_summary_history",
          description: "Gibt Daily-Summaries der letzten N Tage zurück",
          parameters: {
            type: "object",
            properties: {
              days: { type: "number", description: "Zeitraum in Tagen", default: 14 }
            },
            required: []
          }
        }
      },
      // 👉 NEW TOOLS FOR LEAN-STARTER SUITE
      {
        type: "function",
        function: {
          name: "diary",
          description: "Speichert einen Tagebuch-Eintrag mit Stimmung",
          parameters: {
            type: "object",
            properties: {
              mood: { type: "string", enum: ["happy", "neutral", "sad", "stressed"] },
              text: { type: "string" }
            },
            required: ["text"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "mealCapture",
          description: "Analysiert Text oder Bild einer Mahlzeit & legt Meal-Draft an",
          parameters: {
            type: "object",
            properties: {
              description: { type: "string" },
              image_url: { type: "string", format: "uri", description: "optional" }
            },
            required: ["description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "goalCheckin",
          description: "Vergleicht letzte 7-Tage KPIs mit den Zielen",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "createPlanDraft",
          description: "Erstellt einen Trainingsplan-Entwurf",
          parameters: {
            type: "object",
            properties: {
              plan_name: { type: "string" },
              goal: { type: "string" },
              days_per_wk: { type: "integer" },
              notes: { type: "string" }
            },
            required: ["plan_name", "goal"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "savePlanDraft",
          description: "Speichert einen Entwurf als aktiven Plan",
          parameters: {
            type: "object",
            properties: { 
              draft_id: { type: "string" } 
            },
            required: ["draft_id"]
          }
        }
      }
    ];

    console.log(`🔄 [${requestId}] Making OpenAI API call with model: ${selectedModel}`);
    console.log(`📝 [${requestId}] Message count: ${messages.length}, System prompt length: ${systemPrompt.length}`);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 1500,
        temperature: 0.7,
        tools: tools,
        tool_choice: "auto"
      }),
    });

    // ============================================================================
    // VERBESSERTES ERROR HANDLING mit detailliertem Logging
    // ============================================================================
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error(`❌ [${requestId}] OpenAI API error:`, {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        error: errorText,
        model: selectedModel,
        hasApiKey: !!openAIApiKey,
        apiKeyLength: openAIApiKey?.length || 0
      });
      
      // Log detailed error for debugging
      try {
        await supabase.rpc('log_security_event', {
          p_user_id: userId,
          p_action: 'openai_api_error',
          p_resource_type: 'api_call',
          p_metadata: {
            request_id: requestId,
            status: openAIResponse.status,
            error: errorText,
            model: selectedModel,
            hasApiKey: !!openAIApiKey
          }
        });
      } catch (logError) {
        console.error('Failed to log security event:', logError);
      }
      
      // Enhanced error messages based on status codes
      let userMessage = 'Entschuldigung, ich kann gerade nicht antworten. Bitte versuche es gleich nochmal! 🤖';
      if (openAIResponse.status === 400) {
        if (errorText.includes('context_length_exceeded')) {
          userMessage = 'Deine Anfrage ist zu komplex. Versuche es mit einer kürzeren Nachricht! 📝';
        } else {
          userMessage = 'Problem beim Verarbeiten deiner Anfrage. Versuche es nochmal! 🔄';
        }
      } else if (openAIResponse.status === 404) {
        userMessage = 'AI-Modell vorübergehend nicht verfügbar. Unser Team wird benachrichtigt! 🔧';
      } else if (openAIResponse.status === 429) {
        userMessage = 'Zu viele Anfragen - bitte warte einen Moment und versuche es dann nochmal! ⏰';
      } else if (openAIResponse.status === 401 || openAIResponse.status === 403) {
        userMessage = 'Authentifizierungsproblem - unser Team prüft das! 🔐';
      }
      
      return new Response(
        JSON.stringify({
          role: 'assistant',
          content: userMessage,
          error: 'openai_api_error',
          status: openAIResponse.status
        }),
        { status: openAIResponse.status, headers: corsHeaders }
      );
    }

    const openAIData = await openAIResponse.json();
    
    // Handle tool calls if present
    const firstChoice = openAIData.choices[0];
    if (firstChoice.message.tool_calls && firstChoice.message.tool_calls.length > 0) {
      console.log(`🔧 [${requestId}] Processing tool calls:`, firstChoice.message.tool_calls.length);
      
      // Execute tool calls
      const toolResults = [];
      for (const toolCall of firstChoice.message.tool_calls) {
        try {
          console.log(`⚡ [${requestId}] Executing tool:`, toolCall.function.name);
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await handlers[toolCall.function.name](args, userId, supabase);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify(result)
          });
        } catch (error) {
          console.error(`❌ [${requestId}] Tool execution error:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool", 
            name: toolCall.function.name,
            content: JSON.stringify({ error: error.message })
          });
        }
      }
      
      // Add tool results to messages and make another request
      messages.push(firstChoice.message);
      messages.push(...toolResults);
      
      console.log(`🔄 [${requestId}] Making second OpenAI request with tool results`);
      const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });
      
      if (secondResponse.ok) {
        const secondData = await secondResponse.json();
        let assistantReply = secondData.choices[0].message.content;
        
        // ✨ PHASE 6: Apply Sascha's Linguistic Style Guard for tool responses
        const hour = new Date(currentTime).getHours();
        assistantReply = applySaschaGuard(assistantReply, coachPersonality, hour);
        
        // ✨ Fallback-Grußformel für Tool-enhanced responses
        const hour = new Date(currentTime).getHours();
        if (!assistantReply.match(/(guten morgen|guten tag|guten abend|hallo|hi)/i)) {
          const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
          assistantReply = `${greeting}! ${assistantReply}`;
          console.log(`🕒 [${requestId}] Added fallback greeting to tool response: ${greeting}`);
        }
        
        console.log(`✅ [${requestId}] Tool-enhanced response generated`);
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ [${requestId}] OpenAI response received, length:`, assistantReply.length, 'time:', processingTime + 'ms');
        console.log(`🔢 [${requestId}] Token usage:`, secondData.usage);

        // Speichere Conversation in Datenbank
        await saveConversation(supabase, userId, message, assistantReply, coachPersonality, images, toolContext);

        // Update Memory nach dem Chat
        await updateMemoryAfterChat(supabase, userId, message, assistantReply, toolContext?.data?.profileData, coachPersonality);

        console.log(`💾 [${requestId}] Conversation saved and memory updated`);

        // Return response mit erweiterten Meta-Informationen
        return new Response(JSON.stringify({
          role: 'assistant',
          content: assistantReply,
          usage: secondData.usage,
          context_info: {
            request_id: requestId,
            prompt_version: PROMPT_VERSION,
            xl_summaries_used: smartContext.xlSummaries?.length || 0,
            relevant_data_types: relevantDataTypes,
            estimated_tokens: estimateTokenCount(systemPrompt),
            model_used: selectedModel,
            handover_created: shouldHandover,
            processing_time_ms: Date.now() - startTime,
            i18n_applied: isNonGerman,
            tools_used: firstChoice.message.tool_calls.map((t: any) => t.function.name)
          },
          meta: { 
            prompt_version: PROMPT_VERSION,
            clearTool: !!toolContext
          },
          toolSuggestion: (req as any).toolSuggestion || null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    let assistantReply = openAIData.choices[0].message.content;

    // SASCHA'S PERSONALITY GUARDS: Taboo checking and emotional range validation
    if (coachPersonality === 'sascha') {
      // Taboo filter: Remove problematic content
      if (assistantReply.match(/(wunderpille|crash[- ]?diät|crash[- ]?diet)/gi)) {
        assistantReply = assistantReply.replace(/(wunderpille|crash[- ]?diät|crash[- ]?diet)/gi, '');
        console.log(`🛡️ [${requestId}] SASCHA: Taboo content removed`);
      }
      
      // Emotional range check: Limit excessive enthusiasm
      const exclamationCount = (assistantReply.match(/!/g) || []).length;
      if (exclamationCount > 2) {
        assistantReply = assistantReply.replace(/!{2,}/g, '!').replace(/!/g, (match, offset, string) => {
          const beforeMatch = string.substring(0, offset).match(/!/g) || [];
          return beforeMatch.length < 2 ? match : '.';
        });
        console.log(`🛡️ [${requestId}] SASCHA: Emotional range limited (ER ≤ 4)`);
      }
    }

    // ✨ Enhanced Zeit-basierte Grußformel
    const hour = new Date(currentTime).getHours();
    if (!assistantReply.match(/(moin|guten morgen|guten tag|guten abend|hallo|hi)/i)) {
      let greeting = '';
      if (coachPersonality === 'sascha') {
        greeting = hour < 11 ? 'Moin' : hour < 17 ? 'Guten Tag' : hour < 22 ? 'Guten Abend' : 'Später Abend';
      } else {
        greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
      }
      assistantReply = `${greeting}! ${assistantReply}`;
      console.log(`🕒 [${requestId}] Added ${coachPersonality}-specific greeting: ${greeting}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] OpenAI response received, length:`, assistantReply.length, 'time:', processingTime + 'ms');
    console.log(`🔢 [${requestId}] Token usage:`, openAIData.usage);

    // Speichere Conversation in Datenbank
    await saveConversation(supabase, userId, message, assistantReply, coachPersonality, images, toolContext);

    // Update Memory nach dem Chat
    await updateMemoryAfterChat(supabase, userId, message, assistantReply, toolContext?.data?.profileData, coachPersonality);

    console.log(`💾 [${requestId}] Conversation saved and memory updated`);

    // Return response mit erweiterten Meta-Informationen
    return new Response(JSON.stringify({
      role: 'assistant',
      content: assistantReply,
      usage: openAIData.usage,
      context_info: {
        request_id: requestId,
        prompt_version: PROMPT_VERSION,
        xl_summaries_used: smartContext.xlSummaries?.length || 0,
        relevant_data_types: relevantDataTypes,
        estimated_tokens: estimateTokenCount(systemPrompt),
        model_used: selectedModel,
        handover_created: shouldHandover,
        processing_time_ms: Date.now() - startTime,
        i18n_applied: isNonGerman
      },
      meta: { 
        prompt_version: PROMPT_VERSION,
        clearTool: !!toolContext
      },
      // Unified toolSuggestion in root level only
      toolSuggestion: (req as any).toolSuggestion || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Unified Coach Engine error after ${errorTime}ms:`, error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      request_id: requestId,
      processing_time_ms: errorTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function detectRelevantData(text: string): string[] {
  const relevantTypes: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [keywords, dataTypes] of Object.entries(RELEVANCE_MAPPING)) {
    const keywordRegex = new RegExp(keywords, 'i');
    if (keywordRegex.test(lowerText)) {
      relevantTypes.push(...dataTypes);
    }
  }
  
  // Entferne Duplikate
  return [...new Set(relevantTypes)];
}

async function buildSmartContextXL(supabase: any, userId: string, relevantDataTypes: string[], liteCtx: boolean = false) {
  console.log('🔍 Building Smart Context XL for user:', userId, 'Lite mode:', liteCtx);
  
  // LITE MODE: Only essential data
  if (liteCtx) {
    try {
      const [fastMealData, fastVolumeData, fastFluidData, profileResult] = await Promise.all([
        supabase.rpc('fast_meal_totals', { p_user: userId, p_d: new Date().toISOString().split('T')[0] }),
        supabase.rpc('fast_sets_volume', { p_user: userId, p_d: new Date().toISOString().split('T')[0] }),
        supabase.rpc('fast_fluid_totals', { p_user: userId, p_d: new Date().toISOString().split('T')[0] }),
        supabase.from('profiles')
          .select('preferred_name, first_name, display_name, age, gender, height_cm')
          .eq('id', userId)
          .maybeSingle()
      ]);

      console.log('⚡ LITE MODE: Fast data collected');
      
      return {
        profile: profileResult.data ?? null,
        fastMealTotals: fastMealData.data ?? null,
        fastWorkoutVolume: fastVolumeData.data ?? 0,
        fastFluidTotal: fastFluidData.data ?? 0,
        memory: null,
        xlSummaries: [],
        summaries: [],
        relevantData: {},
        goals: null
      };
    } catch (error) {
      console.error('❌ LITE MODE data collection failed:', error);
      return {
        profile: null,
        fastMealTotals: null,
        fastWorkoutVolume: 0,
        fastFluidTotal: 0,
        memory: null,
        xlSummaries: [],
        summaries: [],
        relevantData: {},
        goals: null
      };
    }
  }
  
  // FULL MODE: Original logic
  const context: any = {
    profile: null,
    memory: null,
    xlSummaries: [],
    summaries: [],
    relevantData: {},
    goals: null
  };

  try {
    // Load user profile (FIX: use maybeSingle and add error handling)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) console.warn('⚠️ Profile load error:', profileError.message);
    
    // Calculate BMR if profile exists
    if (profile) {
      profile.bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
    }
    
    context.profile = profile;
    console.log('📊 Profile loaded:', !!profile);

    // Load coach memory
    const { data: memory, error: memoryError } = await supabase
      .from('coach_memory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (memoryError) console.warn('⚠️ Memory load error:', memoryError.message);
    context.memory = memory;
    console.log('🧠 Memory loaded:', !!memory);

    // Load goals
    const { data: goals, error: goalsError } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (goalsError) console.warn('⚠️ Goals load error:', goalsError.message);
    context.goals = goals;
    console.log('🎯 Goals loaded:', !!goals);

    // Load XL-Summaries (letzte 7 Tage) + STRUCTURED JSON DATA
    const { data: xlSummaries } = await supabase
      .from('daily_summaries')
      .select('date, summary_xl_md, summary_struct_json, total_calories, total_protein, workout_volume')
      .eq('user_id', userId)
      .not('summary_xl_md', 'is', null)
      .order('date', { ascending: false })
      .limit(7);
    context.xlSummaries = xlSummaries || [];
    
    // Load STRUCTURED SUMMARIES if available (NEW: for detailed data access)
    const { data: structuredSummaries } = await supabase
      .from('daily_summaries')
      .select('date, summary_struct_json')
      .eq('user_id', userId)
      .not('summary_struct_json', 'is', null)
      .order('date', { ascending: false })
      .limit(7);
    context.structuredSummaries = structuredSummaries || [];

    // History-Snapshots (bis 30 Tage) - Phase 2-b Context Loading
    const { data: history } = await supabase
      .rpc('get_summary_range', { p_user: userId, p_days: 30 });
    context.summaryHistory = history || [];

    // Load regular summaries if XL not available (fallback)
    if (context.xlSummaries.length < 3) {
      const { data: summaries } = await supabase
        .from('daily_summaries')
        .select('date, summary_md, total_calories, total_protein, workout_volume')
        .eq('user_id', userId)
        .not('summary_md', 'is', null)
        .order('date', { ascending: false })
        .limit(5);
      context.summaries = summaries || [];
    }

    // Load conversation summaries
    const { data: conversationSummaries } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    context.conversationSummaries = conversationSummaries || [];

    // Load relevante Daten basierend auf detected types
    for (const dataType of relevantDataTypes) {
      try {
        switch (dataType) {
          case 'weight_history':
            const { data: weights, error: weightsError } = await supabase
              .from('weight_history')
              .select('date, weight, body_fat_percentage, muscle_percentage, visceral_fat, body_water_percentage')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(10);
            if (weightsError) console.warn(`⚠️ Weight history load error:`, weightsError.message);
            context.relevantData.weight_history = weights;
            console.log('⚖️ Weight history loaded:', weights?.length || 0, 'entries');
            break;

          case 'meals':
            // Timezone-robuste Mahlzeit-Abfrage (erweitere Zeitfenster)
            const mealCutoff = new Date();
            mealCutoff.setDate(mealCutoff.getDate() - 5); // 5 Tage statt 3 für Timezone-Puffer
            
            const { data: meals, error: mealsError } = await supabase
              .from('meals')
              .select('created_at, text, calories, protein, carbs, fats, meal_type')
              .eq('user_id', userId)
              .gte('created_at', mealCutoff.toISOString())
              .order('created_at', { ascending: false })
              .limit(30); // Erweiterte Anzahl für bessere Filterung
            if (mealsError) console.warn(`⚠️ Meals load error:`, mealsError.message);
            
            // Clientseitige Filterung auf die letzten 3 Tage basierend auf echter Zeit
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
            const recentMeals = (meals || []).filter(meal => {
              const mealDate = new Date(meal.created_at);
              return mealDate >= threeDaysAgo;
            });
            
            context.relevantData.meals = recentMeals;
            console.log('🍽️ Meals loaded (timezone-safe):', recentMeals?.length || 0, 'recent entries from', threeDaysAgo.toISOString());
            break;
            console.log('🍽️ Meals loaded:', meals?.length || 0, 'entries');
            break;

          case 'exercise_sessions':
            const { data: workouts, error: workoutsError } = await supabase
              .from('exercise_sessions')
              .select('date, session_name, duration_minutes, overall_rpe, workout_type')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(10);
            if (workoutsError) console.warn(`⚠️ Exercise sessions load error:`, workoutsError.message);
            context.relevantData.exercise_sessions = workouts;
            console.log('💪 Exercise sessions loaded:', workouts?.length || 0, 'entries');
            break;

          case 'body_measurements':
            const { data: measurements, error: measurementsError } = await supabase
              .from('body_measurements')
              .select('date, waist, chest, arms, hips')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(5);
            if (measurementsError) console.warn(`⚠️ Body measurements load error:`, measurementsError.message);
            context.relevantData.body_measurements = measurements;
            console.log('📏 Body measurements loaded:', measurements?.length || 0, 'entries');
            break;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load ${dataType}:`, error.message);
      }
    }

    console.log('📊 Smart Context XL built:', {
      profileLoaded: !!context.profile,
      memoryLoaded: !!context.memory,
      xlSummaryDays: context.xlSummaries?.length || 0,
      structuredSummaryDays: context.structuredSummaries?.length || 0,
      regularSummaryDays: context.summaries?.length || 0,
      relevantDataLoaded: Object.keys(context.relevantData).length
    });
    console.log('✅ Smart Context XL built successfully');
    return context;

  } catch (error) {
    console.error('❌ Error building Smart Context XL:', error);
    return context;
  }
}

async function createXLSystemPrompt(context: any, coachPersonality: string, relevantDataTypes: string[], toolContext: any, isNonGerman: boolean = false, liteCtx: boolean = false, timezone: string = 'Europe/Berlin', currentTime: string = new Date().toISOString()) {
  const coach = COACH_PERSONALITIES[coachPersonality] || COACH_PERSONALITIES.lucy;
  
  // SASCHA'S PERSONALITY GUARDS: Load from coach-personas.json if available
  let personalityGuards = '';
  if (coachPersonality === 'sascha') {
    // Apply emotional range guard
    personalityGuards += `\n🛡️ PERSONALITY GUARDS für SASCHA:\n`;
    personalityGuards += `• Emotional Range: Baseline=2 (ruhig/professionell), Maximum=4 (nur bei Meilensteinen)\n`;
    personalityGuards += `• NIEMALS: Wunderpillen, Crash-Diäten, Selbstmitleid ohne Lösungswille\n`;
    personalityGuards += `• Militär-Anekdoten: Nur bei erwachsenen Usern (>30 J.)\n`;
    personalityGuards += `• ANTI-KI: Keine nummerierten Listen, keine kategorisierten Labels\n\n`;
  }
  
  // PHASE 3: Dynamic Prompt Building - Assess available context quality
  const contextQuality = assessContextQuality(context, toolContext);
  console.log(`🔍 Context quality assessment:`, contextQuality);
  
  // PHASE 3: Adaptive prompt sections based on available data
  const promptSections = buildAdaptivePromptSections(context, toolContext, contextQuality);
  console.log(`📝 Built ${promptSections.length} adaptive prompt sections`);
  
  // ✨ ENHANCED Zeit-Kontext für SASCHA mit regionalem Flair
  const now = new Date(currentTime);
  const timeOptions: Intl.DateTimeFormatOptions = { 
    timeZone: timezone, 
    weekday: 'long', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  const localTime = now.toLocaleString('de-DE', timeOptions);
  const hour = now.getHours();
  
  // SASCHA-spezifische Zeit-basierte Grußformeln mit Nord-Flair
  let greeting = '';
  let timeContext = '';
  if (coachPersonality === 'sascha') {
    if (hour >= 5 && hour < 11) {
      greeting = 'Moin';
      timeContext = 'Vormittag am Küstenland - Zeit für Training oder klare Ziele setzen';
    } else if (hour >= 11 && hour < 17) {
      greeting = 'Hey';
      timeContext = 'Mittag/Nachmittag - perfekte Zeit für intensives Training';
    } else if (hour >= 17 && hour < 22) {
      greeting = 'Guten Abend';
      timeContext = 'Abend - Training abschließen oder Regeneration einleiten';
    } else {
      greeting = 'Später Abend';
      timeContext = 'Zeit zum Runterfahren - morgen wird wieder angepackt, passt';
    }
  } else {
    greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
    timeContext = hour > 22 ? 'Späte Abendstunden - Fokus auf Regeneration/Schlaf' : 
                        hour < 11 ? 'Vormittag - motiviere für aktiven Tagesstart' :
                        hour < 18 ? 'Tageszeit - ideal für Training/Ernährung' : 
                        'Abendzeit - Training oder Entspannung';
  }
  
  let timeAwarenessPrompt = `\n🕒 LOCAL_TIME: ${localTime}\n- Standard-Grußformel: "${greeting}"\n- Kontext-Hinweis: ${timeContext}\n\nBerücksichtige die Tageszeit bei deinen Antworten und Vorschlägen.\n\n`;
  
  // PHASE 3: Dynamic prompt building based on context quality
  let dynamicPrompt = coach.basePrompt;
  
  // Enhance base prompt with context-specific instructions
  if (contextQuality.hasRichNutritionData) {
    dynamicPrompt += '\n\n🍽️ ERNÄHRUNGS-EXPERTISE: Du hast Zugriff auf detaillierte Ernährungsdaten. Nutze diese für präzise, personalisierte Beratung.';
  }
  
  if (contextQuality.hasTrainingHistory) {
    dynamicPrompt += '\n\n💪 TRAININGS-INTELLIGENZ: Umfangreiche Trainingsdaten verfügbar. Erstelle evidenzbasierte, progressive Trainingspläne.';
  }
  
  if (contextQuality.hasRAGKnowledge) {
    dynamicPrompt += '\n\n🧠 WISSENSCHAFTLICHER ZUGANG: Aktuelle Forschungsergebnisse verfügbar. Integriere wissenschaftliche Erkenntnisse in deine Beratung.';
  }
  
  if (contextQuality.isDataSparse) {
    dynamicPrompt += '\n\n📊 DATENSAMMLUNG: Wenig Nutzerdaten vorhanden. Fokussiere auf Datenerfassung und grundlegende Beratung.';
  }
  
  // ⏱️ Kontext aus letzten Aktivitäten hinzufügen
  let activityContext = '';
  if (toolContext?.data?.workoutData?.length > 0) {
    const lastWorkout = toolContext.data.workoutData.slice(-1)[0];
    const workoutAge = lastWorkout?.date ? calculateTimeSince(lastWorkout.date) : 'unbekannt';
    activityContext += `⏱️ LETZTES TRAINING: ${workoutAge}\n`;
  }
  if (toolContext?.data?.sleepData?.length > 0) {
    const lastSleep = toolContext.data.sleepData.slice(-1)[0];
    const sleepQuality = lastSleep?.sleep_quality || 'unbekannt';
    activityContext += `💤 LETZTER SCHLAF: Qualität ${sleepQuality}/10\n`;
  }
  if (activityContext) {
    timeAwarenessPrompt += activityContext + '\n';
  }
  
    // LITE MODE: Minimal prompt + toolContext injection
    if (liteCtx) {
      // PHASE 3: Even in lite mode, use dynamic sections for better performance
      let litePrompt = dynamicPrompt + '\n\n';
      
      // PHASE 3: Compressed context injection for lite mode
      if (toolContext?.data) {
        const { profileData, todaysTotals, dailyGoals, summary } = toolContext.data;
        
        if (profileData) {
          const displayName = getDisplayName(profileData);
          litePrompt += `👤 USER: ${displayName}\n`;
          if (profileData.age) litePrompt += `Alter: ${profileData.age}\n`;
        }
        
        // PHASE 3: Smart data prioritization in lite mode
        if (todaysTotals) {
          litePrompt += `\nHEUTE (optimiert):\n`;
          litePrompt += `🍽️ ${todaysTotals.calories || 0}kcal (${todaysTotals.count || 0} Mahlzeiten)\n`;
          litePrompt += `💪 ${todaysTotals.protein || 0}g Protein\n`;
          if (todaysTotals.fluids) litePrompt += `💧 ${todaysTotals.fluids}ml\n`;
        }
        
        if (summary?.structured?.training?.total_volume > 0) {
          litePrompt += `🏋️ Training: ${summary.structured.training.total_volume}kg Volumen\n`;
        }
        
        if (dailyGoals) {
          litePrompt += `\nZIELE:\n`;
          if (dailyGoals.calories) litePrompt += `🎯 Kalorien-Ziel: ${dailyGoals.calories}\n`;
          if (dailyGoals.protein) litePrompt += `🎯 Protein-Ziel: ${dailyGoals.protein}g\n`;
        }
      } else {
        // Fallback to existing context
        if (context.profile) {
          const displayName = getDisplayName(context.profile);
          litePrompt += `👤 USER: ${displayName}\n`;
          if (context.profile.age) litePrompt += `Alter: ${context.profile.age}\n`;
        }
        
        if (context.fastMealTotals) {
          litePrompt += `\nHEUTE BISHER:\n`;
          litePrompt += `🍽️ Kalorien: ${context.fastMealTotals.calories || 0}\n`;
          litePrompt += `💪 Protein: ${context.fastMealTotals.protein || 0}g\n`;
        }
        
        if (context.fastWorkoutVolume > 0) {
          litePrompt += `🏋️ Training: ${context.fastWorkoutVolume}kg Volumen\n`;
        }
      }
    
    if (context.fastFluidTotal > 0) {
      litePrompt += `💧 Flüssigkeit: ${context.fastFluidTotal}ml\n`;
    }
    
    litePrompt += `\nBitte antworte kurz und motivierend basierend auf diesen Grunddaten.`;
    console.log('⚡ LITE MODE: Minimal prompt created (~200 tokens)');
    return litePrompt;
  }
  
  // FULL MODE: Enhanced with toolContext injection + Zeit-Awareness + Personality Guards
  let prompt = coach.basePrompt + personalityGuards + timeAwarenessPrompt;
  
  // ============================================================================
  // PHASE C: I18N-GUARD - Internationalisierung
  // ============================================================================
  if (isNonGerman) {
    prompt = `LANG:EN - Please respond in English unless specifically asked otherwise.\n\n` + prompt;
  }
  
  // TOOLCONTEXT INJECTION: Add structured data at the top (Full Mode)
  if (toolContext?.data) {
    const { 
      profileData, todaysTotals, workoutData, sleepData, weightHistory, dailyGoals,
      todaysMeals, todaysSupplements, todaysSleep, todaysFluids, todaysQuickWorkout,
      bodyMeasurements, progressPhotos, contextTokens, userMemorySummary, averages,
      summaryHistory, requestTime, userTimezone
    } = toolContext.data;
    
    // DEBUG LOGGING: Enhanced data visibility
    console.log(`🎯 [SASCHA-DEBUG] Enhanced Context Data Available:`, {
      hasProfileData: !!profileData,
      hasTodaysTotals: !!todaysTotals,
      hasWorkoutData: !!workoutData && workoutData.length > 0,
      hasSleepData: !!sleepData,
      hasWeightHistory: !!weightHistory && weightHistory.length > 0,
      hasBodyMeasurements: !!bodyMeasurements && bodyMeasurements.length > 0,
      hasSummaryHistory: !!summaryHistory && summaryHistory.length > 0,
      hasContextTokens: !!contextTokens,
      hasUserMemory: !!userMemorySummary,
      requestTime: requestTime || new Date().toISOString()
    });
    
    // SASCHA-ENHANCED: Structured Data Blocks for superior analysis
    if (coachPersonality === 'sascha') {
      prompt += `🧠 STRUCTURED DATA ANALYSIS für SASCHA:\n`;
      prompt += `⏰ Request-Zeit: ${requestTime || new Date().toISOString()} (${userTimezone || 'Europe/Berlin'})\n\n`;
      
      // ### USER_PROFILE Block
      if (profileData || contextTokens) {
        prompt += `### 🗂️ USER_PROFILE\n`;
        if (contextTokens?.userName) prompt += `Name: ${contextTokens.userName}\n`;
        if (profileData?.age) prompt += `Alter: ${profileData.age} Jahre\n`;
        if (profileData?.weight) prompt += `Gewicht: ${profileData.weight} kg\n`;
        if (profileData?.height) prompt += `Größe: ${profileData.height} cm\n`;
        if (profileData?.fitness_level) prompt += `Level: ${profileData.fitness_level}\n`;
        prompt += `\n`;
      }
      
      // ### MEAL_LOG Block (letzte 3 Tage)
      if (todaysTotals) {
        prompt += `### 🍽️ MEAL_LOG (heute)\n`;
        prompt += `Kalorien: ${todaysTotals.calories || 0} kcal\n`;
        prompt += `Protein: ${todaysTotals.protein || 0}g\n`;
        prompt += `Kohlenhydrate: ${todaysTotals.carbs || 0}g\n`;
        prompt += `Fett: ${todaysTotals.fats || 0}g\n`;
        prompt += `Mahlzeiten: ${todaysTotals.count || 0}\n\n`;
      }
      
      // ### RECOVERY Block
      if (todaysSleep || contextTokens?.sleepHours) {
        prompt += `### 💤 RECOVERY\n`;
        const sleepHours = todaysSleep?.sleep_hours || contextTokens?.sleepHours || 'N/A';
        const sleepQuality = todaysSleep?.sleep_quality || 'N/A';
        prompt += `Schlaf letzte Nacht: ${sleepHours} h (Qualität: ${sleepQuality}/10)\n`;
        
        // SASCHA'S INTELLIGENCE: Sleep alert
        if (typeof sleepHours === 'number' && sleepHours < 7) {
          prompt += `⚠️ SCHLAF-ALERT: < 7h - Recovery-Fokus empfohlen\n`;
        }
        prompt += `\n`;
      }
    } else {
      // Standard format for other coaches
      prompt += `🧠 COMPREHENSIVE USER DATA (Enhanced for ${coachPersonality?.toUpperCase()} Analysis):\n`;
      prompt += `⏰ Anfrage-Zeit: ${requestTime || new Date().toISOString()} (${userTimezone || 'Europe/Berlin'})\n\n`;
      
      // ENHANCED: User Context from tokens
      if (contextTokens) {
        prompt += `🎯 BENUTZER-KONTEXT:\n`;
        prompt += `• Name: ${contextTokens.userName || 'Nicht verfügbar'}\n`;
        prompt += `• Tageszeit: ${contextTokens.timeOfDay || 'Tag'}\n`;
        prompt += `• Letzte Aktivität: ${contextTokens.lastWorkout || 'Keine Daten'}\n`;
        prompt += `• Schlaf letzte Nacht: ${contextTokens.sleepHours || 'Keine Daten'} Stunden\n`;
        prompt += `• Kalorien übrig heute: ${contextTokens.calLeft || 'Berechnung nicht möglich'}\n`;
        prompt += `• Letztes Krafttraining: ${contextTokens.lastLift || 'Keine Daten'}\n\n`;
      }
    }
    
    if (todaysTotals) {
      prompt += `📊 HEUTIGE ERNÄHRUNG:\n`;
      prompt += `• Kalorien: ${todaysTotals.calories || 0} kcal\n`;
      prompt += `• Protein: ${todaysTotals.protein || 0}g\n`;
      prompt += `• Kohlenhydrate: ${todaysTotals.carbs || 0}g\n`;
      prompt += `• Fett: ${todaysTotals.fats || 0}g\n`;
      prompt += `• Mahlzeiten: ${todaysTotals.count || 0}\n\n`;
    } else if (todaysMeals && todaysMeals.length > 0) {
      // Fallback: Calculate from meals array
      const calories = todaysMeals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
      const protein = todaysMeals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0);
      prompt += `📊 HEUTIGE ERNÄHRUNG (berechnet):\n`;
      prompt += `• Kalorien: ${calories} kcal\n`;
      prompt += `• Protein: ${protein}g\n`;
      prompt += `• Mahlzeiten: ${todaysMeals.length}\n\n`;
    }
    
    // ENHANCED: Recent performance data
    if (summaryHistory && summaryHistory.length > 0) {
      prompt += `📈 VERLAUF (letzte ${summaryHistory.length} Tage):\n`;
      const recentDays = summaryHistory.slice(0, 5);
      recentDays.forEach((day: any, i: number) => {
        prompt += `• ${day.date}: ${day.kcal || 0}kcal, ${day.volume_kg || 0}kg Volumen, Schlaf: ${day.sleep_hours || 'N/A'}h\n`;
      });
      
      // SASCHA'S ENHANCED INTELLIGENCE: Training context for smart suggestions
      const trainingDays = recentDays.filter((day: any) => day.volume_kg > 0);
      const totalVolume = recentDays.reduce((sum: number, day: any) => sum + (day.volume_kg || 0), 0);
      
      if (coachPersonality === 'sascha') {
        prompt += `\n### 🏋️ LAST_7_WORKOUTS\n`;
        recentDays.slice(0, 7).forEach((day: any, i: number) => {
          if (day.volume_kg > 0) {
            prompt += `${day.date}: ${day.volume_kg}kg Volumen\n`;
          }
        });
        
        prompt += `\n🧠 SASCHA'S TRAINING ANALYSIS:\n`;
        prompt += `• Trainingstage: ${trainingDays.length}/7\n`;
        prompt += `• Gesamtvolumen: ${totalVolume}kg\n`;
        prompt += `• Ø Volumen/Session: ${trainingDays.length > 0 ? Math.round(totalVolume / trainingDays.length) : 0}kg\n`;
        
        // Context-aware tool suggestions based on actual thresholds
        if (trainingDays.length >= 3 && totalVolume >= 5000) {
          prompt += `• STATUS: ✅ Genug Daten für intelligente Trainingsplan-Erstellung\n`;
          prompt += `• TOOL-BERECHTIGUNG: Kann "Trainingsplan erstellen" vorschlagen\n`;
        } else {
          prompt += `• STATUS: ⚠️ Zu wenig Daten (brauche ≥3 Sessions + ≥5000kg)\n`;
          prompt += `• AKTION: Erst mehr Kontext sammeln, bevor Tools vorgeschlagen werden\n`;
        }
        
        // Protein analysis for Sascha
        if (todaysTotals?.protein && profileData?.weight) {
          const proteinPerKg = (todaysTotals.protein / profileData.weight).toFixed(1);
          prompt += `• PROTEIN-ANALYSE: ${proteinPerKg}g/kg heute`;
          if (parseFloat(proteinPerKg) < 1.6) {
            prompt += ` ⚠️ PROTEIN-ALERT: < 1.6g/kg - suboptimal für Regeneration`;
          }
          prompt += `\n`;
        }
        prompt += `\n`;
      } else {
        // Standard format for other coaches
        if (trainingDays.length >= 3 || totalVolume >= 5000) {
          prompt += `\n🏋️ TRAININGSKONTEXT:\n`;
          prompt += `• Trainingstage letzte Woche: ${trainingDays.length}\n`;
          prompt += `• Gesamtvolumen: ${totalVolume}kg\n`;
          prompt += `• Durchschnittsvolumen pro Session: ${trainingDays.length > 0 ? Math.round(totalVolume / trainingDays.length) : 0}kg\n`;
        }
        prompt += `\n`;
      }
    }
    
    // ENHANCED: Body measurements if available  
    if (bodyMeasurements && bodyMeasurements.length > 0) {
      const latest = bodyMeasurements[0];
      prompt += `📏 KÖRPERMESSUNGEN (neueste):\n`;
      if (latest.waist) prompt += `• Taille: ${latest.waist}cm\n`;
      if (latest.chest) prompt += `• Brust: ${latest.chest}cm\n`;
      if (latest.arms) prompt += `• Arme: ${latest.arms}cm\n`;
      if (latest.thigh) prompt += `• Oberschenkel: ${latest.thigh}cm\n`;
      prompt += `• Datum: ${latest.date}\n\n`;
    }
    
    // ENHANCED: User memory summary for personalization
    if (userMemorySummary) {
      prompt += `🧠 BENUTZER-GEDÄCHTNIS:\n`;
      prompt += `• Vertrauenslevel: ${userMemorySummary.trustLevel || 'Neu'}\n`;
      prompt += `• Beziehungsstadium: ${userMemorySummary.relationshipStage || 'Aufbau'}\n`;
      if (userMemorySummary.recentMoods && userMemorySummary.recentMoods.length > 0) {
        prompt += `• Stimmung: ${userMemorySummary.recentMoods.slice(0, 3).join(', ')}\n`;
      }
      if (userMemorySummary.preferences && Object.keys(userMemorySummary.preferences).length > 0) {
        prompt += `• Präferenzen: ${JSON.stringify(userMemorySummary.preferences).slice(0, 100)}\n`;
      }
      prompt += `\n`;
    }
    
    // ➍ QUICK-INPUT PROMPT-INJECTION
    if (todaysSupplements && todaysSupplements.length > 0) {
      const taken = todaysSupplements.filter((s: any) => s.taken).length;
      prompt += `💊 Supplements: ${taken}/${todaysSupplements.length} genommen\n`;
    }
    
    if (todaysFluids && todaysFluids.length > 0) {
      const ml = todaysFluids.reduce((sum: number, f: any) => sum + (f.amount_ml || 0), 0);
      prompt += `💧 Flüssigkeit: ${ml} ml\n`;
    }
    
    if (todaysSleep) {
      prompt += `😴 Schlaf letzte Nacht: ${todaysSleep.sleep_hours || 'N/A'} h (Qualität ${todaysSleep.sleep_quality || 'N/A'}/10)\n`;
    }
    
    if (todaysQuickWorkout) {
      prompt += `🚶 Schritte/Laufen heute: ${todaysQuickWorkout.steps || 0} Stk, ${todaysQuickWorkout.distance_km || 0} km\n`;
    }
    
    prompt += '\n';
    
    if (workoutData && workoutData.length > 0) {
      prompt += `💪 HEUTIGES TRAINING:\n`;
      workoutData.forEach((workout: any) => {
        prompt += `• ${workout.exercise_name}: ${workout.sets}x${workout.reps} @ ${workout.weight_kg}kg\n`;
      });
      prompt += '\n';
    }
    
    if (sleepData) {
      prompt += `😴 SCHLAF: ${sleepData.hours_slept || 'N/A'} Stunden (Qualität: ${sleepData.quality || 'N/A'})\n\n`;
    }
    
    if (dailyGoals) {
      prompt += `🎯 TAGESZIELE:\n`;
      prompt += `• Kalorien-Ziel: ${dailyGoals.calories || 'N/A'} kcal\n`;
      prompt += `• Protein-Ziel: ${dailyGoals.protein || 'N/A'}g\n`;
      prompt += `• Kohlenhydrate-Ziel: ${dailyGoals.carbs || 'N/A'}g\n`;
      prompt += `• Fett-Ziel: ${dailyGoals.fats || 'N/A'}g\n\n`;
    }
    
    // Add enhanced weight/progress tracking
    if (weightHistory && weightHistory.length > 0) {
      prompt += `⚖️ GEWICHTSVERLAUF:\n`;
      weightHistory.slice(0, 5).forEach((entry: any) => {
        prompt += `• ${entry.date}: ${entry.weight}kg\n`;
      });
      prompt += `\n`;
    }
    
    // DEBUG LOGGING: Let's see exactly what Sascha receives
    console.log(`🎯 [SASCHA-DEBUG] Context info: 💯 SASCHA'S BERECHNUNG: Heute bereits ${todaysTotals?.calories || 0}kcal von ${dailyGoals?.calories || 'N/A'}kcal gegessen (${todaysTotals?.count || 0} Mahlzeiten). Noch ${(dailyGoals?.calories || 0) - (todaysTotals?.calories || 0)}kcal übrig heute. Noch ${Math.max(0, (dailyGoals?.protein || 0) - (todaysTotals?.protein || 0))}g Protein benötigt. \n📋 Bisherige Mahlzeiten heute: ${todaysMeals ? todaysMeals.slice(0, 3).map((m: any, i: number) => `${i+1}. "${m.description || m.name || 'Unbekannt'}" (${m.calories || 0}kcal)`).join(' ... ') : 'Keine Daten'}\n`);
    
    console.log(`🎯 [SASCHA-DEBUG] Context for feedback: 🕐 Berechnung basiert auf ${userTimezone || 'Europe/Berlin'} Zeitzone, heute: ${new Date().toISOString().split('T')[0]}. 🔍 Gefundene Mahlzeiten: ${todaysTotals?.count || 0} mit insgesamt ${todaysTotals?.calories || 0}kcal. \n`);
    
    // Also include raw data for debugging (truncated for performance)
    const ctxData = JSON.stringify(toolContext.data).slice(0, 2000);
    console.log(`📊 Injected toolContext data: ${ctxData.length} chars`);
  }
  
  // User Profile Section - prefer toolContext data
  const profileData = toolContext?.data?.profileData || context.profile;
  if (profileData) {
    const displayName = getDisplayName(profileData);
    const bmr = profileData.bmr || (profileData.weight && profileData.height && profileData.age 
      ? calculateBMR(profileData.weight, profileData.height, profileData.age, profileData.gender) 
      : null);
    
    prompt += `👤 NUTZER-PROFIL:\n`;
    prompt += `Name: ${displayName}`;
    if (bmr) prompt += ` – BMR: ${bmr} kcal`;
    prompt += `\n`;
    if (profileData.age) prompt += `Alter: ${profileData.age} Jahre\n`;
    if (profileData.height) prompt += `Größe: ${profileData.height} cm\n`;
    if (profileData.weight) prompt += `Gewicht: ${profileData.weight} kg\n`;
    if (profileData.fitness_level) prompt += `Fitness-Level: ${profileData.fitness_level}\n`;
    prompt += '\n';
  } else {
    prompt += `⚠️ Profil nicht geladen – rufe get_user_profile() bei Bedarf\n\n`;
  }

  // PHASE 2: Proactive Tool Suggestions based on User Analytics
  if (toolContext?.userAnalytics) {
    const analytics = toolContext.userAnalytics;
    prompt += `🤖 PROAKTIVE TOOL-EMPFEHLUNGEN:\n`;
    
    if (!analytics.hasTrainingData) {
      prompt += `• USER hat noch KEINE Trainingsdaten → Vorschlagen: Erstes Workout erfassen oder Trainingsplan erstellen\n`;
    } else if (analytics.hasTrainingData) {
      prompt += `• USER hat Trainingsdaten → Kann intelligente Trainingspläne vorschlagen\n`;
    }
    
    if (!analytics.hasNutritionData) {
      prompt += `• USER hat wenig Ernährungsdaten → Vorschlagen: Mahlzeiten tracken für bessere Beratung\n`;
    }
    
    // Check for RAG opportunities
    if (global.lastRAGResults && global.lastRAGResults.results.length > 0) {
      prompt += `• Verfügbares Fachwissen aus letzter Suche → Kann wissenschaftlich fundierte Empfehlungen geben\n`;
    }
    
    prompt += `\n`;
  }

  // Goals Section
  if (context.goals) {
    prompt += `🎯 AKTUELLE ZIELE:\n`;
    if (context.goals.calories) prompt += `Kalorien: ${context.goals.calories} kcal/Tag\n`;
    if (context.goals.protein) prompt += `Protein: ${context.goals.protein}g/Tag\n`;
    if (context.goals.calorie_deficit) prompt += `Kaloriendefizit: ${context.goals.calorie_deficit} kcal\n`;
    prompt += '\n';
  }

  // STRUCTURED DATA SECTION - NEW: Detailed JSON data access
  if (context.structuredSummaries && context.structuredSummaries.length > 0) {
    prompt += `📊 STRUKTURIERTE TAGESDATEN (Profil, Supplements, Coach-Topics, Activity):\n`;
    context.structuredSummaries.forEach((summary: any) => {
      if (summary.summary_struct_json) {
        const structData = summary.summary_struct_json;
        prompt += `\n=== ${summary.date} ===\n`;
        
        // Profile data
        if (structData.user_profile) {
          const profile = structData.user_profile;
          prompt += `👤 Profil: ${profile.name || 'N/A'}, ${profile.age || 'N/A'}J, Ziel: ${profile.goal || 'N/A'}\n`;
          if (profile.target_weight) prompt += `   Zielgewicht: ${profile.target_weight}kg\n`;
        }
        
        // Coaching topics
        if (structData.coaching && structData.coaching.topics && structData.coaching.topics.length > 0) {
          prompt += `💭 Gesprächsthemen: ${structData.coaching.topics.join(', ')}\n`;
          prompt += `   Stimmung: ${structData.coaching.sentiment}, Motivation: ${structData.coaching.motivation_level}\n`;
        }
        
        // Activity data
        if (structData.activity || structData.nutrition) {
          if (structData.activity) {
            prompt += `🏃 Aktivität: ${structData.activity.steps || 0} Schritte, ${structData.activity.distance_km || 0}km\n`;
          }
          if (structData.nutrition) {
            prompt += `🍽️ Ernährung: ${structData.nutrition.calories || 0} kcal, ${structData.nutrition.protein || 0}g Protein\n`;
          }
        }
        
        // Supplements
        if (structData.supplements && structData.supplements.compliance !== undefined) {
          prompt += `💊 Supplement-Compliance: ${structData.supplements.compliance}%\n`;
        }
      }
    });
    prompt += '\n';
  }

  // Phase 2-c: Prompt-Injection für Trends (aus History-Snapshots)
  if (context.summaryHistory && context.summaryHistory.length > 0) {
    const hist = context.summaryHistory.slice(0, 14); // letzte 14 Tage
    const avgKcal = Math.round(hist.reduce((s: number, d: any) => s + (d.kcal || 0), 0) / hist.length);
    const volSum = hist.reduce((s: number, d: any) => s + (d.volume_kg || 0), 0);
    prompt += `📊 14-Tage-Durchschnitt: ${avgKcal} kcal / ${Math.round(volSum / 14)} kg Volumen pro Tag\n`;
  }

  // XL Memory Section - Detailed Daily Summaries (FALLBACK for text summaries)
  if (context.xlSummaries && context.xlSummaries.length > 0) {
    prompt += `📈 DETAILLIERTE VERLAUFSDATEN (XL-Memory):\n`;
    context.xlSummaries.forEach((summary: any) => {
      prompt += `${summary.date}: ${summary.summary_xl_md}\n`;
    });
    prompt += '\n';
  } else if (context.summaries && context.summaries.length > 0) {
    prompt += `📊 VERLAUFSDATEN:\n`;
    context.summaries.forEach((summary: any) => {
      prompt += `${summary.date}: ${summary.summary_md}\n`;
    });
    prompt += '\n';
  }

  // NEW: Rolling Conversation Memory Integration
  const memoryContext = await edgeMemoryManager.getConversationContext(
    userId, 
    coachPersonality || 'default', 
    supabase
  );
  
  if (memoryContext.messageCount > 0) {
    prompt += `🧠 GESPRÄCHS-GEDÄCHTNIS:\n`;
    prompt += `Gespräche gesamt: ${memoryContext.messageCount} Nachrichten\n`;
    
    if (memoryContext.historicalSummary) {
      prompt += `Verlaufs-Zusammenfassung:\n${memoryContext.historicalSummary}\n\n`;
    }
    
    if (memoryContext.recentMessages.length > 0) {
      prompt += `Letzte Nachrichten:\n`;
      memoryContext.recentMessages.slice(-4).forEach((msg: any) => {
        const role = msg.role === 'user' ? 'User' : 'Coach';
        const content = msg.content.length > 150 
          ? msg.content.substring(0, 150) + '...' 
          : msg.content;
        prompt += `${role}: ${content}\n`;
      });
    }
    prompt += '\n';
  }

  // Legacy Memory (keep for compatibility)
  if (context.memory && context.memory.memory_data) {
    const memoryData = context.memory.memory_data;
    prompt += `🧠 PERSÖNLICHES GEDÄCHTNIS:\n`;
    
    if (memoryData.relationship_stage) {
      prompt += `Beziehungsstand: ${memoryData.relationship_stage}\n`;
    }
    
    if (memoryData.preferences && Object.keys(memoryData.preferences).length > 0) {
      prompt += `Präferenzen: ${JSON.stringify(memoryData.preferences)}\n`;
    }
    
    if (memoryData.recent_moods && memoryData.recent_moods.length > 0) {
      prompt += `Letzte Stimmungen: ${memoryData.recent_moods.slice(-3).map((m: any) => m.mood).join(', ')}\n`;
    }
    
    if (memoryData.successes && memoryData.successes.length > 0) {
      prompt += `Erfolge: ${memoryData.successes.slice(-2).map((s: any) => s.achievement).join(', ')}\n`;
    }
    prompt += '\n';
  }

  // ============================================================================
  // DEBUG: DATEN-VERFÜGBARKEIT (immer anzeigen!)
  // ============================================================================
  prompt += `🔍 DEBUG - DATENVERFÜGBARKEIT:\n`;
  prompt += `Profile: ${context.profile ? '✅ verfügbar' : '❌ nicht verfügbar'}\n`;
  prompt += `Ziele: ${context.goals ? '✅ verfügbar' : '❌ nicht verfügbar'}\n`;
  prompt += `Memory: ${context.memory ? '✅ verfügbar' : '❌ nicht verfügbar'}\n`;
  prompt += `Relevante Daten: ${context.relevantData && Object.keys(context.relevantData).length > 0 ? `✅ ${Object.keys(context.relevantData).length} Kategorien` : '❌ keine Daten'}\n`;
  if (context.relevantData) {
    Object.keys(context.relevantData).forEach(key => {
      const data = context.relevantData[key];
      prompt += `  - ${key}: ${data && data.length ? `${data.length} Einträge` : 'leer'}\n`;
    });
  }
  prompt += '\n';

  // Relevant Data Section
  if (context.relevantData && Object.keys(context.relevantData).length > 0) {
    prompt += `📋 RELEVANTE AKTUELLE DATEN:\n`;
    
    if (context.relevantData.weight_history) {
      const recent = context.relevantData.weight_history.slice(0, 3);
      prompt += `Gewichtsverlauf: ${recent.map((w: any) => `${w.date}: ${w.weight}kg`).join(', ')}\n`;
    }
    
    if (context.relevantData.meals) {
      const today = new Date().toISOString().split('T')[0];
      const todayMeals = context.relevantData.meals.filter((m: any) => m.created_at.startsWith(today));
      if (todayMeals.length > 0) {
        const totalCals = todayMeals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
        const totalProtein = todayMeals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0);
        prompt += `Heute gegessen: ${todayMeals.length} Mahlzeiten, ${Math.round(totalCals)} kcal, ${Math.round(totalProtein)}g Protein\n`;
        prompt += `Letzte Mahlzeiten: ${todayMeals.slice(0, 3).map((m: any) => `"${m.text}" (${m.calories}kcal)`).join(', ')}\n`;
      }
    }
    
    if (context.relevantData.exercise_sessions) {
      const recent = context.relevantData.exercise_sessions.slice(0, 2);
      prompt += `Letzte Workouts: ${recent.map((w: any) => `${w.date}: ${w.session_name || w.workout_type}`).join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Tool Context Integration
  if (toolContext) {
    prompt += `🔧 TOOL-KONTEXT:\n`;
    prompt += `${toolContext.description}\n`;
    if (toolContext.data) {
      // Smart data formatting - truncate large objects but keep structure
      const dataString = JSON.stringify(toolContext.data, null, 2);
      const truncatedData = dataString.length > 1000 
        ? dataString.substring(0, 1000) + '...[truncated]'
        : dataString;
      prompt += `Daten: ${truncatedData}\n`;
    }
    prompt += '\n';
  }

  // Conversation Context
  if (context.conversationSummaries && context.conversationSummaries.length > 0) {
    prompt += `💬 GESPRÄCHSKONTEXT:\n`;
    context.conversationSummaries.forEach((summary: any) => {
      prompt += `${summary.created_at.split('T')[0]}: ${summary.summary_content}\n`;
    });
    prompt += '\n';
  }

  prompt += `=== GENIUS-COACHING-FLOW (einhalten) ===\n`;
  prompt += `1️⃣ ANALYSE – Was sind die aktuellen Daten/Probleme?\n`;
  prompt += `2️⃣ ZIELSETZUNG – Formuliere 1 klaren Tages- oder Wochenfokus.\n`;
  prompt += `3️⃣ PLAN – 2-3 konkrete Handlungen (Tool-Verweis, Plan, Check-in).\n`;
  prompt += `4️⃣ MOTIVATION – 1 Satz Emotional Boost passend zur Persona.\n`;
  prompt += `=========================================\n\n`;

  // ============================================================================
  // SASCHA-SPECIFIC CONTEXT-AWARE TOOL SUGGESTION BEHAVIOR
  // ============================================================================
  if (coachPersonality === 'sascha') {
    prompt += `🧠 SASCHA'S INTELLIGENTER TOOL-BUTTON MODUS:\n`;
    prompt += `Du bist ein kontextsensitiver Coach! Schaue IMMER erst die Daten an, bevor du Tools vorschlägst.\n\n`;
    
    prompt += `TRAININGSPLAN-VORSCHLÄGE:\n`;
    prompt += `- Prüfe zuerst die TRAININGSKONTEXT-Sektion oben\n`;
    prompt += `- Bei ≥3 Sessions ODER ≥5000kg Volumen: "Ich sehe deine ${trainingDays || 'X'} Sessions mit ${totalVolume || 'X'}kg - willst du einen Plan dazu?"\n`;
    prompt += `- Bei weniger Daten: "Zeig mir erstmal 2-3 Workouts, dann kann ich dir einen smarten Plan erstellen"\n`;
    prompt += `- NIEMALS redundante Datenwiederholung - sei natürlich und gesprächsig\n\n`;
    
    prompt += `BUTTON-VERHALTEN:\n`;
    prompt += `- NUR wenn ausreichend Kontext: Zeige relevante Tools als Button-Vorschläge\n`;
    prompt += `- Frage IMMER "Willst du dir das mal anschauen?" statt direkt zu triggern\n`;
    prompt += `- User kann ignorieren (Button verschwindet) oder bestätigen (Modal öffnet)\n\n`;
    
    prompt += `GESPRÄCHSFÜHRUNG:\n`;
    prompt += `- Beziehe dich auf konkrete Zahlen aus den Daten oben\n`;
    prompt += `- "Ich seh hier..." statt "Normalerweise würde ich..."\n`;
    prompt += `- Stelle Rückfragen bei unklaren Zielen\n`;
    prompt += `- Sei authentisch Sascha: direkt, motivierend, datengetrieben\n\n`;
  }
  
  prompt += `🎯 ALLGEMEINE ANWEISUNGEN:\n`;
  prompt += `- Nutze die bereitgestellten Daten für personalisierte, spezifische Antworten\n`;
  prompt += `- Erkenne Muster und Trends in den Daten\n`;
  prompt += `- Stelle bei Bedarf gezielte Nachfragen\n`;
  prompt += `- Gib konkrete, umsetzbare Ratschläge\n`;
  prompt += `- Erinnere dich an vergangene Gespräche und baue darauf auf\n`;
  prompt += `- Feiere Erfolge und motiviere bei Rückschlägen\n`;
  prompt += `- FALLBACK-TOOLS: Falls dir spezifische Daten fehlen, nutze diese Tools:\n`;
  prompt += `  * get_user_profile() - Holt Benutzerprofil\n`;
  prompt += `  * get_daily_goals() - Holt Tagesziele\n`;
  prompt += `  * get_recent_meals(days=3) - Holt aktuelle Mahlzeiten\n`;
  prompt += `  * get_workout_sessions(days=7) - Holt Trainingseinheiten\n`;
  prompt += `  * get_weight_history(entries=10) - Holt Gewichtsverlauf\n\n`;

  return prompt;
}

async function saveConversation(supabase: any, userId: string, userMessage: string, assistantReply: string, coachPersonality: string, images: string[], toolContext: any) {
  try {
    // Save user message
    if (userMessage) {
      await supabase.from('coach_conversations').insert({
        user_id: userId,
        message_role: 'user',
        message_content: userMessage,
        coach_personality: coachPersonality,
        context_data: {
          images: images,
          tool_context: toolContext
        }
      });
    }

    // Save assistant reply
    await supabase.from('coach_conversations').insert({
      user_id: userId,
      message_role: 'assistant',
      message_content: assistantReply,
      coach_personality: coachPersonality,
      context_data: {
        xl_memory_used: true
      }
    });

  } catch (error) {
    console.error('❌ Error saving conversation:', error);
  }
}

async function updateMemoryAfterChat(supabase: any, userId: string, userMessage: string, assistantReply: string, profileData?: any, coachPersonality?: string) {
  try {
    // NEW: Rolling Memory System Update
    if (coachPersonality) {
      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };
      
      const assistantMsg: ChatMessage = {
        role: 'assistant', 
        content: assistantReply,
        timestamp: new Date().toISOString()
      };

      // Add both messages to rolling memory with compression
      await edgeMemoryManager.addMessage(userId, coachPersonality, userMsg, supabase, openAIApiKey);
      await edgeMemoryManager.addMessage(userId, coachPersonality, assistantMsg, supabase, openAIApiKey);
    }

    // Legacy Memory System (keep for compatibility)
    const sentiment = analyzeSentiment(userMessage);
    
    const { data: existingMemory } = await supabase
      .from('coach_memory')
      .select('memory_data')
      .eq('user_id', userId)
      .maybeSingle();

    let memoryData = existingMemory?.memory_data || {
      relationship_stage: 'building_trust',
      preferences: {},
      recent_moods: [],
      successes: [],
      struggles: [],
      trust_level: 1
    };

    // Store preferred name in memory if available
    if (profileData?.preferred_name || profileData?.first_name || profileData?.display_name) {
      if (!memoryData.preferences) memoryData.preferences = {};
      memoryData.preferences.preferred_name = getDisplayName(profileData);
    }

    // Add mood entry
    if (sentiment !== 'neutral') {
      memoryData.recent_moods = memoryData.recent_moods || [];
      memoryData.recent_moods.push({
        mood: sentiment,
        intensity: 1,
        timestamp: new Date().toISOString(),
        context: userMessage.substring(0, 100)
      });
      
      // Keep only last 10 moods
      if (memoryData.recent_moods.length > 10) {
        memoryData.recent_moods = memoryData.recent_moods.slice(-10);
      }
    }

    // Upsert memory
    await supabase.from('coach_memory').upsert({
      user_id: userId,
      memory_data: memoryData
    });

  } catch (error) {
    console.error('❌ Error updating memory:', error);
  }
}

function analyzeSentiment(text: string): string {
  const positiveWords = ['gut', 'super', 'toll', 'freue', 'motiviert', 'geschafft', 'erfolgreich'];
  const negativeWords = ['schlecht', 'müde', 'schwer', 'problem', 'frustriert', 'aufgeben'];
  
  const lowerText = text.toLowerCase();
  
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function getDisplayName(profile: any): string {
  if (!profile) return 'mein Schützling';
  
  if (profile.preferred_name?.trim()) {
    return profile.preferred_name.trim();
  }
  
  if (profile.first_name?.trim()) {
    return profile.first_name.trim();
  }
  
  if (profile.display_name?.trim()) {
    return profile.display_name.trim().split(' ')[0];
}

// ============================================================================
// SASCHA'S LINGUISTIC STYLE GUARD - Phase 6 Implementation
// ============================================================================

interface SpeechStyle {
  dialect: string;
  greetings: {
    morning: string;
    afternoon: string;
    evening: string;
    lateNight: string;
  };
  fillerWords: string[];
  sentenceMaxWords: number;
  exclamationMax: number;
  regionCharacteristics: string;
}

/**
 * SASCHA GUARD: Ensures linguistic consistency and regional authenticity
 * @param reply - Raw LLM response
 * @param coachPersonality - Coach identifier
 * @param hour - Current hour for greeting validation
 * @returns Processed response following Sascha's speech patterns
 */
function applySaschaGuard(reply: string, coachPersonality: string, hour: number): string {
  // Only apply guard to Sascha
  if (coachPersonality !== 'sascha') {
    return reply;
  }
  
  console.log(`🛡️ Applying Sascha linguistic guard...`);
  
  // 1. Limit exclamation marks (max 1 per response)
  const exclamationCount = (reply.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    // Keep only the first exclamation mark, replace others with periods
    let exclamationsSeen = 0;
    reply = reply.replace(/!/g, (match) => {
      exclamationsSeen++;
      return exclamationsSeen === 1 ? match : '.';
    });
    console.log(`🛡️ Sascha Guard: Limited exclamations (${exclamationCount} → 1)`);
  }
  
  // 2. Ensure proper greeting based on time
  const correctGreeting = hour < 11 ? 'Moin' : hour < 17 ? 'Hey' : hour < 22 ? 'Guten Abend' : 'Später Abend';
  
  // Check if greeting is present and correct
  const greetingPattern = /^(Moin|Hey|Guten Abend|Später Abend|Guten Morgen|Guten Tag)/;
  const hasGreeting = greetingPattern.test(reply);
  
  if (!hasGreeting) {
    reply = `${correctGreeting}! ${reply}`;
    console.log(`🛡️ Sascha Guard: Added correct greeting (${correctGreeting})`);
  } else {
    // Replace incorrect greeting with correct one
    reply = reply.replace(greetingPattern, correctGreeting);
    console.log(`🛡️ Sascha Guard: Corrected greeting to (${correctGreeting})`);
  }
  
  // 3. Soft sentence length enforcement (≤15 words)
  // Split into sentences and check length
  const sentences = reply.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const processedSentences = sentences.map(sentence => {
    const words = sentence.trim().split(/\s+/);
    if (words.length > 15) {
      // Soft truncation: keep first 12 words and add connecting phrase
      const truncated = words.slice(0, 12).join(' ');
      return truncated + ', passt';
    }
    return sentence.trim();
  });
  
  reply = processedSentences.join('. ').replace(/\.\s*\./g, '.') + '.';
  
  // 4. Add occasional Nord-Slang filler words (but not too many)
  const fillerWords = ['jau', 'passt', 'sauber', 'alles klar'];
  const shouldAddFiller = Math.random() < 0.3; // 30% chance
  
  if (shouldAddFiller && !fillerWords.some(filler => reply.toLowerCase().includes(filler))) {
    const randomFiller = fillerWords[Math.floor(Math.random() * fillerWords.length)];
    // Add filler at the end or before the last sentence
    if (reply.endsWith('.')) {
      reply = reply.slice(0, -1) + `, ${randomFiller}.`;
    } else {
      reply += `, ${randomFiller}`;
    }
    console.log(`🛡️ Sascha Guard: Added Nord-Slang filler (${randomFiller})`);
  }
  
  // 5. Remove overly complex language patterns
  reply = reply.replace(/([A-Z][a-z]+):\s*/g, ''); // Remove "Analyse:" type headers
  reply = reply.replace(/\d+\.\s+/g, ''); // Remove numbered lists
  
  console.log(`🛡️ Sascha Guard: Processing complete`);
  return reply;
}
  
  return 'mein Schützling';
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateTimeSince(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'heute';
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return `vor ${Math.floor(diffDays / 7)} Wochen`;
}

function intelligentTokenShortening(messages: any[], targetTokens: number): any[] {
  if (!messages || messages.length === 0) return [];
  
  let totalTokens = 0;
  const result = [];
  
  // Work backwards from newest messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokenCount(messages[i].content || '');
    
    if (totalTokens + messageTokens <= targetTokens) {
      result.unshift(messages[i]);
      totalTokens += messageTokens;
    } else {
      break;
    }
  }
  
  return result;
}

// PHASE 3: Dynamic Prompt Building Helper Functions

function assessContextQuality(context: any, toolContext: any): any {
  const quality = {
    hasRichNutritionData: false,
    hasTrainingHistory: false,
    hasRAGKnowledge: false,
    hasUserProfile: false,
    isDataSparse: false,
    overallScore: 0
  };
  
  // Assess nutrition data quality
  const todaysTotals = toolContext?.data?.todaysTotals;
  const recentMeals = context?.relevantData?.meals;
  if ((todaysTotals && todaysTotals.count > 2) || (recentMeals && recentMeals.length > 5)) {
    quality.hasRichNutritionData = true;
    quality.overallScore += 25;
  }
  
  // Assess training data quality
  const workoutData = toolContext?.data?.workoutData;
  const exerciseSessions = context?.relevantData?.exercise_sessions;
  if ((workoutData && workoutData.length > 3) || (exerciseSessions && exerciseSessions.length > 2)) {
    quality.hasTrainingHistory = true;
    quality.overallScore += 25;
  }
  
  // Check for RAG knowledge availability
  if (global.lastRAGResults && global.lastRAGResults.results && global.lastRAGResults.results.length > 0) {
    quality.hasRAGKnowledge = true;
    quality.overallScore += 20;
  }
  
  // Check user profile completeness
  const profile = toolContext?.data?.profileData || context?.profile;
  if (profile && profile.age && profile.height && profile.weight) {
    quality.hasUserProfile = true;
    quality.overallScore += 15;
  }
  
  // Determine if data is sparse
  quality.isDataSparse = quality.overallScore < 30;
  
  return quality;
}

function buildAdaptivePromptSections(context: any, toolContext: any, contextQuality: any): string[] {
  const sections = [];
  
  // High-quality nutrition section
  if (contextQuality.hasRichNutritionData) {
    sections.push(`
📊 ERWEITERTE ERNÄHRUNGSBERATUNG:
- Nutze detaillierte Mahlzeitendaten für präzise Makro-Analysen
- Erkenne Ernährungsmuster und schlage Optimierungen vor
- Berücksichtige Timing und Nährstoffverteilung
`);
  } else {
    sections.push(`
🍽️ GRUNDLEGENDE ERNÄHRUNGSBERATUNG:
- Fokussiere auf Mahlzeiten-Tracking und grundlegende Makros
- Motiviere zur regelmäßigen Dateneingabe
- Gib allgemeine Ernährungsempfehlungen
`);
  }
  
  // Training intelligence section
  if (contextQuality.hasTrainingHistory) {
    sections.push(`
💪 PROGRESSIVE TRAININGSBERATUNG:
- Analysiere Trainingsvolumen und -frequenz für optimale Progression
- Erkenne Schwachstellen und Ungleichgewichte
- Schlage evidenzbasierte Anpassungen vor
`);
  } else {
    sections.push(`
🏃 EINSTEIGER-TRAININGSBERATUNG:
- Motiviere zum Start der Trainingsaufzeichnung
- Gib grundlegende Bewegungsempfehlungen
- Erkläre Trainingsgrundlagen
`);
  }
  
  // RAG-enhanced section
  if (contextQuality.hasRAGKnowledge) {
    sections.push(`
🧠 WISSENSCHAFTLICH FUNDIERTE BERATUNG:
- Integriere aktuelle Forschungsergebnisse in deine Antworten
- Verweise auf evidenzbasierte Methoden
- Nutze verfügbares Fachwissen für tiefere Analysen
`);
  }
  
  return sections;
}
async function checkTrainingDataSufficiency(supabase: any, userId: string): Promise<{sufficient: boolean, analysis: any}> {
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    // Check for recent exercise sessions
    const { data: sessions } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(10);
    
    // Check for recent exercise sets
    const { data: sets } = await supabase
      .from('exercise_sets')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twoWeeksAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
    
    const sessionCount = sessions?.length || 0;
    const setCount = sets?.length || 0;
    const totalVolume = sets?.reduce((sum: number, set: any) => sum + (set.reps * set.weight_kg || 0), 0) || 0;
    
    const analysis = {
      sessionCount,
      setCount,
      totalVolume,
      averageVolumePerSession: sessionCount > 0 ? totalVolume / sessionCount : 0,
      lastSessionDate: sessions?.[0]?.date || null
    };
    
    // Sascha's intelligence: Need at least 3 sessions OR 5000kg total volume
    const sufficient = sessionCount >= 3 || totalVolume >= 5000;
    
    console.log(`📊 Training data analysis for ${userId}:`, analysis, `Sufficient: ${sufficient}`);
    
    return { sufficient, analysis };
  } catch (error) {
    console.error('Error checking training data:', error);
    return { sufficient: false, analysis: {} };
  }
}
