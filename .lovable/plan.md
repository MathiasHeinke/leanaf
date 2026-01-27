
# Refactoring: Profil-Sektion Optimierung

## Zusammenfassung

Die Profilseite hat zwei Probleme:
1. **Redundante "Tägliche Makros" Sektion** - zeigt exakt dieselben Werte wie bereits in "Protokoll-Intensität" angezeigt
2. **Falsche Reihenfolge** - "Intelligente Kalorien-Analyse" ist nicht logisch platziert

## Änderungen

### Aktuelle Reihenfolge:
```text
1. Körperdaten
2. Ziele
3. Protokoll-Intensität (enthält Makro-Anzeige)
4. Medical Screening
5. Tägliche Makros ← REDUNDANT (entfernen)
6. Intelligente Kalorien-Analyse ← FALSCH PLATZIERT
7. Ziel-Analyse
```

### Neue Reihenfolge:
```text
1. Körperdaten
2. Ziele
3. Intelligente Kalorien-Analyse ← HIERHER VERSCHIEBEN
4. Protokoll-Intensität (enthält Makro-Anzeige)
5. Medical Screening
6. Ziel-Analyse
```

## Technische Umsetzung

### Datei: `src/pages/Profile.tsx`

| Zeilen | Änderung |
|--------|----------|
| 1144-1174 | **Löschen**: Komplette "Tägliche Makros" Sektion (ca. 30 Zeilen) |
| 1176-1236 | **Verschieben**: "Intelligente Kalorien-Analyse" Block direkt nach "Ziele" (nach Zeile 1029) |

### Begründung:
- **Redundanz entfernen**: "Tägliche Makros" zeigt `calculateMacroGrams()` - exakt dieselben Werte wie `currentMacros` in der Protokoll-Intensität Sektion
- **Logischer Flow**: Intelligente Kalorien-Analyse (BMR, TDEE, Zielkalorien) → Protokoll-Intensität (Makros basierend auf Kalorien)

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| 2 Makro-Anzeigen (redundant) | 1 Makro-Anzeige (in Protokoll-Intensität) |
| Kalorien-Analyse nach Makros | Kalorien-Analyse vor Protokoll-Intensität |
| User sieht gleiche Daten 2x | Klarer, logischer Flow |
