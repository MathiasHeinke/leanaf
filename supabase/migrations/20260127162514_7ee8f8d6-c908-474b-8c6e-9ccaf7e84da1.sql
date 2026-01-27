-- Schritt 1: Alten Constraint entfernen
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS macro_strategy_check;

-- Schritt 2: Neuen Constraint mit allen erlaubten Werten erstellen
ALTER TABLE profiles ADD CONSTRAINT macro_strategy_check 
CHECK (macro_strategy IN (
  'standard', 'high_protein', 'balanced', 'low_carb', 'athletic', 'custom',
  'rookie', 'warrior', 'elite'
));

-- Schritt 3: Legacy-Daten zu neuen Werten migrieren
UPDATE profiles SET macro_strategy = 'warrior' WHERE macro_strategy = 'high_protein';
UPDATE profiles SET macro_strategy = 'elite' WHERE macro_strategy = 'low_carb';
UPDATE profiles SET macro_strategy = 'warrior' WHERE macro_strategy IN ('standard', 'balanced', 'athletic', 'custom');