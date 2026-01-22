-- ═══════════════════════════════════════════════════════════════════════════════
-- ARES Function Calling Tables Migration
-- Created: 2026-01-22
-- Purpose: New tables for ARES plan creation and management
-- ═══════════════════════════════════════════════════════════════════════════════

-- Nutrition Plans Table
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  goal TEXT NOT NULL,
  daily_calories INTEGER,
  macros JSONB DEFAULT '{}',
  meal_count INTEGER DEFAULT 4,
  diet_type TEXT DEFAULT 'standard',
  meal_schedule JSONB DEFAULT '[]',
  created_by TEXT DEFAULT 'ares',
  status TEXT DEFAULT 'active',
  notes TEXT,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplement Plans Table
CREATE TABLE IF NOT EXISTS supplement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  goal TEXT NOT NULL,
  budget_level TEXT DEFAULT 'medium',
  experience_level TEXT DEFAULT 'beginner',
  supplements JSONB DEFAULT '[]',
  created_by TEXT DEFAULT 'ares',
  status TEXT DEFAULT 'active',
  notes TEXT,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Peptide Protocols Table
CREATE TABLE IF NOT EXISTS peptide_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_name TEXT NOT NULL,
  goal TEXT NOT NULL,
  experience_level TEXT DEFAULT 'beginner',
  peptides JSONB DEFAULT '[]',
  contraindications TEXT[] DEFAULT '{}',
  monitoring TEXT[] DEFAULT '{}',
  created_by TEXT DEFAULT 'ares',
  status TEXT DEFAULT 'draft', -- Peptide protocols start as draft
  notes TEXT,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at column to workout_plans if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_plans' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE workout_plans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Row Level Security Policies
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_protocols ENABLE ROW LEVEL SECURITY;

-- Nutrition Plans Policies
CREATE POLICY "Users can view their own nutrition plans"
  ON nutrition_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition plans"
  ON nutrition_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition plans"
  ON nutrition_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all nutrition plans"
  ON nutrition_plans FOR ALL
  USING (auth.role() = 'service_role');

-- Supplement Plans Policies
CREATE POLICY "Users can view their own supplement plans"
  ON supplement_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own supplement plans"
  ON supplement_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplement plans"
  ON supplement_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all supplement plans"
  ON supplement_plans FOR ALL
  USING (auth.role() = 'service_role');

-- Peptide Protocols Policies
CREATE POLICY "Users can view their own peptide protocols"
  ON peptide_protocols FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own peptide protocols"
  ON peptide_protocols FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own peptide protocols"
  ON peptide_protocols FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all peptide protocols"
  ON peptide_protocols FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_status ON nutrition_plans(status);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_user_id ON supplement_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_status ON supplement_plans(status);
CREATE INDEX IF NOT EXISTS idx_peptide_protocols_user_id ON peptide_protocols(user_id);
CREATE INDEX IF NOT EXISTS idx_peptide_protocols_status ON peptide_protocols(status);

-- Update coach_memory table to support upsert on user_id + coach_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'coach_memory_user_id_coach_id_key'
  ) THEN
    -- Add unique constraint for upsert operations
    ALTER TABLE coach_memory ADD CONSTRAINT coach_memory_user_id_coach_id_key 
    UNIQUE (user_id, coach_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE nutrition_plans IS 'User nutrition plans created by ARES coach';
COMMENT ON TABLE supplement_plans IS 'User supplement stacks created by ARES coach';
COMMENT ON TABLE peptide_protocols IS 'Advanced peptide protocols created by ARES coach (requires review)';
