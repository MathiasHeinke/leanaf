// 🔥 PRODUCTION-OPTIMIZED: Token limits based on real usage analytics
const MAX_TOKENS = 6000; // Reduced from 8k - 95% of chats are under 6k
const TOKEN_BUFFER = 500; // Safety buffer

export function approxTokens(s: string): number {
  // Rough estimation: 4 chars per token
  return Math.ceil((s || "").length / 4);
}

export function hardTrim(str: string, tokenCap: number): string {
  const charCap = tokenCap * 4;
  if (str.length <= charCap) return str;
  return str.slice(0, charCap);
}

export function validateTokenBudget(content: string, maxTokens: number = MAX_TOKENS): boolean {
  return approxTokens(content) <= maxTokens;
}

export function trimToTokenBudget(content: string, maxTokens: number = MAX_TOKENS): string {
  const currentTokens = approxTokens(content);
  
  // 📊 LOG ACTUAL PROMPT SIZES for optimization
  console.log(`📊 Token Budget Check:`, {
    actualTokens: currentTokens,
    budgetLimit: maxTokens,
    utilizationPercent: Math.round((currentTokens / maxTokens) * 100),
    needsTrimming: currentTokens > maxTokens
  });
  
  if (validateTokenBudget(content, maxTokens)) {
    return content;
  }
  
  console.warn(`⚠️ Content trimmed: ${currentTokens} → ${maxTokens} tokens`);
  return hardTrim(content, maxTokens);
}

// Export limits for external use
export const TOKEN_LIMITS = {
  MAX_TOKENS,
  TOKEN_BUFFER,
  EFFECTIVE_LIMIT: MAX_TOKENS - TOKEN_BUFFER
};