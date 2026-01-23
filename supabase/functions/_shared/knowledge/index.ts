// Knowledge System Module - Phase 5
// Central exports for ARES knowledge integration

export { loadRelevantKnowledge, formatKnowledgeForPrompt } from './knowledgeLoader.ts';
export { extractQueryKeywords, isKnowledgeQuery, getRelatedTopicKeywords } from './questionAnalyzer.ts';
export type { TaxonomyTopic, KnowledgeContext, KnowledgeLoaderOptions } from './types.ts';
