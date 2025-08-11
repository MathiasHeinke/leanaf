
export type AssistantLike = {
  message_role?: string | null;
  message_content?: string | null;
};

/**
 * Removes consecutive duplicate assistant messages (exact text match after trim).
 * Keeps order as-is and only skips when both current and previous are assistant with same content.
 */
export function consecutiveAssistantDedupe<T extends AssistantLike>(list: T[]): T[] {
  const out: T[] = [];
  for (const m of list) {
    const last = out[out.length - 1];
    const lastIsAssistant = (last?.message_role || '').toLowerCase() === 'assistant';
    const curIsAssistant = (m?.message_role || '').toLowerCase() === 'assistant';
    const sameText =
      (last?.message_content || '').trim() === (m?.message_content || '').trim();

    if (last && lastIsAssistant && curIsAssistant && sameText) {
      // Skip duplicate assistant bubble
      continue;
    }
    out.push(m);
  }
  return out;
}
