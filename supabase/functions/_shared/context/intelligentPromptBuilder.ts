/**
 * Intelligent Prompt Builder
 * Baut intelligente, datenbasierte Prompts für den ARES Coach
 */

import type { UserHealthContext } from './userContextLoader.ts';
import type { CoachPersona, ResolvedPersona } from '../persona/types.ts';

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
}

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
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 6: Dynamische Anweisungen basierend auf Situation
  // ═══════════════════════════════════════════════════════════════════════════════
  const situationalInstructions = generateSituationalInstructions(userContext, currentMessage);
  if (situationalInstructions) {
    sections.push('');
    sections.push('== SITUATIONSBEZOGENE ANWEISUNG ==');
    sections.push(situationalInstructions);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABSCHNITT 7: Aktuelles Datum
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

export { generateSituationalInstructions, getCurrentGermanDate };
