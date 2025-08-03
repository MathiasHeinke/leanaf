export function approxTokens(s: string): number {
  // Rough estimation: 4 chars per token
  return Math.ceil((s || "").length / 4);
}

export function hardTrim(str: string, tokenCap: number): string {
  const charCap = tokenCap * 4;
  if (str.length <= charCap) return str;
  return str.slice(0, charCap);
}

export function validateTokenBudget(content: string, maxTokens: number): boolean {
  return approxTokens(content) <= maxTokens;
}

export function trimToTokenBudget(content: string, maxTokens: number): string {
  if (validateTokenBudget(content, maxTokens)) {
    return content;
  }
  return hardTrim(content, maxTokens);
}