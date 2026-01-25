/**
 * ARES 3.0 PRO - Time-Aware Memory Context
 * Formats insights with relative timestamps for natural conversation context
 */

import { UserInsight, InsightCategory } from './types.ts';

/**
 * Format a date as a German relative time string
 * e.g., "vor 2 Tagen", "letzte Woche", "vor 3 Wochen"
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Minute${diffMins === 1 ? '' : 'n'}`;
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`;
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  if (diffWeeks === 1) return 'letzte Woche';
  if (diffWeeks < 4) return `vor ${diffWeeks} Wochen`;
  if (diffMonths === 1) return 'letzten Monat';
  if (diffMonths < 12) return `vor ${diffMonths} Monaten`;
  
  return `vor über einem Jahr`;
}

/**
 * Format a single insight with time context
 */
export function formatInsightWithTime(insight: UserInsight): string {
  const timeAgo = formatTimeAgo(insight.created_at || new Date());
  const importanceIcon = insight.importance === 'critical' ? '🔴' : 
                         insight.importance === 'high' ? '🟠' : '';
  
  return `${importanceIcon}${insight.content} (${timeAgo})`.trim();
}

/**
 * Group insights by time period
 */
export interface GroupedInsights {
  recent: UserInsight[];    // Last 24 hours
  lastWeek: UserInsight[];  // 1-7 days ago
  older: UserInsight[];     // 7+ days ago
}

export function groupInsightsByTime(insights: UserInsight[]): GroupedInsights {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recent: UserInsight[] = [];
  const lastWeek: UserInsight[] = [];
  const older: UserInsight[] = [];

  for (const insight of insights) {
    const createdAt = new Date(insight.created_at || 0);
    if (createdAt > oneDayAgo) {
      recent.push(insight);
    } else if (createdAt > oneWeekAgo) {
      lastWeek.push(insight);
    } else {
      older.push(insight);
    }
  }

  return { recent, lastWeek, older };
}

/**
 * Category display names in German
 */
const CATEGORY_NAMES: Record<InsightCategory, string> = {
  goal: 'Ziele',
  preference: 'Präferenzen',
  health: 'Gesundheit',
  training: 'Training',
  nutrition: 'Ernährung',
  supplement: 'Supplemente',
  lifestyle: 'Lifestyle',
  protocol: 'Protokolle',
  biometric: 'Biometrische Daten',
  personal: 'Persönliches',
};

/**
 * Build a time-aware memory section for system prompts
 * Groups insights by category with top 3 per category
 */
export function buildMemorySection(insights: UserInsight[], maxPerCategory = 3): string {
  if (!insights || insights.length === 0) {
    return '';
  }

  // Group by category
  const byCategory = new Map<InsightCategory, UserInsight[]>();
  
  for (const insight of insights) {
    const cat = insight.category as InsightCategory;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(insight);
  }

  // Build sections
  const sections: string[] = [];
  
  for (const [category, categoryInsights] of byCategory) {
    // Sort by importance (critical first) then by recency
    const sorted = categoryInsights.sort((a, b) => {
      const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aImportance = importanceOrder[a.importance as keyof typeof importanceOrder] ?? 2;
      const bImportance = importanceOrder[b.importance as keyof typeof importanceOrder] ?? 2;
      
      if (aImportance !== bImportance) return aImportance - bImportance;
      
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const topInsights = sorted.slice(0, maxPerCategory);
    const categoryName = CATEGORY_NAMES[category] || category;
    
    const insightLines = topInsights.map(i => `  - ${formatInsightWithTime(i)}`);
    sections.push(`**${categoryName}:**\n${insightLines.join('\n')}`);
  }

  if (sections.length === 0) return '';

  return `## 🧠 Was ich über dich weiß:\n\n${sections.join('\n\n')}`;
}

/**
 * Build a compact memory context for smaller prompts
 */
export function buildCompactMemoryContext(insights: UserInsight[], maxTotal = 5): string {
  if (!insights || insights.length === 0) return '';

  // Sort by importance and recency
  const sorted = [...insights].sort((a, b) => {
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aImportance = importanceOrder[a.importance as keyof typeof importanceOrder] ?? 2;
    const bImportance = importanceOrder[b.importance as keyof typeof importanceOrder] ?? 2;
    
    if (aImportance !== bImportance) return aImportance - bImportance;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const top = sorted.slice(0, maxTotal);
  const lines = top.map(i => formatInsightWithTime(i));
  
  return `Bekannter Kontext: ${lines.join(' | ')}`;
}

/**
 * Get critical insights that should always be included
 */
export function getCriticalInsights(insights: UserInsight[]): UserInsight[] {
  return insights.filter(i => i.importance === 'critical' || i.importance === 'high');
}
