// ARES 3.0 Daily Quest Manager

import { QUEST_POOL, QuestType } from './types.ts';

interface DailyQuest {
  quest_type: string;
  quest_title: string;
  quest_description: string;
  target: number;
  xp_reward: number;
}

/**
 * Generate 3 daily quests for a user
 * Uses deterministic selection based on date + user_id for consistency
 */
export function generateDailyQuests(userId: string, date: Date = new Date()): DailyQuest[] {
  const dateStr = date.toISOString().split('T')[0];
  const seed = hashCode(userId + dateStr);
  
  // Shuffle quest pool with seeded random
  const shuffled = seededShuffle([...QUEST_POOL], seed);
  
  // Pick 3 quests from different categories if possible
  const selected: QuestType[] = [];
  const usedCategories = new Set<string>();
  
  for (const quest of shuffled) {
    if (selected.length >= 3) break;
    
    // Prefer variety in categories
    if (selected.length < 2 || !usedCategories.has(quest.category)) {
      selected.push(quest);
      usedCategories.add(quest.category);
    }
  }
  
  // If we don't have 3, fill with remaining
  if (selected.length < 3) {
    for (const quest of shuffled) {
      if (selected.length >= 3) break;
      if (!selected.includes(quest)) {
        selected.push(quest);
      }
    }
  }
  
  return selected.map(q => ({
    quest_type: q.id,
    quest_title: q.title,
    quest_description: q.description,
    target: q.target,
    xp_reward: q.xpReward,
  }));
}

/**
 * Check if a quest should be updated based on an action
 */
export function getQuestProgressUpdate(
  questType: string,
  action: string,
  currentProgress: number
): number {
  const progressMap: Record<string, string[]> = {
    'ask_question': ['ares_question'],
    'use_scientific_tool': ['search_scientific_evidence', 'tool_usage'],
    'log_meal': ['meal_logged'],
    'log_workout': ['workout_logged'],
    'log_measurement': ['measurement_logged'],
    'check_protocol': ['protocol_viewed'],
    'multi_question': ['ares_question'],
    'complete_tracking': ['meal_logged', 'workout_logged'],
  };
  
  const triggers = progressMap[questType] || [];
  if (triggers.includes(action)) {
    return currentProgress + 1;
  }
  
  return currentProgress;
}

/**
 * Simple hash function for seeding
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Seeded shuffle using Fisher-Yates
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  
  const random = () => {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    return currentSeed / 0x7fffffff;
  };
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Calculate total XP from completed quests
 */
export function calculateQuestXP(completedQuests: { xp_reward: number }[]): number {
  return completedQuests.reduce((sum, q) => sum + q.xp_reward, 0);
}
