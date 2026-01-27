

# Datenbank-Migration: Macro Strategy CHECK CONSTRAINT aktualisieren

## Problem (bestätigt durch DB-Logs)

Die Fehlermeldung aus den Postgres-Logs:
```
new row for relation "profiles" violates check constraint "macro_strategy_check"
```

Die neuen Werte `rookie`, `warrior`, `elite` werden von der Datenbank abgelehnt.

---

## Lösung

### Schritt 1: CHECK CONSTRAINT aktualisieren

SQL-Migration die ausgeführt wird:

```sql
-- Alten Constraint entfernen
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS macro_strategy_check;

-- Neuen Constraint mit allen erlaubten Werten erstellen
ALTER TABLE profiles ADD CONSTRAINT macro_strategy_check 
CHECK (macro_strategy IN (
  'standard', 'high_protein', 'balanced', 'low_carb', 'athletic', 'custom',
  'rookie', 'warrior', 'elite'
));
```

### Schritt 2: Bestehende Legacy-Daten migrieren

Damit alle User konsistent die neuen Werte haben:

```sql
-- high_protein → warrior (beide sind 2.0g/kg)
UPDATE profiles SET macro_strategy = 'warrior' WHERE macro_strategy = 'high_protein';

-- low_carb → elite (aggressiver Ansatz)  
UPDATE profiles SET macro_strategy = 'elite' WHERE macro_strategy = 'low_carb';

-- Restliche Legacy-Werte → warrior (sicherster Default)
UPDATE profiles SET macro_strategy = 'warrior' 
WHERE macro_strategy IN ('standard', 'balanced', 'athletic', 'custom');
```

---

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| ELITE auswählen → Save schlägt fehl | ELITE auswählen → Save erfolgreich |
| Zurückkehren → WARRIOR (alter Wert) | Zurückkehren → ELITE (gespeicherter Wert) |
| NutritionWidget: "⚔️ 2.0g/kg" | NutritionWidget: "🏆 2.5g/kg" |

