

# Merge: Kalorien & Ziel-Analyse + Deine Makros

## Aktueller Zustand

Die Information ist auf 2 separate Cards verteilt:
- **Card 1**: BMR / TDEE / Ziel + Defizit-Stats (8.5kg, 546 kcal/Tag, etc.)
- **Card 2**: Protokoll-Intensität mit Makros am Ende (202g/136g/91g)

## Ziel

Eine kompakte, einheitliche **"Kalorien & Makro-Übersicht"** Card:

```text
+--------------------------------------------------+
|                                                  |
|    1977         2718         2172                |
|     BMR          TDEE         Ziel               |
|  Grundumsatz  Tagesbedarf   Kalorien             |
|                                                  |
+--------------------------------------------------+
|  8.5 kg    546      3822       17w               |
|  ↓ Diff    kcal/Tag kcal/Wo   verbleibend        |
+--------------------------------------------------+
|                                                  |
|   202g        136g          91g                  |
|   Protein     Carbs         Fett                 |
|                                                  |
|   [●●●●●●●●●●] Genauigkeit 95%                   |
+--------------------------------------------------+
```

## Änderungen

### In `src/pages/Profile.tsx`

**1. Makro-Zeile in "Kalorien & Ziel-Analyse" Card verschieben**

Die Makro-Grid (Zeilen 1080-1092) wird aus der "Protokoll-Intensität" Card entfernt und in die "Kalorien & Ziel-Analyse" Card integriert – zwischen den Defizit-Stats und der Genauigkeitszeile.

**2. Header umbenennen**

Von "Kalorien & Ziel-Analyse" zu "Kalorien & Makros" (kompakter).

**3. Layout-Struktur der neuen Card**

```text
┌─────────────────────────────────────────────────┐
│ 🧠 Kalorien & Makros                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ [BMR / TDEE / Ziel] - 3-column grid             │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ [Defizit-Stats] - 4-column grid (wenn Delta≠0) │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ [Makros] - 3-column grid (P/C/F)                │
│                                                 │
├─────────────────────────────────────────────────┤
│ Genauigkeit                            ● 95%    │
└─────────────────────────────────────────────────┘
```

**4. Aus "Protokoll-Intensität" entfernen**

Der "Deine Makros" Block (Zeilen 1075-1099) wird aus der Protokoll-Intensität Card gelöscht – diese zeigt dann nur noch die 3 Intensitäts-Optionen (Rookie/Warrior/Elite).

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| 2 separate Cards | 1 kompakte Card |
| Makros am Ende versteckt | Makros prominent sichtbar |
| Doppelte Gewichts-Info | Einmalige Anzeige im Header |
| ~70 Zeilen UI-Code | ~50 Zeilen UI-Code |

## Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/Profile.tsx` | Makro-Grid in Kalorien-Card verschieben, Header umbenennen, Cleanup in Protokoll-Card |

