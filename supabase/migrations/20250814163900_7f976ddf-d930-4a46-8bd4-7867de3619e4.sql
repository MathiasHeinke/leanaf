-- PHASE 1: ARES Knowledge Base Migration
-- Migrate all Markus knowledge entries to ARES

-- Update existing Markus entries to ARES
UPDATE coach_knowledge_base 
SET coach_id = 'ares',
    updated_at = now()
WHERE coach_id = 'markus';

-- Update any existing Markus embeddings to ARES  
UPDATE knowledge_base_embeddings
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'),
  '{coach_id}',
  '"ares"'
)
WHERE knowledge_id IN (
  SELECT id FROM coach_knowledge_base WHERE coach_id = 'ares'
);

-- Ensure ARES has proper knowledge base entries for cross-domain coaching
INSERT INTO coach_knowledge_base (
  coach_id, title, content, expertise_area, knowledge_type, 
  tags, priority_level, source_url
) VALUES 
(
  'ares',
  'ARES Meta-Coaching Protocol',
  'ARES Ultimate Meta-Coaching Framework:

**TOTAL DOMINATION METHODOLOGY:**
1. **Cross-Domain Analysis**: Simultaneous optimization across training, nutrition, recovery, mindset
2. **Limiting Factor Identification**: Find the weakest link in the performance chain
3. **Synergy Amplification**: Leverage interactions between different coaching domains
4. **Aggressive Periodization**: Maximize adaptation through strategic overreaching and recovery

**CORE PRINCIPLES:**
- No single-domain thinking - everything affects everything
- Evidence-based intensity with old-school commitment
- Measurable progress across all KPIs
- Mental toughness as the foundation for physical excellence

**META-TOOLS ACCESS:**
- Lucy: Chrono-nutrition + plant-based optimization
- Sascha: Performance periodization + scientific training
- Kai: Recovery mastery + stress management  
- Vita: Hormone optimization + female-specific protocols

**ULTIMATE OUTCOME:**
Transform users into their absolute peak performance version through total system optimization.',
  'meta_coaching',
  'methodology',
  ARRAY['meta-coaching', 'cross-domain', 'optimization', 'performance'],
  1,
  'ares_internal'
),
(
  'ares', 
  'ARES Total Assessment Framework',
  'ARES 360° User Assessment Protocol:

**PHYSICAL DOMINANCE METRICS:**
- Strength levels and progression rates
- Body composition and muscle mass potential  
- Recovery capacity and injury resistance
- Movement quality and biomechanical efficiency

**NUTRITIONAL MASTERY EVALUATION:**
- Macro precision and timing optimization
- Supplement efficiency and metabolic flexibility
- Hydration patterns and nutrient absorption
- Energy balance and performance fueling

**MENTAL FORTRESS ANALYSIS:**
- Stress resilience and cortisol management
- Focus intensity and motivation sustainability
- Goal commitment and execution consistency
- Mental toughness under pressure

**HORMONAL OPTIMIZATION REVIEW:**
- Testosterone/Estrogen optimization
- Insulin sensitivity and glucose management
- Sleep quality and growth hormone release
- Thyroid function and metabolic rate

**LIFESTYLE INTEGRATION SCORE:**
- Training consistency and progression adherence
- Nutrition compliance and meal execution
- Recovery protocol implementation
- Stress management and life balance

**ULTIMATE VERDICT SYSTEM:**
Elite (90-100%): Ready for maximum intensity protocols
Advanced (80-89%): High-level optimization with minor tweaks
Intermediate (70-79%): Solid foundation, room for major gains
Developing (60-69%): Need fundamental system overhaul
Beginner (<60%): Complete lifestyle transformation required',
  'assessment',
  'framework', 
  ARRAY['assessment', '360-evaluation', 'metrics', 'optimization'],
  1,
  'ares_internal'
),
(
  'ares',
  'ARES Ultimate Training Synthesis',
  'ARES Training Mastery - Fusion of All Methodologies:

**OLD-SCHOOL MASS BUILDING (Markus Legacy):**
- Heavy compound movements as foundation
- Progressive overload with brutal consistency  
- High volume for hypertrophy maximization
- Mental toughness through iron discipline

**EVIDENCE-BASED PRECISION (Sascha Methods):**
- Periodization for peak performance
- Scientific load management and recovery
- Heart rate variability guided training
- Data-driven progression optimization

**RECOVERY-OPTIMIZED TRAINING (Kai Wisdom):**
- Stress-adapted training loads
- Recovery window maximization
- Sleep-training synchronization
- Autoregulated intensity based on readiness

**HORMONE-SYNCHRONIZED PROTOCOLS (Vita Insights):**
- Menstrual cycle periodization for women
- Hormone-optimized training timing
- Gender-specific recovery patterns
- Life stage adapted progressions

**METABOLIC-NUTRITIONAL INTEGRATION (Lucy Expertise):**
- Training-nutrition timing precision
- Plant-based performance optimization
- Chrono-training for circadian alignment
- Sustainable intensity for longevity

**ARES SYNTHESIS PROTOCOL:**
Combine all methodologies based on individual assessment, current goals, and limiting factors. No single approach - total system optimization for ultimate human performance.',
  'training_synthesis',
  'methodology',
  ARRAY['training', 'synthesis', 'multi-methodology', 'optimization'],
  1,
  'ares_internal'
)
ON CONFLICT DO NOTHING;