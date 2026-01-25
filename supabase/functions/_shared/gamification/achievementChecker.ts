// ARES 3.0 Achievement Checker

import { ARES_BADGES, AresBadge, BadgeRarity } from './types.ts';

interface UserStats {
  totalQuestions: number;
  sessionQuestions: number;
  toolsUsed: Record<string, number>;
  uniqueToolsUsed: number;
  bloodworkMarkersAnalyzed: number;
  protocolsViewed: number;
  earlyMorningCount: number;
  lateNightCount: number;
  consecutiveWeekends: number;
  totalInteractions: number;
}

interface EarnedBadge {
  badge_type: string;
  badge_name: string;
  badge_description: string;
  xp_bonus: number;
  rarity: BadgeRarity;
  category: string;
}

/**
 * Check which ARES-specific badges the user has earned
 */
export function checkAresBadges(
  stats: UserStats,
  existingBadges: string[]
): EarnedBadge[] {
  const newBadges: EarnedBadge[] = [];
  
  for (const badge of ARES_BADGES) {
    // Skip if already earned
    if (existingBadges.includes(badge.type)) continue;
    
    // Check condition
    if (evaluateBadgeCondition(badge, stats)) {
      newBadges.push({
        badge_type: badge.type,
        badge_name: badge.name,
        badge_description: badge.description,
        xp_bonus: badge.xpBonus,
        rarity: badge.rarity,
        category: badge.category,
      });
    }
  }
  
  return newBadges;
}

/**
 * Evaluate if a badge condition is met
 */
function evaluateBadgeCondition(badge: AresBadge, stats: UserStats): boolean {
  switch (badge.type) {
    case 'wissenschaftler':
      return (stats.toolsUsed['search_scientific_evidence'] || 0) >= 10;
    
    case 'protokoll_explorer':
      return stats.protocolsViewed >= 5;
    
    case 'bloodwork_pro':
      return stats.bloodworkMarkersAnalyzed >= 3;
    
    case 'longevity_student':
      return stats.totalQuestions >= 50;
    
    case 'deep_diver':
      return stats.sessionQuestions >= 5;
    
    case 'fruehaufsteher':
      return stats.earlyMorningCount >= 7;
    
    case 'nachtdenker':
      return stats.lateNightCount >= 7;
    
    case 'weekend_warrior':
      return stats.consecutiveWeekends >= 4;
    
    case 'ares_veteran':
      return stats.totalInteractions >= 100;
    
    case 'tool_master':
      return stats.uniqueToolsUsed >= 5;
    
    default:
      return false;
  }
}

/**
 * Get rarity color for UI display
 */
export function getRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common': return '#9CA3AF'; // gray
    case 'rare': return '#3B82F6'; // blue
    case 'epic': return '#8B5CF6'; // purple
    case 'legendary': return '#F59E0B'; // gold
    default: return '#9CA3AF';
  }
}

/**
 * Get rarity display name
 */
export function getRarityName(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common': return 'Gewoehnlich';
    case 'rare': return 'Selten';
    case 'epic': return 'Episch';
    case 'legendary': return 'Legendaer';
    default: return 'Gewoehnlich';
  }
}

/**
 * Calculate time-based engagement stats
 */
export function calculateEngagementStats(
  interactionTimestamps: Date[]
): { earlyMorningCount: number; lateNightCount: number; consecutiveWeekends: number } {
  let earlyMorningCount = 0;
  let lateNightCount = 0;
  
  for (const ts of interactionTimestamps) {
    const hour = ts.getHours();
    if (hour < 7) earlyMorningCount++;
    if (hour >= 22) lateNightCount++;
  }
  
  // Calculate consecutive weekends
  const weekendDates = interactionTimestamps
    .filter(ts => {
      const day = ts.getDay();
      return day === 0 || day === 6;
    })
    .map(ts => {
      // Normalize to week number
      const startOfYear = new Date(ts.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((ts.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      );
      return `${ts.getFullYear()}-W${weekNum}`;
    });
  
  const uniqueWeekends = [...new Set(weekendDates)].sort();
  let maxConsecutive = 0;
  let currentConsecutive = 1;
  
  for (let i = 1; i < uniqueWeekends.length; i++) {
    const [prevYear, prevWeek] = uniqueWeekends[i - 1].split('-W').map(Number);
    const [currYear, currWeek] = uniqueWeekends[i].split('-W').map(Number);
    
    if (currYear === prevYear && currWeek === prevWeek + 1) {
      currentConsecutive++;
    } else if (currYear === prevYear + 1 && prevWeek >= 52 && currWeek === 1) {
      currentConsecutive++;
    } else {
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      currentConsecutive = 1;
    }
  }
  maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
  
  return {
    earlyMorningCount,
    lateNightCount,
    consecutiveWeekends: maxConsecutive,
  };
}
