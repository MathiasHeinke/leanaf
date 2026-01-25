/**
 * Types for the Memory Extraction System
 * 
 * ARES 3.0 PRO: Enhanced with semantic embeddings support
 */

export interface ExtractedInsight {
  category: InsightCategory;
  subcategory?: string;
  insight: string;
  rawQuote?: string;
  confidence: number;
  importance: ImportanceLevel;
  embedding?: number[]; // 1536-dim vector for semantic search
}

export type InsightCategory = 
  | 'koerper'  // ASCII-safe for DB compatibility
  | 'gesundheit' 
  | 'ernaehrung'
  | 'training'
  | 'schlaf'
  | 'stress'
  | 'emotionen'
  | 'gewohnheiten'
  | 'wissen'
  | 'ziele'
  | 'privat'
  | 'substanzen'  // Supplements, Peptide, Medikamente
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
  isCurrent: boolean;  // For validity tracking
  supersededBy?: string;  // ID of newer insight that replaced this
  relatedInsights?: string[];
  extractedAt: Date;
  lastRelevantAt: Date;
  lastReferencedAt?: Date;  // When last used in context
  referenceCount: number;   // How often referenced
  expiresAt?: Date;
  embedding?: number[];  // 1536-dim vector
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

// Semantic search result from pgvector
export interface SemanticSearchResult {
  id: string;
  insight: string;
  category: string;
  subcategory?: string;
  importance: string;
  similarity: number;
  extractedAt: Date;
  rawQuote?: string;
}

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  'koerper',
  'gesundheit',
  'ernaehrung',
  'training',
  'schlaf',
  'stress',
  'emotionen',
  'gewohnheiten',
  'wissen',
  'ziele',
  'privat',
  'substanzen',
  'muster'
];
