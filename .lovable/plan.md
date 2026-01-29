

# Plan: Doppelte Close-Buttons entfernen

## Problem-Analyse

| Sheet | Komponente | X-Buttons | Status |
|-------|------------|-----------|--------|
| TrainingDaySheet | Eigene Motion | 1 | OK |
| HydrationDaySheet | Eigene Motion | 1 | OK |
| **SleepDaySheet** | Shadcn Sheet | 2 | Zu fixen |
| NutritionDaySheet | ? | ? | Zu pruefen |
| SupplementsDaySheet | ? | ? | Zu pruefen |
| BioAgeSheet | ? | ? | Zu pruefen |
| BodyTrendSheet | ? | ? | Zu pruefen |
| PeptidesSheet | ? | ? | Zu pruefen |

## Ursache

Die Shadcn `SheetContent`-Komponente rendert automatisch einen X-Button:

```tsx
// src/components/ui/sheet.tsx (Zeile 66-69)
<SheetPrimitive.Close className="absolute right-4 top-4 ...">
  <X className="h-4 w-4" />
</SheetPrimitive.Close>
```

Wenn ein Sheet diese Komponente nutzt und zusaetzlich einen manuellen X-Button im Header hat, entstehen zwei.

## Loesung

Zwei Optionen:

**Option A: Manuellen Button entfernen (Empfohlen)**
- Den manuellen X-Button im Header der betroffenen Sheets entfernen
- Der eingebaute SheetContent-Button bleibt (konsistent mit Shadcn Design)

**Option B: SheetContent anpassen**
- Eine Prop `hideCloseButton` zur SheetContent-Komponente hinzufuegen
- Sheets behalten ihre eigenen gestylten X-Buttons

Ich empfehle **Option A** fuer Konsistenz.

## Mobile UX Entscheidung

Fuer Mobile brauchen wir nur **einen** Schliessen-Mechanismus. Wir behalten:
- Drag-to-dismiss (Handle Bar)
- Backdrop-Click
- 1 X-Button (fuer Accessibility und klare Affordance)

## Aenderungen

### 1. SleepDaySheet.tsx

Den manuellen X-Button im Header entfernen:

```tsx
// VORHER (Zeile 245-258)
<div className="flex items-center justify-between px-5 pb-4 border-b ...">
  <div>
    <h2>Schlaf-Analyse</h2>
    <p>...</p>
  </div>
  <button onClick={onClose}>  // <- ENTFERNEN
    <X className="w-5 h-5" />
  </button>
</div>

// NACHHER
<div className="flex items-center justify-between px-5 pb-4 border-b ...">
  <div>
    <h2>Schlaf-Analyse</h2>
    <p>...</p>
  </div>
  {/* Kein manueller X-Button - SheetContent hat bereits einen */}
</div>
```

### 2. Andere Sheets pruefen

Falls weitere Sheets die Shadcn Sheet-Komponente nutzen:
- NutritionDaySheet
- SupplementsDaySheet
- BioAgeSheet
- BodyTrendSheet
- PeptidesSheet

Alle pruefen und gegebenenfalls den doppelten Button entfernen.

## Ergebnis

- Alle Sheets haben genau 1 Close-Button
- Konsistentes Verhalten auf Mobile und Desktop
- Keine Verwirrung fuer den Nutzer

## Aufwand

| Task | Zeit |
|------|------|
| SleepDaySheet fixen | 2 min |
| Andere Sheets pruefen | 5 min |
| Testen | 3 min |

**Gesamt: ca. 10 Minuten**

