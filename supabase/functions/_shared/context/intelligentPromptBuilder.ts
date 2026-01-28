/**
 * Intelligent Prompt Builder
 * Baut intelligente, datenbasierte Prompts für den ARES Coach
 * 
 * ARES 3.0 PRO: Integriert Mood-Detection für emotionale Intelligenz
 * ARES 3.0 RESPONSE INTELLIGENCE: Topic Expertise + Response Budget
 */

import type { UserHealthContext } from './userContextLoader.ts';
import type { CoachPersona, ResolvedPersona } from '../persona/types.ts';
import type { UserInsight, UserPattern } from '../memory/types.ts';
import type { TopicContext } from './topicTracker.ts';
import type { BudgetResult } from '../ai/responseBudget.ts';
import { buildTopicExpertiseSection } from './topicTracker.ts';
import { buildBudgetPromptSection } from '../ai/responseBudget.ts';
import { 
  detectMood, 
  getResponseGuidelines, 
  buildMoodPromptSection,
  applyMoodToDials,
  type MoodResult,
  type ResponseGuidelines 
} from '../mood/index.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD SCALE HELPERS - Konvertiert -5/+5 zu natürlicher 1-10 Skala
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Konvertiert Mood-Score von -5/+5 zu 1-10 Skala
 * -5 → 1, 0 → 6, +5 → 10
 */
export function moodToTenScale(mood: number): number {
  const clamped = Math.max(-5, Math.min(5, mood));
  return Math.round((clamped + 5) / 10 * 9) + 1;
}

/**
 * Gibt eine deutsche Beschreibung für den Mood-Score zurück
 */
export function moodDescription(mood: number): string {
  if (mood >= 4) return 'ausgezeichnet';
  if (mood >= 2) return 'gut';
  if (mood >= 0) return 'neutral/ok';
  if (mood >= -2) return 'gedrueckt';
  return 'schwierig';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface IntelligentPromptConfig {
  userContext: UserHealthContext;
  persona: CoachPersona | ResolvedPersona;
  conversationHistory: ConversationMessage[];
  personaPrompt: string;
  ragKnowledge: string[];
  currentMessage: string;
  // Phase 4: Memory System
  userInsights?: UserInsight[];
  userPatterns?: UserPattern[];
  // ARES 3.0 Response Intelligence
  topicContexts?: Map<string, TopicContext>;
  responseBudget?: BudgetResult;
}

// Re-export für externe Nutzung
export { detectMood, getResponseGuidelines, buildMoodPromptSection, applyMoodToDials };
export type { MoodResult, ResponseGuidelines };

/**
 * Baut einen intelligenten System Prompt basierend auf User-Kontext
 */
export function buildIntelligentSystemPrompt(config: IntelligentPromptConfig): string {
  const {
    userContext,
    persona,
    conversationHistory,
    personaPrompt,
    ragKnowledge,
    currentMessage,
    userInsights,
    userPatterns,
    topicContexts,
    responseBudget,
  } = config;

  const sections: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 1: Persona & Grundidentität
  // ═══════════════════════════════════════════════════════════════════════════════
  sections.push(`Du bist ${persona.name}, ein erfahrener Fitness- und Gesundheitscoach.`);
  
  if (personaPrompt) {
    sections.push(personaPrompt);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 2: User-Kontext (was wir wissen)
  // ═══════════════════════════════════════════════════════════════════════════════
  sections.push('');
  sections.push(userContext.summaryForPrompt);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 2B: Erkannte Insights (Memory System)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (userInsights && userInsights.length > 0) {
    sections.push('');
    sections.push('== ERKANNTE INSIGHTS ÜBER DEN USER ==');
    sections.push('(Automatisch aus Gesprächen extrahiert - nutze diese Infos aktiv!)');
    
    // Gruppiere nach Kategorie
    const byCategory = groupInsightsByCategory(userInsights);
    for (const [category, insights] of Object.entries(byCategory)) {
      sections.push(`\n#${category.toUpperCase()}:`);
      insights.slice(0, 3).forEach(i => {
        const importance = i.importance === 'critical' ? '⚠️' : i.importance === 'high' ? '!' : '';
        sections.push(`  ${importance} ${i.insight}`);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 2C: Erkannte Muster & Zusammenhänge
  // ═══════════════════════════════════════════════════════════════════════════════
  if (userPatterns && userPatterns.length > 0) {
    sections.push('');
    sections.push('== ERKANNTE MUSTER & ZUSAMMENHÄNGE ==');
    sections.push('(Nutze diese proaktiv wenn es zum Gespräch passt!)');
    
    userPatterns.slice(0, 3).forEach(p => {
      const typeLabel = p.patternType === 'contradiction' ? '⚡ Widerspruch' :
                       p.patternType === 'correlation' ? '🔗 Zusammenhang' : '📈 Trend';
      sections.push(`\n${typeLabel}: ${p.description}`);
      if (p.suggestion) {
        sections.push(`  → ${p.suggestion}`);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 3: Coaching-Regeln
  // ═══════════════════════════════════════════════════════════════════════════════
  sections.push('');
  sections.push('== COACHING-REGELN ==');
  sections.push('');
  sections.push('1. NUTZE DIE DATEN AKTIV:');
  sections.push('   - Beziehe dich auf konkrete Zahlen wenn du sie hast');
  sections.push('   - Sage z.B. "Bei deinen ${userContext.recentActivity.avgCalories || "[X]"}kcal Durchschnitt..." statt generisch zu sein');
  sections.push('   - Wenn der User X Workouts hatte, erwähne das: "Du hast diese Woche schon X-mal trainiert..."');
  sections.push('');
  sections.push('2. FRAGE GEZIELT NACH FEHLENDEN INFOS:');
  
  const criticalGaps = userContext.knowledgeGaps.filter(g => g.importance === 'critical');
  const highGaps = userContext.knowledgeGaps.filter(g => g.importance === 'high');
  
  if (criticalGaps.length > 0) {
    sections.push('   KRITISCH - Frage bei passender Gelegenheit:');
    criticalGaps.forEach(g => sections.push(`   - "${g.question}"`));
  }
  if (highGaps.length > 0) {
    sections.push('   WICHTIG - Bei Gelegenheit erfragen:');
    highGaps.forEach(g => sections.push(`   - "${g.question}"`));
  }
  
  sections.push('');
  sections.push('3. KEINE GENERISCHEN TIPPS:');
  sections.push('   - NICHT: "Du solltest zum Arzt gehen" (zu allgemein)');
  sections.push('   - STATTDESSEN: "Mit deinen ${userContext.basics.weight || "[Gewicht]"}kg und ${userContext.recentActivity.workoutsThisWeek || 0} Trainings diese Woche würde ich..."');
  sections.push('   - Beziehe immer den Kontext ein wenn er verfügbar ist');
  sections.push('');
  sections.push('4. PROAKTIV ABER NICHT AUFDRINGLICH:');
  sections.push('   - Schlage nächste Schritte vor basierend auf den Daten');
  sections.push('   - Wenn etwas fehlt, frage EINE Sache pro Nachricht, nicht alles auf einmal');
  sections.push('   - Beende mit einer kontextbezogenen Rückfrage');
  sections.push('');
  sections.push('5. ANTWORTE AUF DEUTSCH:');
  sections.push('   - Natürlich, nicht steif');
  sections.push('   - Antwortlänge: 100-300 Wörter, je nach Komplexität der Frage');
  sections.push('   - Keine Aufzählungen mit Spiegelstrichen - schreibe Fließtext');

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 4: RAG Wissen (falls vorhanden)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (ragKnowledge.length > 0) {
    sections.push('');
    sections.push('== RELEVANTES FACHWISSEN ==');
    ragKnowledge.slice(0, 3).forEach((chunk, i) => {
      sections.push(`[Quelle ${i + 1}]: ${chunk.slice(0, 500)}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 5: Konversationskontext
  // ═══════════════════════════════════════════════════════════════════════════════
  if (conversationHistory.length > 0) {
    sections.push('');
    sections.push('== VORHERIGE KONVERSATION ==');
    const recentHistory = conversationHistory.slice(-6); // Letzte 6 Nachrichten
    recentHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'USER' : 'DU';
      sections.push(`${role}: ${msg.content.slice(0, 300)}${msg.content.length > 300 ? '...' : ''}`);
    });
    
    // CRITICAL: Style Override - Persona style takes precedence over conversation history
    sections.push('');
    sections.push('== KRITISCH: STIL-ANWEISUNG ==');
    sections.push('IGNORIERE den Sprachstil und Dialekt aus der vorherigen Konversation!');
    sections.push('Die Konversation dient NUR fuer inhaltlichen Kontext - welche Themen besprochen wurden.');
    sections.push('Nutze AUSSCHLIESSLICH den Stil aus deiner Persona-Definition (oben).');
    
    // Check for dialect in persona
    const personaWithDialect = persona as { dialect?: string };
    if (personaWithDialect.dialect) {
      sections.push('Dein aktueller Dialekt: ' + personaWithDialect.dialect);
    } else {
      sections.push('Du sprichst HOCHDEUTSCH - KEIN Dialekt, keine regionalen Ausdruecke!');
    }
    sections.push('Kopiere NIEMALS den Sprachstil aus frueheren Nachrichten.');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 6: MOOD DETECTION (ARES 3.0 PRO)
  // ═══════════════════════════════════════════════════════════════════════════════
  const moodResult = detectMood(currentMessage);
  const moodGuidelines = getResponseGuidelines(moodResult);
  const moodSection = buildMoodPromptSection(moodResult, moodGuidelines);
  
  if (moodSection) {
    sections.push('');
    sections.push(moodSection);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 6B: TOPIC EXPERTISE (ARES 3.0 Response Intelligence)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (topicContexts && topicContexts.size > 0) {
    sections.push('');
    sections.push(buildTopicExpertiseSection(topicContexts));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 6C: RESPONSE BUDGET (ARES 3.0 Response Intelligence)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (responseBudget) {
    sections.push('');
    sections.push(buildBudgetPromptSection(responseBudget));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 7: Dynamische Anweisungen basierend auf Situation
  // ═══════════════════════════════════════════════════════════════════════════════
  const situationalInstructions = generateSituationalInstructions(userContext, currentMessage);
  if (situationalInstructions) {
    sections.push('');
    sections.push('== SITUATIONSBEZOGENE ANWEISUNG ==');
    sections.push(situationalInstructions);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 8: Aktuelles Datum
  // ═══════════════════════════════════════════════════════════════════════════════
  sections.push('');
  sections.push(`Heute ist ${getCurrentGermanDate()}.`);

  return sections.join('\n');
}

/**
 * Generiert situationsbezogene Anweisungen basierend auf User-Kontext und Nachricht
 */
function generateSituationalInstructions(
  userContext: UserHealthContext,
  currentMessage: string
): string | null {
  const lowerMessage = currentMessage.toLowerCase();
  const instructions: string[] = [];

  // Wenn User nach Ernährung fragt aber wenig Daten hat
  if (
    (lowerMessage.includes('ernährung') || lowerMessage.includes('essen') || lowerMessage.includes('kalorien')) &&
    userContext.recentActivity.mealsLogged < 3
  ) {
    instructions.push(
      'Der User fragt nach Ernährung, hat aber wenig Mahlzeiten geloggt. ' +
      'Erkläre warum Tracking wichtig ist und bitte höflich darum, Mahlzeiten zu loggen.'
    );
  }

  // Wenn User nach Training fragt
  if (
    (lowerMessage.includes('training') || lowerMessage.includes('workout') || lowerMessage.includes('übung')) &&
    userContext.recentActivity.workoutsThisWeek === 0
  ) {
    instructions.push(
      'Der User fragt nach Training, hat aber diese Woche noch nicht trainiert. ' +
      'Motiviere ihn und frage nach seinen Trainingszielen.'
    );
  }

  // Wenn User nach Supplements/Peptiden fragt
  if (lowerMessage.includes('supplement') || lowerMessage.includes('peptid') || lowerMessage.includes('vitamin')) {
    if (!userContext.medical.hasBloodwork) {
      instructions.push(
        'Der User fragt nach Supplements/Peptiden, hat aber kein Blutbild. ' +
        'Empfehle erst ein Blutbild, bevor du spezifische Empfehlungen gibst.'
      );
    }
  }

  // Wenn Gewichtsziel gesetzt aber weit entfernt
  if (userContext.basics.weight && userContext.basics.targetWeight) {
    const diff = Math.abs(userContext.basics.weight - userContext.basics.targetWeight);
    if (diff > 15) {
      instructions.push(
        `Der User hat ${diff}kg bis zum Zielgewicht. Setze realistische Erwartungen (0.5-1kg/Woche).`
      );
    }
  }

  // Wenn wenig Schlaf
  if (userContext.recentActivity.avgSleepHours !== null && userContext.recentActivity.avgSleepHours < 6) {
    instructions.push(
      `Der User schläft nur Ø${userContext.recentActivity.avgSleepHours}h/Nacht. ` +
      'Schlaf ist fundamental - erwähne das wenn passend.'
    );
  }

  // Wenn User frustriert klingt
  const frustrationWords = ['frustriert', 'genervt', 'aufgeben', 'keine lust', 'schwer', 'schaffe'];
  if (frustrationWords.some(w => lowerMessage.includes(w))) {
    instructions.push(
      'Der User klingt frustriert. Sei besonders empathisch, feiere kleine Erfolge, ' +
      'und gib einen konkreten, machbaren nächsten Schritt.'
    );
  }

  return instructions.length > 0 ? instructions.join('\n') : null;
}

/**
 * Generiert aktuelles deutsches Datum
 */
function getCurrentGermanDate(): string {
  const now = new Date();
  const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const germanMonths = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return `${germanDays[now.getDay()]}, ${now.getDate()}. ${germanMonths[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Konvertiert den alten Konversationshistorie-Format ins neue Format
 */
export function convertConversationHistory(
  rawHistory: { message: string; response: string; created_at?: string }[]
): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  
  for (const entry of rawHistory) {
    if (entry.message) {
      messages.push({
        role: 'user',
        content: entry.message,
        timestamp: entry.created_at,
      });
    }
    if (entry.response) {
      messages.push({
        role: 'assistant',
        content: entry.response,
        timestamp: entry.created_at,
      });
    }
  }
  
  return messages;
}

/**
 * Gruppiert Insights nach Kategorie
 */
function groupInsightsByCategory(insights: UserInsight[]): Record<string, UserInsight[]> {
  const grouped: Record<string, UserInsight[]> = {};
  
  for (const insight of insights) {
    if (!grouped[insight.category]) {
      grouped[insight.category] = [];
    }
    grouped[insight.category].push(insight);
  }
  
  return grouped;
}

export { generateSituationalInstructions, getCurrentGermanDate };
