
# Fix: Sleep Quality Skalen-Konflikt

## Problem-Diagnose

Das System hat einen **kritischen Skalen-Konflikt**:

| Komponente | Skala | Beispiel |
|------------|-------|----------|
| SleepLogger (neu) | 1-5 Emoji | 😫→😕→😐→💪→🚀 |
| QuickSleepInput (alt) | 1-10 Slider | 1→10 |
| useAresBioAge | Erwartet 1-10 | Rechnet `quality * 10` |

### Datenbankdaten zeigen den Konflikt:
- 2026-01-27: `sleep_quality: 4` (neues Emoji-System, 1-5)
- 2026-01-24: `sleep_quality: 7` (altes Slider-System, 1-10)
- 2025-08-17: `sleep_quality: 7` (altes System, 1-10)

### Auswirkung:
- Alter Wert 7/10 → Bio-Age rechnet 70/100 (korrekt)
- Neuer Wert 3/5 ("Okay" Emoji) → Bio-Age rechnet 30/100 (falsch!)
  - Sollte: 3/5 = 60% → Score 60/100

---

## Empfohlene Lösung: SleepLogger normalisiert auf 1-10

Der SleepLogger soll beim Speichern die 1-5 Emoji-Skala auf 1-10 konvertieren. So bleibt die DB konsistent.

### Mapping:
| Emoji | Input (1-5) | Gespeichert (1-10) |
|-------|-------------|-------------------|
| 😫 Miserabel | 1 | 2 |
| 😕 Schlecht | 2 | 4 |
| 😐 Okay | 3 | 6 |
| 💪 Gut | 4 | 8 |
| 🚀 Top | 5 | 10 |

### Datei: `src/components/home/loggers/SleepLogger.tsx`

Zeile 94 ändern:

```typescript
// VORHER:
sleep_quality: quality, // Now 1-5 directly

// NACHHER:
sleep_quality: quality * 2, // Convert 1-5 → 2-10 for DB consistency
```

---

## Alternative: Zurück zu Slider

Falls gewünscht, können wir das Emoji-System durch einen 1-10 Slider ersetzen (wie in QuickSleepInput). Dies würde bedeuten:

### Datei: `src/components/home/loggers/SleepLogger.tsx`

Komplett neues UI-Element für Quality:

```typescript
{/* 1-10 SLIDER statt Emojis */}
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Schlafqualität</span>
    <span className="font-medium">{quality}/10</span>
  </div>
  <Slider
    value={[quality]}
    onValueChange={([val]) => setQuality(val)}
    min={1}
    max={10}
    step={1}
    className="w-full"
  />
  <div className="flex justify-between text-xs text-muted-foreground">
    <span>😫 Schlecht</span>
    <span>🚀 Perfekt</span>
  </div>
</div>
```

---

## Empfehlung

**Option A (Emoji mit Konvertierung)** ist besser weil:
- Benutzerfreundlicher (5 klare Optionen vs. 10 Slider-Stufen)
- Schnellere Eingabe (Tap statt Drag)
- Konsistent mit Libido/Motivation im gleichen Screen
- DB bleibt abwärtskompatibel

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/home/loggers/SleepLogger.tsx` | EDIT | `quality * 2` beim Speichern |

---

## Erwartetes Ergebnis

Nach dem Fix:
- Emoji "Okay" (3) → Speichert 6 in DB → Bio-Age Score 60/100
- Emoji "Gut" (4) → Speichert 8 in DB → Bio-Age Score 80/100
- Alte Daten bleiben korrekt (bereits 1-10)
- Bio-Age Algorithmus muss nicht geändert werden

