

# RelevanceScorePopover oeffnet nicht - Diagnose und Fix

## Diagnose

Das Problem liegt im Zusammenspiel von Radix Popover und dem Badge-Element:

### Aktuelle Architektur (fehlerhaft)

```text
<PopoverTrigger asChild>        <-- erwartet klickbares Element
  <Badge>                       <-- ist nur ein div, kein Button
    "Essential"
  </Badge>
</PopoverTrigger>
```

### Das Problem

1. **`asChild` erwartet ein interaktives Element**: Radix UI's PopoverTrigger mit `asChild` merged die Click-Handler in das Child-Element
2. **Badge ist kein Button**: Das Shadcn Badge ist ein einfaches `<div>` ohne native Click-Funktionalitaet
3. **Click-Events werden nicht richtig gebunden**: Das Badge empfaengt keine Pointer-Events oder die Ref-Weiterleitung fehlt

### Zusaetzliches Problem

Der Score ist nur im **Expanded State** sichtbar - im Collapsed State (Screenshot zeigt 10.0 | Essential) gibt es keinen klickbaren Score.

## Loesung

### Fix 1: Badge durch Button ersetzen

Im ExpandableSupplementChip muss das Badge in einen Button gewrapped werden, damit `asChild` korrekt funktioniert:

```tsx
<RelevanceScorePopover
  scoreResult={scoreResult}
  supplementName={item.name}
>
  <button className="...">
    <Badge>Essential</Badge>
  </button>
</RelevanceScorePopover>
```

### Fix 2: Score auch im Collapsed State anzeigen

Fuer bessere UX sollte der Score auch im zugeklappten Chip sichtbar und klickbar sein.

## Dateiaenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/components/supplements/ExpandableSupplementChip.tsx` | Badge durch interaktives Button-Element ersetzen im Expanded State |

## Technischer Fix

### Zeilen 495-509 anpassen:

```tsx
<RelevanceScorePopover
  scoreResult={scoreResult}
  supplementName={item.name}
>
  <button
    type="button"
    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
  >
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] shrink-0 cursor-pointer hover:opacity-80',
        tierConfig.borderClass,
        tierConfig.textClass
      )}
    >
      {tierConfig.labelShort}
    </Badge>
  </button>
</RelevanceScorePopover>
```

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| Badge nicht klickbar | Badge klickbar via button wrapper |
| Popover oeffnet nicht | Popover oeffnet beim Klick |
| Score-Details nicht sichtbar | Detaillierte Aufschluesselung erscheint |

