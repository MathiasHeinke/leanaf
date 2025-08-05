-- Kai's zweites Naturgesetz "Sein, tun, haben" in die Wissensdatenbank einfügen
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
  'Sein-Tun-Haben Naturgesetz nach Kai',
  ARRAY['Kai'],
  'Das fundamentale Prinzip der richtigen Reihenfolge für Transformation: Sein → Tun → Haben. Erst wird man zu jemandem, der die notwendigen Dinge tut, um das zu erhalten, was man sich zugesteht.',
  ARRAY[
    'Die richtige Reihenfolge ist: Sein → Tun → Haben',
    'Viele Menschen denken fälschlicherweise: Haben → Tun → Sein',
    'Zuerst muss man die Identität annehmen (Sein)',
    'Dann die entsprechenden Handlungen ausführen (Tun)',
    'Erst dadurch erhält man die gewünschten Ergebnisse (Haben)',
    'Man bekommt nur das, was man sich selbst zugesteht'
  ],
  ARRAY[
    'Identitätsarbeit vor Aktionsplanung',
    'Klienten dabei helfen, sich als die Person zu sehen, die sie werden möchten',
    'Handlungen aus der neuen Identität heraus ableiten',
    'Selbstwert und Zugehörigkeitsgefühl stärken',
    'Glaubenssätze über das eigene Verdienen hinterfragen'
  ],
  '{
    "relevance_score": 10,
    "application_contexts": ["identity_work", "transformation", "self_worth", "goal_achievement", "mindset_coaching"],
    "coaching_priority": "fundamental_principle",
    "usage_frequency": "always"
  }',
  2025,
  ARRAY['identität', 'sein', 'tun', 'haben', 'transformation', 'naturgesetz', 'selbstwert', 'coaching', 'reihenfolge']
);