
# Fix: Makrostrategie wird nicht gespeichert (Check Constraint)

## Problem

Das Speichern von `elite`, `warrior` oder `rookie` als `macro_strategy` schlägt fehl, weil ein **Datenbank CHECK CONSTRAINT** nur alte Werte erlaubt.

### Fehler in den Logs:
```
new row for relation "profiles" violates check constraint "macro_strategy_check"
```

### Aktuell erlaubte Werte:
| Erlaubt ✅ | Nicht erlaubt ❌ |
|-----------|------------------|
| `standard` | `rookie` |
| `high_protein` | `warrior` |
| `balanced` | `elite` |
| `low_carb` | |
| `athletic` | |
| `custom` | |

---

## Lösung

### Schritt 1: Datenbank-Migration

Der CHECK CONSTRAINT muss aktualisiert werden, um die neuen Protein Anchor Werte zu erlauben:

```sql
-- Alten Constraint entfernen
ALTER TABLE profiles DROP CONSTRAINT macro_strategy_check;

-- Neuen Constraint mit erweiterten Werten erstellen
ALTER TABLE profiles ADD CONSTRAINT macro_strategy_check 
CHECK (macro_strategy IN (
  -- Legacy-Werte (für bestehende User)
  'standard', 'high_protein', 'balanced', 'low_carb', 'athletic', 'custom',
  -- Neue Protein Anchor Werte
  'rookie', 'warrior', 'elite'
));
```

### Schritt 2: Bestehende Daten migrieren (optional)

Migriere Legacy-Werte zu neuen Werten für Konsistenz:

```sql
-- high_protein → warrior (beide sind 2.0g/kg)
UPDATE profiles SET macro_strategy = 'warrior' WHERE macro_strategy = 'high_protein';

-- low_carb → elite (aggressiver Ansatz)
UPDATE profiles SET macro_strategy = 'elite' WHERE macro_strategy = 'low_carb';

-- Alles andere → warrior (sicherster Default)
UPDATE profiles SET macro_strategy = 'warrior' 
WHERE macro_strategy NOT IN ('rookie', 'warrior', 'elite');
```

---

## Technische Details

### Warum passiert das?
1. User wählt "ELITE" im UI
2. `handleIntensityChange('elite')` wird aufgerufen
3. `setMacroStrategy('elite')` aktualisiert den React State
4. Auto-Save triggert `performSave()`
5. `UPDATE profiles SET macro_strategy = 'elite' ...` wird ausgeführt
6. **DB lehnt ab**: `CHECK constraint violation`
7. **Fehler wird geschluckt** (kein Toast, nur Console Log)
8. User navigiert weg, kommt zurück
9. `loadProfile()` lädt den alten Wert (`high_protein`)
10. `mapLegacyStrategy('high_protein')` → zeigt "WARRIOR" an

### Dateien die geändert werden:

| Ressource | Änderung |
|-----------|----------|
| Supabase Migration | CHECK CONSTRAINT aktualisieren |
| `src/pages/Profile.tsx` | (Optional) Bessere Error-Anzeige bei Save-Fehlern |

---

## Erwartetes Ergebnis

### Vorher:
- User wählt ELITE
- Save schlägt still fehl (Constraint Violation)
- Beim Zurückkehren: wieder WARRIOR (alter DB-Wert)

### Nachher:
- User wählt ELITE
- Save erfolgreich (`macro_strategy = 'elite'`)
- Beim Zurückkehren: ELITE (korrekter DB-Wert)
- NutritionWidget zeigt: "🏆 2.5g/kg Protein"
