-- Kai's Transformations-Naturgesetz in die Wissensdatenbank einfügen
INSERT INTO scientific_papers (
  title,
  authors,
  abstract,
  key_findings,
  practical_applications,
  coach_relevance,
  publication_year,
  keywords
) VALUES (
  'Transformations-Naturgesetz nach Kai',
  ARRAY['Kai'],
  'Ein fundamentales Prinzip für erfolgreiche Transformation: Die Bereitschaft zur Erfüllung der notwendigen Bedingungen ist entscheidend für den Erfolg jeder Veränderung.',
  ARRAY[
    'Transformation erfordert die Bereitschaft, notwendige Bedingungen zu erfüllen',
    'Ohne diese Bereitschaft stellt sich kein Erfolg ein',
    'Bedingungen können auch durch andere erfüllt werden lassen',
    'Dies ist ein Naturgesetz der Veränderung'
  ],
  ARRAY[
    'Vor jeder Coaching-Intervention die notwendigen Bedingungen identifizieren',
    'Bereitschaft des Klienten zur Erfüllung der Bedingungen abklären',
    'Alternative Wege zur Bedingungserfüllung erkunden',
    'Realistische Erwartungen basierend auf Bereitschaft setzen'
  ],
  '{
    "relevance_score": 10,
    "application_contexts": ["goal_setting", "transformation", "coaching", "mindset"],
    "coaching_priority": "fundamental_principle",
    "usage_frequency": "always"
  }',
  2025,
  ARRAY['transformation', 'naturgesetz', 'bedingungen', 'erfolg', 'coaching', 'veränderung', 'bereitschaft']
);