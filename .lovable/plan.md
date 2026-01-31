
# UI-Update: ARES Matrix v2.3 FINAL Versionslabels

## Problem
Die Admin-Oberfläche zeigt noch veraltete Versionsnummern:
- **Admin.tsx**: "Matrix Import v2.0" / "CSV Matrix v2.0 importieren"
- **MatrixImportRunner.tsx**: Referenziert noch "v2.1" Markdown

Die tatsächliche CSV-Datei und Import-Logik sind bereits auf **v2.3 FINAL** aktualisiert.

---

## Betroffene Dateien

| Datei | Zeile | Aktueller Text | Neuer Text |
|-------|-------|----------------|------------|
| `src/pages/Admin.tsx` | 323 | `{/* CSV Matrix Import v2.0 Card */}` | `{/* CSV Matrix Import v2.3 Card */}` |
| `src/pages/Admin.tsx` | 328 | `Matrix Import v2.0` | `Matrix Import v2.3` |
| `src/pages/Admin.tsx` | 330-331 | `84 Wirkstoffe...` | `86 Wirkstoffe mit wissenschaftlich validierten Modifiern (Phase 1-4). NAD+/GLP-1/TRT/Goals/Peptid-Synergien.` |
| `src/pages/Admin.tsx` | 343 | `Importiere Matrix v2.0...` | `Importiere Matrix v2.3...` |
| `src/pages/Admin.tsx` | 348 | `CSV Matrix v2.0 importieren` | `CSV Matrix v2.3 importieren` |
| `src/pages/Admin/MatrixImportRunner.tsx` | 11 | `matrix-import-v2.1.md?raw` | Entweder auf v2.3 umstellen oder als Legacy markieren |

---

## Änderungen

### 1. Admin.tsx - Version-Labels aktualisieren

**Zeile 323-351:**
```typescript
{/* CSV Matrix Import v2.3 Card */}
<Card className="bg-background border-border dark:bg-card dark:border-border">
  <CardHeader>
    <CardTitle className="flex items-center text-foreground dark:text-foreground">
      <Database className="w-5 h-5 mr-2" />
      Matrix Import v2.3
    </CardTitle>
    <CardDescription>
      86 Wirkstoffe mit wissenschaftlich validierten Modifiern (Phase 1-4). 
      NAD+/GLP-1/TRT/Goals/Peptid-Synergien.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <Button 
      onClick={handleCSVMatrixImport} 
      disabled={isImportingCSV}
      className="w-full"
    >
      {isImportingCSV ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Importiere Matrix v2.3...
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          CSV Matrix v2.3 importieren
        </>
      )}
    </Button>
    ...
```

### 2. MatrixImportRunner.tsx (Optional: Legacy-Markierung)

Diese Datei verwendet noch das alte **Markdown-Format** (v2.1), nicht das neue CSV. 

**Optionen:**
- A) Als "Legacy Markdown Import" kennzeichnen (für Rückwärtskompatibilität)
- B) Auf CSV v2.3 umstellen (würde separate Parser-Logik benötigen)
- C) Datei entfernen, wenn nicht mehr benötigt

**Empfehlung:** Option A - Beschreibung aktualisieren:
```typescript
<p className="text-muted-foreground mt-1">
  [Legacy] Markdown-basierter Import (v2.1). 
  Verwende den CSV Matrix v2.3 Import auf der Admin-Hauptseite für aktuelle Daten.
</p>
```

---

## Zusammenfassung der Änderungen

| Aktion | Datei |
|--------|-------|
| **BEARBEITEN** | `src/pages/Admin.tsx` - Alle "v2.0" Labels auf "v2.3" ändern |
| **BEARBEITEN** | `src/pages/Admin/MatrixImportRunner.tsx` - Legacy-Hinweis hinzufügen |

---

## Erwartetes Ergebnis

Nach dem Update zeigt die Admin-UI korrekt:
- **"Matrix Import v2.3"** im Card-Titel
- **"86 Wirkstoffe mit wissenschaftlich validierten Modifiern (Phase 1-4)"** in der Beschreibung
- **"CSV Matrix v2.3 importieren"** auf dem Button
- Der MatrixImportRunner wird als Legacy gekennzeichnet
