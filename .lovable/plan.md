

# Bug-Fix: CSV Parser erkennt v2.3 Matrix nicht (BOM-Problem)

## Problem-Diagnose

Der Import zeigt **0 Einträge** weil die CSV-Datei ein **UTF-8 BOM (Byte Order Mark)** am Anfang hat:

```
﻿# ARES Matrix v2.3 FINAL...  ← Unsichtbares BOM-Zeichen vor dem #
```

Der Parser-Code in `parseCSVContent()` sucht nach `startsWith('#')`, aber findet `startsWith('﻿#')` - das matcht nicht!

**Konsequenz:** Die erste Zeile wird als Header-Zeile interpretiert, die Spalten heißen dann `# ARES Matrix v2.3 FINAL...` statt `name,category,...`, und kein Eintrag hat ein gültiges `name`-Feld.

---

## Lösung

### Schritt 1: CSV-Datei ohne BOM speichern

Die Datei `src/data/ares-matrix-v2.3.csv` muss ohne BOM gespeichert werden.

**Aktuelle erste Zeile (mit BOM):**
```
﻿# ARES Matrix v2.3 FINAL | Wissenschaftlich Validiert | Phase 1-4 Complete
```

**Korrigierte erste Zeile (ohne BOM):**
```
# ARES Matrix v2.3 FINAL | Wissenschaftlich Validiert | Phase 1-4 Complete
```

### Schritt 2: Parser defensiver machen (BOM-Stripping)

Als zusätzliche Sicherheit den Parser anpassen, um BOM-Zeichen automatisch zu entfernen:

**Datei:** `src/lib/matrixCSVParser.ts`

In der `parseCSVContent()` Funktion am Anfang:

```typescript
function parseCSVContent(content: string): Record<string, string>[] {
  // Remove BOM if present (UTF-8: EF BB BF, encoded as \ufeff)
  const cleanedContent = content.replace(/^\ufeff/, '');
  
  const lines = cleanedContent.split('\n').filter(line => line.trim());
  // ... rest of function
}
```

---

## Dateien-Übersicht

| Datei | Aktion |
|-------|--------|
| `src/data/ares-matrix-v2.3.csv` | **BEARBEITEN** - BOM entfernen (Zeile 1) |
| `src/lib/matrixCSVParser.ts` | **BEARBEITEN** - BOM-Stripping hinzufügen (defensiv) |

---

## Erwartetes Ergebnis nach Fix

Nach dem Import:
- **Geparst:** 84-86
- **Gematcht:** ~80+
- **Aktualisiert:** ~80+
- **Übersprungen:** einige (Multi-Ingredient Stacks)

Die Matrix v2.3 FINAL mit allen Phase 1-4 Modifiern wird korrekt in die Datenbank geschrieben.

