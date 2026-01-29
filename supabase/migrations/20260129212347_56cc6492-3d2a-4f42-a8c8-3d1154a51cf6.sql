-- Add relevance_matrix JSONB column to supplement_database
-- This enables ingredient-based personalized scoring based on user context

ALTER TABLE supplement_database 
ADD COLUMN IF NOT EXISTS relevance_matrix JSONB 
DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN supplement_database.relevance_matrix IS 
'ARES Matrix-Scoring: Contains phase_modifiers, context_modifiers (true_natural, enhanced_no_trt, on_trt, on_glp1), goal_modifiers, bloodwork_triggers, compound_synergies';