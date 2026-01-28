/**
 * Token-Based Conversation Window
 * Maximizes conversation context within a token budget
 * 
 * This module implements "Elefantengedächtnis 2.0" - intelligent context management
 * that prioritizes recent messages while preserving compressed older context via Rolling Summary.
 */

// Token budget constants
const TOKEN_BUDGET_HISTORY = 2000;  // Token budget for recent messages
const TOKEN_BUDGET_SUMMARY = 500;   // Token budget for rolling summary
const CHARS_PER_TOKEN = 4;          // Approximation for German/English text
const MIN_PAIRS_GUARANTEED = 3;     // Always include at least 3 pairs

/**
 * Represents a user-assistant message pair
 */
export interface ConversationPair {
  message: string;      // User message
  response: string;     // ARES response
  created_at?: string;  // Timestamp
}

/**
 * Result of token-budgeted history building
 */
export interface WindowResult {
  pairs: ConversationPair[];    // Selected pairs (chronological order)
  totalTokens: number;          // Total tokens used
  trimmedCount: number;         // Number of pairs trimmed
  rollingSummary: string | null; // Formatted rolling summary
}

/**
 * Estimates token count for a text string
 * Uses ~4 chars per token approximation (works well for German/English mix)
 */
export function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / CHARS_PER_TOKEN);
}

/**
 * Builds a token-budgeted conversation history
 * Prioritizes newest messages, trims oldest when budget exceeded
 * 
 * @param pairs - All available conversation pairs (chronological order, oldest first)
 * @param rollingSummary - Optional compressed summary of older conversations
 * @param maxTokens - Total token budget (default: 2500)
 * @returns WindowResult with selected pairs and metadata
 */
export function buildTokenBudgetedHistory(
  pairs: ConversationPair[],
  rollingSummary: string | null,
  maxTokens: number = TOKEN_BUDGET_HISTORY + TOKEN_BUDGET_SUMMARY
): WindowResult {
  // Calculate summary token usage (capped)
  const summaryTokens = rollingSummary 
    ? Math.min(estimateTokens(rollingSummary), TOKEN_BUDGET_SUMMARY)
    : 0;
  
  // Available budget for message history
  const availableForHistory = maxTokens - summaryTokens;
  
  if (!pairs || pairs.length === 0) {
    return {
      pairs: [],
      totalTokens: summaryTokens,
      trimmedCount: 0,
      rollingSummary: rollingSummary 
        ? rollingSummary.slice(0, TOKEN_BUDGET_SUMMARY * CHARS_PER_TOKEN)
        : null,
    };
  }
  
  // Process from NEWEST to OLDEST (reverse the chronological array)
  const reversed = [...pairs].reverse();
  const selected: ConversationPair[] = [];
  let usedTokens = 0;
  let trimmedCount = 0;
  
  for (let i = 0; i < reversed.length; i++) {
    const pair = reversed[i];
    const pairTokens = estimateTokens(pair.message) + estimateTokens(pair.response);
    
    // Guarantee minimum pairs even if over budget
    const isGuaranteedPair = selected.length < MIN_PAIRS_GUARANTEED;
    
    if (usedTokens + pairTokens <= availableForHistory || isGuaranteedPair) {
      selected.unshift(pair);  // Maintain chronological order
      usedTokens += pairTokens;
    } else {
      trimmedCount++;
    }
  }
  
  // Correct trimmed count (pairs not in selected)
  trimmedCount = pairs.length - selected.length;
  
  const result: WindowResult = {
    pairs: selected,
    totalTokens: usedTokens + summaryTokens,
    trimmedCount,
    rollingSummary: rollingSummary 
      ? rollingSummary.slice(0, TOKEN_BUDGET_SUMMARY * CHARS_PER_TOKEN)
      : null,
  };
  
  // Log for debugging
  console.log(`[MEMORY-WINDOW] Built history: ${selected.length} pairs, ${usedTokens} tokens (history) + ${summaryTokens} tokens (summary) = ${result.totalTokens} total, ${trimmedCount} trimmed`);
  
  return result;
}

/**
 * Formats the windowed conversation context for the system prompt
 * Includes both rolling summary and recent messages
 * 
 * @param result - WindowResult from buildTokenBudgetedHistory
 * @returns Markdown-formatted string for system prompt injection
 */
export function formatConversationContext(result: WindowResult): string {
  const sections: string[] = [];
  
  // Rolling Summary section (compressed older conversations)
  if (result.rollingSummary) {
    sections.push('## ZUSAMMENFASSUNG BISHERIGER GESPRÄCHE');
    sections.push('**Komprimierte ältere Gespräche - ARES erinnert sich an diese Themen:**');
    sections.push(result.rollingSummary);
    sections.push('');
  }
  
  // Recent messages section (token-budgeted)
  if (result.pairs.length > 0) {
    sections.push(`## GESPRÄCHSVERLAUF (Letzte ${result.pairs.length} Austausche)`);
    sections.push('**WICHTIG: Du erinnerst dich an diese Gespräche! Beziehe dich darauf wenn relevant.**');
    sections.push('');
    
    for (const pair of result.pairs) {
      // Optional: Add relative time if timestamp available
      let timePrefix = '';
      if (pair.created_at) {
        const diff = Date.now() - new Date(pair.created_at).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) {
          timePrefix = `[vor ${minutes} Min] `;
        } else if (minutes < 1440) {
          timePrefix = `[vor ${Math.floor(minutes / 60)} Std] `;
        } else {
          timePrefix = `[vor ${Math.floor(minutes / 1440)} Tagen] `;
        }
      }
      
      sections.push(`${timePrefix}**User**: ${pair.message}`);
      sections.push(`**ARES**: ${pair.response}`);
      sections.push('---');
    }
  }
  
  // Log trimming info
  if (result.trimmedCount > 0) {
    console.log(`[MEMORY-WINDOW] Formatted context: ${result.pairs.length} pairs shown, ${result.trimmedCount} older pairs compressed/trimmed`);
  }
  
  return sections.join('\n');
}

/**
 * Quick utility to check if a conversation warrants summary generation
 * Returns true if message count exceeds threshold and no summary exists
 */
export function shouldGenerateSummary(
  rawMessageCount: number,
  existingSummary: string | null,
  threshold: number = 40
): boolean {
  return rawMessageCount > threshold && !existingSummary;
}

// Export constants for external configuration
export const CONVERSATION_WINDOW_CONFIG = {
  TOKEN_BUDGET_HISTORY,
  TOKEN_BUDGET_SUMMARY,
  CHARS_PER_TOKEN,
  MIN_PAIRS_GUARANTEED,
};
