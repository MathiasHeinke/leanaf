/**
 * Response Budget Calculator - ARES 3.0 Response Intelligence
 * Berechnet dynamisches Zeichenbudget basierend auf User-Expertise und Kontext
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import type { TopicContext, TopicLevel } from '../context/topicTracker.ts';
import type { DetailLevel, IntentType } from './semanticRouter.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BudgetFactors {
  userMessageLength: number;
  primaryTopic: TopicContext | null;
  intent: IntentType;
  detailLevel: DetailLevel;
  timeOfDay: 'morning' | 'day' | 'evening';
}

export interface BudgetResult {
  maxChars: number;
  maxTokens: number;
  reason: string;
  constraints: string[];  // Für Prompt-Injection
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTIPLIERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expertise Level Multipliers
 * - novice: Volle Erklärung (1.0x)
 * - intermediate: Basics überspringen (0.7x)
 * - expert: Nur Updates, keine Grundlagen (0.5x)
 */
const LEVEL_MULTIPLIERS: Record<TopicLevel, number> = {
  novice: 1.0,
  intermediate: 0.7,
  expert: 0.5,
};

/**
 * Recency Multiplier - Je kürzer her der letzte Deep-Dive, desto kürzer die Antwort
 */
function getRecencyMultiplier(hoursSinceDeepDive: number | null): number {
  if (hoursSinceDeepDive === null) return 1.0;  // Noch nie deep dive
  if (hoursSinceDeepDive < 24) return 0.4;       // < 24h → stark kürzen
  if (hoursSinceDeepDive < 72) return 0.6;       // < 3 Tage → kürzen
  if (hoursSinceDeepDive < 168) return 0.8;      // < 1 Woche → leicht kürzen
  return 1.0;                                     // > 1 Woche → normal
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Berechnet das Response-Budget basierend auf allen Faktoren
 */
export function calculateResponseBudget(factors: BudgetFactors): BudgetResult {
  // Base Budget nach Detail Level aus Semantic Router
  const BASE_BUDGETS: Record<DetailLevel, number> = {
    ultra_short: 400,
    concise: 800,
    moderate: 1500,
    extensive: 2500,
  };
  
  let budget = BASE_BUDGETS[factors.detailLevel] || 1500;
  const constraints: string[] = [];
  const reasons: string[] = [];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Expertise Modifier
  // ═══════════════════════════════════════════════════════════════════════════
  if (factors.primaryTopic) {
    const levelMult = LEVEL_MULTIPLIERS[factors.primaryTopic.level];
    if (levelMult < 1.0) {
      budget *= levelMult;
      constraints.push(
        `User ist ${factors.primaryTopic.level.toUpperCase()} bei ${factors.primaryTopic.topic} - KEINE Grundlagen erklaeren`
      );
      reasons.push(`Expert-Level: ${factors.primaryTopic.level}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 2. Recency Modifier
    // ═══════════════════════════════════════════════════════════════════════
    const recencyMult = getRecencyMultiplier(factors.primaryTopic.hoursSinceDeepDive);
    if (recencyMult < 1.0) {
      budget *= recencyMult;
      const hours = Math.round(factors.primaryTopic.hoursSinceDeepDive || 0);
      constraints.push(`Thema wurde vor ${hours}h ausfuehrlich besprochen - NUR neue Infos`);
      reasons.push(`Recent deep-dive: ${hours}h ago`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Short Message + Confirmation = Hard Cap
  // ═══════════════════════════════════════════════════════════════════════════
  if (factors.userMessageLength < 50 && factors.intent === 'confirmation') {
    budget = Math.min(budget, 300);
    constraints.push('Kurze Bestaetigung - max 2-3 Saetze');
    reasons.push('Short confirmation');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Evening = Slightly Shorter
  // ═══════════════════════════════════════════════════════════════════════════
  if (factors.timeOfDay === 'evening') {
    budget *= 0.85;
    reasons.push('Evening mode');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Floor & Ceiling
  // ═══════════════════════════════════════════════════════════════════════════
  budget = Math.max(200, Math.min(budget, 3000));
  
  return {
    maxChars: Math.round(budget),
    maxTokens: Math.round(budget / 4),  // ~4 chars per token
    reason: reasons.join(', ') || 'Standard budget',
    constraints,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT SECTION BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generiert den Budget-Prompt-Abschnitt für die System Message
 */
export function buildBudgetPromptSection(budget: BudgetResult): string {
  const lines: string[] = [
    '== RESPONSE BUDGET ==',
    `Ziel: ca. ${budget.maxChars} Zeichen (~${budget.maxTokens} tokens)`,
    `Grund: ${budget.reason || 'Standard'}`,
  ];
  
  if (budget.constraints.length > 0) {
    lines.push('');
    lines.push('WICHTIG:');
    budget.constraints.forEach(c => lines.push(`- ${c}`));
  }
  
  // Reminder: Antwort muss trotzdem vollständig sein
  lines.push('');
  lines.push('KRITISCH: Antwort MUSS vollstaendig sein. Kein Abschneiden mitten im Satz!');
  
  return lines.join('\n');
}
