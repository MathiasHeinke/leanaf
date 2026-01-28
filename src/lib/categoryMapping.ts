// =====================================================
// Meta-Kategorien (Wirkebenen) für Supplement-Gruppierung
// =====================================================

import { Shield, Dna, Brain, Zap, Scale, Heart, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MetaCategoryConfig {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  emoji: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  categories: readonly string[];
}

export const META_CATEGORIES = {
  health: {
    id: 'health',
    label: 'Basis & Gesundheit',
    shortLabel: 'Basis',
    icon: Shield,
    emoji: '🛡️',
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-500/30',
    categories: ['Vitamine', 'Mineralien', 'Mineralstoffe', 'Spurenelemente', 'Wellness']
  },
  longevity: {
    id: 'longevity',
    label: 'Longevity & Zellschutz',
    shortLabel: 'Longevity',
    icon: Dna,
    emoji: '🧬',
    color: 'purple',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600',
    borderClass: 'border-purple-500/30',
    categories: ['Longevity', 'Anti-Aging', 'NAD+', 'Antioxidantien', 'Mitochondrien']
  },
  mental: {
    id: 'mental',
    label: 'Mental & Fokus',
    shortLabel: 'Mental',
    icon: Brain,
    emoji: '🧠',
    color: 'cyan',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-600',
    borderClass: 'border-cyan-500/30',
    categories: ['Nootropics', 'Nootropika', 'Adaptogene', 'Schlaf', 'Stress']
  },
  performance: {
    id: 'performance',
    label: 'Performance & Sport',
    shortLabel: 'Performance',
    icon: Zap,
    emoji: '⚡',
    color: 'yellow',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-600',
    borderClass: 'border-yellow-500/30',
    categories: ['Aminosäuren', 'Muskelaufbau', 'Muskelerhalt', 'Performance', 'Proteine', 'Energie', 'Stimulanzien', 'Sport']
  },
  hormones: {
    id: 'hormones',
    label: 'Hormone & Balance',
    shortLabel: 'Hormone',
    icon: Scale,
    emoji: '⚖️',
    color: 'pink',
    bgClass: 'bg-pink-500/10',
    textClass: 'text-pink-600',
    borderClass: 'border-pink-500/30',
    categories: ['Hormone', 'Testosteron', 'TRT-Support', 'GLP-1 Support', 'Hormonregulation']
  },
  gut: {
    id: 'gut',
    label: 'Darm & Verdauung',
    shortLabel: 'Verdauung',
    icon: Heart,
    emoji: '🦠',
    color: 'green',
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-600',
    borderClass: 'border-green-500/30',
    categories: ['Darm', 'Darmgesundheit', 'Entzündung', 'Probiotika', 'Enzyme', 'Verdauung']
  },
  other: {
    id: 'other',
    label: 'Spezial & Sonstiges',
    shortLabel: 'Sonstiges',
    icon: Sparkles,
    emoji: '✨',
    color: 'gray',
    bgClass: 'bg-muted/50',
    textClass: 'text-muted-foreground',
    borderClass: 'border-muted-foreground/30',
    categories: ['Fettsäuren', 'Beauty', 'Superfoods', 'Peptid-Synergie', 'Pflanzenextrakte', 'Sonstiges']
  }
} as const;

export type MetaCategoryKey = keyof typeof META_CATEGORIES;

// Helper: Finde Meta-Kategorie für eine DB-Kategorie
export function getMetaCategory(dbCategory: string | null | undefined): MetaCategoryKey {
  if (!dbCategory) return 'other';
  
  const normalizedCategory = dbCategory.trim();
  
  for (const [key, meta] of Object.entries(META_CATEGORIES)) {
    if (meta.categories.some(cat => 
      cat.toLowerCase() === normalizedCategory.toLowerCase()
    )) {
      return key as MetaCategoryKey;
    }
  }
  return 'other';
}

// Helper: Get all meta category keys as array
export function getMetaCategoryKeys(): MetaCategoryKey[] {
  return Object.keys(META_CATEGORIES) as MetaCategoryKey[];
}

// Helper: Get config for a meta category
export function getMetaCategoryConfig(key: MetaCategoryKey): MetaCategoryConfig {
  return META_CATEGORIES[key];
}
