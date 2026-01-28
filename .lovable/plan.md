

# Training Logger: RPE-Intensität + Verstecktes Volumen

## Zusammenfassung

Der TrainingLogger braucht:
1. **RPE-Eingabe (1-10)**: Wie hart war das Training? Wichtig für Auswertungen und Recovery-Empfehlungen
2. **Volumen-Feld verstecken**: Für Kraft-Training weiterhin möglich, aber als "Profi-Option" einklappbar

## Aktuelle Situation

Der TrainingLogger hat:
- Workout-Typ-Auswahl (Kraft, Zone 2, VO2max, Sauna, Bewegung, Ruhetag)
- Splits-Auswahl bei Kraft
- Volumen-Eingabe bei Kraft (sichtbar)
- Dauer-Eingabe bei Cardio/Sauna
- **Keine RPE-Eingabe**

Die `training_sessions` Tabelle speichert Daten in `session_data` (JSONB) - dort kann RPE abgelegt werden.

## Die Lösung

### 1. RPE-Slider/Buttons für alle Workout-Typen (außer Ruhetag)

Nach der Typ-spezifischen Detail-Sektion kommt eine RPE-Eingabe:
- **Design**: Horizontale Buttons 1-10 im Apple Health Stil (wie Sauna-Temperatur)
- **Farbverlauf**: 1-5 grün/blau → 6-8 gelb/orange → 9-10 rot
- **Labels**: Unter den Buttons "Leicht" links, "Maximum" rechts
- **Default**: Kein Default (User muss auswählen, aber optional)

### 2. Volumen als eingeklappte "Profi-Option"

Das bestehende Volumen-Feld bei Kraft wird:
- Standardmäßig eingeklappt in einem Collapsible
- "Profi-Optionen" oder "Mehr Details" Label
- Enthält: Volumen (kg), später auch Sätze/Wiederholungen

## Technische Umsetzung

### Datei: `src/components/home/loggers/TrainingLogger.tsx`

#### Neue State-Variable
```typescript
const [rpe, setRpe] = useState<number | null>(null);
const [showAdvanced, setShowAdvanced] = useState(false);
```

#### RPE in handleSave() speichern
```typescript
// In session_data
if (rpe) {
  sessionData.rpe = rpe;
}

// Beim trackEvent
const success = await trackEvent('workout', { 
  training_type: selectedType,
  // ... existing fields
  session_data: {
    ...sessionData,
    rpe: rpe
  }
});
```

#### Neue UI-Komponente: RPE-Eingabe

Nach den Typ-spezifischen Details (ca. Zeile 520, vor dem Duration-Block):

```tsx
{/* RPE INTENSITY - For all workout types except rest */}
{selectedType && selectedType !== 'rest' && (
  <div className="space-y-3">
    <div className="text-sm font-medium text-muted-foreground">
      Intensität (RPE)
    </div>
    <div className="flex gap-1.5 justify-between">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
        <motion.button
          key={value}
          whileTap={{ scale: 0.9 }}
          onClick={() => setRpe(rpe === value ? null : value)}
          className={cn(
            "flex-1 h-10 rounded-lg text-sm font-semibold transition-all",
            rpe === value
              ? value <= 5 
                ? "bg-emerald-500 text-white ring-2 ring-emerald-400"
                : value <= 8 
                  ? "bg-amber-500 text-white ring-2 ring-amber-400"
                  : "bg-rose-500 text-white ring-2 ring-rose-400"
              : "bg-muted hover:bg-muted/80 text-foreground"
          )}
        >
          {value}
        </motion.button>
      ))}
    </div>
    <div className="flex justify-between text-xs text-muted-foreground px-1">
      <span>Leicht</span>
      <span>Mittel</span>
      <span>Maximum</span>
    </div>
  </div>
)}
```

#### Kraft: Volumen als Collapsible

Das bestehende Volumen-Feld bei Kraft (Zeile 353-364) wird eingeklappt:

```tsx
{selectedType === 'rpt' && (
  <>
    {/* Splits dropdown - existing */}
    <div className="text-sm font-medium text-muted-foreground">Trainierte Splits</div>
    {/* ... existing popover ... */}
    
    {/* Collapsible Advanced Options */}
    <button
      onClick={() => setShowAdvanced(!showAdvanced)}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronDown className={cn(
        "w-3 h-3 transition-transform",
        showAdvanced && "rotate-180"
      )} />
      Profi-Optionen
    </button>
    
    <AnimatePresence>
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 pt-2">
            <label className="text-sm text-muted-foreground">Gesamtvolumen</label>
            <NumericInput
              placeholder="8500"
              value={totalVolume}
              onChange={setTotalVolume}
              allowDecimals={false}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">kg</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
)}
```

## Erwartetes Ergebnis

### Vor dem Update
- Kraft-Training: Nur Splits + Volumen (immer sichtbar)
- Kein Weg die Intensität zu erfassen

### Nach dem Update
- Alle Trainingsarten: RPE 1-10 Buttons mit Farbverlauf
- Kraft-Training: Splits sichtbar, Volumen unter "Profi-Optionen"
- RPE wird in `session_data.rpe` gespeichert

### Beispiel: Kraft-Training loggen
1. User wählt "Kraft" → Splits-Dropdown erscheint
2. Wählt "Push" → Optional: "Profi-Optionen" für Volumen
3. RPE-Buttons erscheinen → Wählt "7" (gelb/orange)
4. Speichern → session_data: `{ splits: ['push'], rpe: 7 }`

## Betroffene Dateien

| Datei | Aktion | Änderungen |
|-------|--------|------------|
| `src/components/home/loggers/TrainingLogger.tsx` | **EDIT** | RPE-State + Buttons, Volumen als Collapsible |

## Datenbank-Kompatibilität

Die `training_sessions` Tabelle hat bereits `session_data` (JSONB) - dort wird RPE gespeichert:
```json
{
  "splits": ["push", "pull"],
  "rpe": 7
}
```

Keine Migration erforderlich.

## Spätere Erweiterungen

1. **RPE im TrainingDaySheet anzeigen**: Hero-Section zeigt RPE neben Dauer/Volumen
2. **RPE-Auswertung**: Durchschnittliche Intensität pro Woche/Monat
3. **Recovery-Empfehlungen**: Hohe RPE (9-10) → Mehr Erholung empfehlen
4. **Volumen-Tracking**: Profi-Optionen erweitern um Sätze/Wiederholungen

