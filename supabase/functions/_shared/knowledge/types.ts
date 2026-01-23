// Knowledge System Types for ARES Coach
// Phase 5: Scientific Knowledge Integration

export interface TaxonomyTopic {
  id: string;
  title: string;
  description: string;
  summary: string | null;
  evidence_level: 'stark' | 'moderat' | 'anekdotisch';
  category_path: string;
  keywords: string[];
  synonyms: string[];
  relevant_bloodwork_markers: string[];
  is_sensitive: boolean;
  mechanism_of_action: string | null;
  practical_applications: string[] | null;
}

export interface KnowledgeContext {
  topics: TaxonomyTopic[];
  totalFound: number;
  queryKeywords: string[];
  hasRelevantKnowledge: boolean;
}

export interface KnowledgeLoaderOptions {
  maxTopics?: number;
  minEvidence?: 'stark' | 'moderat' | 'anekdotisch';
  includeSensitive?: boolean;
}
