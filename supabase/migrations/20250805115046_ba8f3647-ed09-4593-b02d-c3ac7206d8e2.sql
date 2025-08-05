-- Kritische Bereinigung: Entfernung der geschützten Begrifflichkeit "Consciousness Coaching" 
-- und Ersetzung durch "Conscious Coaching" in allen Knowledge Base Einträgen

-- 1. Update: "Consciousness Coaching Grundlagen" -> "Conscious Coaching Grundlagen"
UPDATE coach_knowledge_base 
SET 
  title = 'Conscious Coaching Grundlagen',
  content = replace(content, 'Consciousness Coaching', 'Conscious Coaching'),
  tags = array_replace(tags, 'consciousness', 'conscious')
WHERE coach_id = 'kai' AND title = 'Consciousness Coaching Grundlagen';

-- 2. Update: "Vier-Quadranten + Consciousness Integration" -> "Vier-Quadranten + Conscious Integration"
UPDATE coach_knowledge_base 
SET 
  title = 'Vier-Quadranten + Conscious Integration',
  content = replace(content, 'Consciousness Coaching', 'Conscious Coaching'),
  content = replace(content, 'Consciousness Integration', 'Conscious Integration'),
  tags = array_replace(tags, 'consciousness', 'conscious')
WHERE coach_id = 'kai' AND title = 'Vier-Quadranten + Consciousness Integration';

-- 3. Update: "Die Fünf Consciousness Coaching Kernwerte" -> "Die Fünf Conscious Coaching Kernwerte"
UPDATE coach_knowledge_base 
SET 
  title = 'Die Fünf Conscious Coaching Kernwerte',
  content = replace(content, 'Consciousness Coaching', 'Conscious Coaching'),
  tags = array_replace(tags, 'consciousness', 'conscious')
WHERE coach_id = 'kai' AND title = 'Die Fünf Consciousness Coaching Kernwerte';

-- 4. Update: "Consciousness-Typen nach Wilber" -> "Conscious-Typen nach Wilber"
UPDATE coach_knowledge_base 
SET 
  title = 'Conscious-Typen nach Wilber',
  content = replace(content, 'Consciousness-Typen', 'Conscious-Typen'),
  content = replace(content, 'Consciousness Coaching', 'Conscious Coaching'),
  tags = array_replace(tags, 'consciousness', 'conscious')
WHERE coach_id = 'kai' AND title = 'Consciousness-Typen nach Wilber';

-- 5. Update: "Consciousness Assessment Framework" -> "Conscious Assessment Framework"
UPDATE coach_knowledge_base 
SET 
  title = 'Conscious Assessment Framework',
  content = replace(content, 'Consciousness Assessment', 'Conscious Assessment'),
  content = replace(content, 'Consciousness Coaching', 'Conscious Coaching'),
  tags = array_replace(tags, 'consciousness', 'conscious')
WHERE coach_id = 'kai' AND title = 'Consciousness Assessment Framework';

-- Weitere Sicherheitsbereinigung: Alle weiteren Einträge mit "Consciousness" im Content
UPDATE coach_knowledge_base 
SET content = replace(content, 'Consciousness Coaching', 'Conscious Coaching')
WHERE coach_id = 'kai' AND content LIKE '%Consciousness Coaching%';

-- Tags-Bereinigung für alle Kai-Einträge
UPDATE coach_knowledge_base 
SET tags = array_replace(tags, 'consciousness', 'conscious')
WHERE coach_id = 'kai' AND 'consciousness' = ANY(tags);