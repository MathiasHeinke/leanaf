// ARES 3.0 Gamification Types

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'general' | 'ares' | 'knowledge' | 'engagement' | 'streak' | 'protocol';

export interface XPConfig {
  base_question: number;
  tool_usage: number;
  bloodwork_analysis: number;
  protocol_question: number;
  first_of_day_bonus: number;
  streak_multiplier_3d: number;
  streak_multiplier_7d: number;
  streak_multiplier_14d: number;
  streak_multiplier_30d: number;
}

export const DEFAULT_XP_CONFIG: XPConfig = {
  base_question: 5,
  tool_usage: 15,
  bloodwork_analysis: 25,
  protocol_question: 20,
  first_of_day_bonus: 10,
  streak_multiplier_3d: 1.25,
  streak_multiplier_7d: 1.5,
  streak_multiplier_14d: 1.75,
  streak_multiplier_30d: 2.0,
};

export interface InteractionData {
  userId: string;
  toolsUsed: string[];
  isFirstOfDay: boolean;
  streakDays: number;
  topicCategory?: string;
  isBloodworkAnalysis?: boolean;
  isProtocolQuestion?: boolean;
}

export interface XPResult {
  baseXP: number;
  bonusXP: number;
  multiplier: number;
  totalXP: number;
  breakdown: {
    source: string;
    amount: number;
  }[];
}

export interface QuestType {
  id: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  category: string;
}

export const QUEST_POOL: QuestType[] = [
  {
    id: 'ask_question',
    title: 'Wissensdurst',
    description: 'Stelle ARES eine Frage',
    target: 1,
    xpReward: 15,
    category: 'ares',
  },
  {
    id: 'use_scientific_tool',
    title: 'Wissenschafts-Check',
    description: 'Nutze die wissenschaftliche Evidenz-Suche',
    target: 1,
    xpReward: 25,
    category: 'knowledge',
  },
  {
    id: 'log_meal',
    title: 'Ernaehrungstracker',
    description: 'Logge eine Mahlzeit',
    target: 1,
    xpReward: 15,
    category: 'tracking',
  },
  {
    id: 'log_workout',
    title: 'Trainingseinheit',
    description: 'Logge ein Workout',
    target: 1,
    xpReward: 20,
    category: 'tracking',
  },
  {
    id: 'log_measurement',
    title: 'Fortschritts-Check',
    description: 'Erfasse eine Koerpermessung',
    target: 1,
    xpReward: 20,
    category: 'tracking',
  },
  {
    id: 'check_protocol',
    title: 'Protokoll-Review',
    description: 'Oeffne ein Longevity-Protokoll',
    target: 1,
    xpReward: 15,
    category: 'protocol',
  },
  {
    id: 'multi_question',
    title: 'Deep Dive',
    description: 'Stelle 3 Fragen an ARES',
    target: 3,
    xpReward: 30,
    category: 'ares',
  },
  {
    id: 'complete_tracking',
    title: 'Tracking-Master',
    description: 'Logge Mahlzeit + Workout am selben Tag',
    target: 2,
    xpReward: 35,
    category: 'tracking',
  },
];

export interface AresBadge {
  type: string;
  name: string;
  description: string;
  condition: string;
  xpBonus: number;
  rarity: BadgeRarity;
  category: BadgeCategory;
}

export const ARES_BADGES: AresBadge[] = [
  // Knowledge Badges
  {
    type: 'wissenschaftler',
    name: '🔬 Wissenschaftler',
    description: '10x wissenschaftliche Evidenz-Suche genutzt',
    condition: 'tools_used.search_scientific_evidence >= 10',
    xpBonus: 50,
    rarity: 'rare',
    category: 'knowledge',
  },
  {
    type: 'protokoll_explorer',
    name: '📋 Protokoll-Explorer',
    description: 'Alle 5 Longevity-Protokolle angesehen',
    condition: 'protocols_viewed >= 5',
    xpBonus: 100,
    rarity: 'epic',
    category: 'protocol',
  },
  {
    type: 'bloodwork_pro',
    name: '🩸 Bloodwork-Pro',
    description: '3+ Blutwert-Marker analysiert',
    condition: 'bloodwork_markers_analyzed >= 3',
    xpBonus: 75,
    rarity: 'rare',
    category: 'knowledge',
  },
  {
    type: 'longevity_student',
    name: '📚 Longevity-Student',
    description: '50+ ARES-Fragen gestellt',
    condition: 'total_questions >= 50',
    xpBonus: 150,
    rarity: 'epic',
    category: 'ares',
  },
  {
    type: 'deep_diver',
    name: '🏊 Deep Diver',
    description: '5+ Fragen in einer Session',
    condition: 'session_questions >= 5',
    xpBonus: 25,
    rarity: 'common',
    category: 'ares',
  },
  // Engagement Badges
  {
    type: 'fruehaufsteher',
    name: '🌅 Fruehaufsteher',
    description: '7x vor 7:00 Uhr aktiv',
    condition: 'early_morning_count >= 7',
    xpBonus: 30,
    rarity: 'rare',
    category: 'engagement',
  },
  {
    type: 'nachtdenker',
    name: '🌙 Nachtdenker',
    description: '7x nach 22:00 Uhr aktiv',
    condition: 'late_night_count >= 7',
    xpBonus: 30,
    rarity: 'rare',
    category: 'engagement',
  },
  {
    type: 'weekend_warrior',
    name: '⚔️ Weekend Warrior',
    description: '4 Wochenenden in Folge aktiv',
    condition: 'consecutive_weekends >= 4',
    xpBonus: 50,
    rarity: 'rare',
    category: 'engagement',
  },
  {
    type: 'ares_veteran',
    name: '🎖️ ARES-Veteran',
    description: '100+ Interaktionen mit ARES',
    condition: 'total_interactions >= 100',
    xpBonus: 200,
    rarity: 'legendary',
    category: 'ares',
  },
  {
    type: 'tool_master',
    name: '🛠️ Tool-Meister',
    description: 'Alle verfuegbaren ARES-Tools genutzt',
    condition: 'unique_tools_used >= 5',
    xpBonus: 100,
    rarity: 'epic',
    category: 'ares',
  },
];
