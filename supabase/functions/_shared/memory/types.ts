/**
 * Types for the Memory Extraction System
 */

export interface ExtractedInsight {
  category: InsightCategory;
  subcategory?: string;
  insight: string;
  rawQuote?: string;
  confidence: number;
  importance: ImportanceLevel;
}

export type InsightCategory = 
  | 'körper'
  | 'gesundheit' 
  | 'ernährung'
  | 'training'
  | 'schlaf'
  | 'stress'
  | 'emotionen'
  | 'gewohnheiten'
  | 'wissen'
  | 'ziele'
  | 'privat'
  | 'muster';

export type ImportanceLevel = 'critical' | 'high' | 'medium' | 'low';

export interface UserInsight {
  id: string;
  userId: string;
  category: InsightCategory;
  subcategory?: string;
  insight: string;
  rawQuote?: string;
  source: InsightSource;
  sourceId?: string;
  confidence: number;
  importance: ImportanceLevel;
  isActive: boolean;
  relatedInsights?: string[];
  extractedAt: Date;
  lastRelevantAt: Date;
  expiresAt?: Date;
}

export type InsightSource = 'chat' | 'journal' | 'tracking' | 'onboarding';

export interface DetectedPattern {
  patternType: 'correlation' | 'contradiction' | 'trend';
  description: string;
  insightIds: string[];
  confidence: number;
  suggestion: string;
}

export interface UserPattern {
  id: string;
  userId: string;
  patternType: 'correlation' | 'contradiction' | 'trend';
  description: string;
  insightIds: string[];
  confidence: number;
  suggestion?: string;
  isAddressed: boolean;
  createdAt: Date;
}

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  'körper',
  'gesundheit',
  'ernährung',
  'training',
  'schlaf',
  'stress',
  'emotionen',
  'gewohnheiten',
  'wissen',
  'ziele',
  'privat',
  'muster'
];
