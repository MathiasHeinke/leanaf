
# Fix: Supplement Chip Bearbeitungsmodus - 3 Probleme

## Gefundene Probleme

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Kein Hersteller-Dropdown | `user_supplements.supplement_id = NULL` | ❌ Daten-Problem - muss in DB gefixed werden |
| "Bett"-Label unlogisch | `shortLabel: 'Bett'` in TimingCircleSelector | ✅ Label auf "Nacht" ändern |
| ARES Prompt nicht übergeben | Race Condition: Coach.tsx löscht State zu früh | ✅ State-Clearing mit Delay verschieben |

---

## Fix 1: TimingCircleSelector - Label anpassen

**Datei:** `src/components/supplements/TimingCircleSelector.tsx`

**Änderung:**
```typescript
// VORHER:
bedtime: { icon: BedDouble, label: 'Vor Schlaf', shortLabel: 'Bett' },

// NACHHER:
bedtime: { icon: Moon, label: 'Vor Schlaf', shortLabel: 'Nacht' },
```

Zusätzlich: "Bett"-Icon (BedDouble) durch Mond (Moon) ersetzen - konsistent mit dem Abend-Slot.

---

## Fix 2: Coach.tsx - Race Condition beheben

**Problem:** Der `useEffect` in Coach.tsx löscht den State sofort, bevor AresChat ihn verwenden kann.

**Lösung:** Das State-Clearing muss **nach** dem ersten Render von AresChat erfolgen. Da AresChat 600ms wartet, brauchen wir mindestens 700ms Delay.

**Datei:** `src/pages/Coach.tsx`

**Änderung:**
```typescript
// VORHER (Zeile 33-38):
useEffect(() => {
  if (autoStartPrompt) {
    navigate(location.pathname, { replace: true, state: {} });
  }
}, [autoStartPrompt, navigate, location.pathname]);

// NACHHER:
useEffect(() => {
  if (autoStartPrompt) {
    // Delay state clearing until AFTER AresChat has read the prompt
    // AresChat uses 600ms delay, so we wait 1000ms to be safe
    const timer = setTimeout(() => {
      navigate(location.pathname, { replace: true, state: {} });
    }, 1000);
    return () => clearTimeout(timer);
  }
}, [autoStartPrompt, navigate, location.pathname]);
```

---

## Fix 3: Datenbank-Bereinigung (Info)

**Problem:** 6 von 15 aktiven `user_supplements` haben `supplement_id = NULL`:
- Kreatin Monohydrat
- Omega-3 (EPA/DHA)
- Vitamin D3 + K2
- Whey Protein
- Alpha-Ketoglutarat
- Magnesium (Citrat/Bisglycinat)

**Ursache:** Diese wurden manuell oder per AI erstellt ohne Verknüpfung zur `supplement_database`.

**Empfehlung:** Diese Supplements müssen in der Datenbank mit den korrekten `supplement_id`s verknüpft werden. Dies erfordert ein SQL-Update oder UI-Logik zum Matchen.

---

## Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `src/components/supplements/TimingCircleSelector.tsx` | "Bett" → "Nacht", BedDouble → Moon |
| `src/pages/Coach.tsx` | State-Clearing mit 1000ms Delay |

---

## Erwartetes Ergebnis nach Fix

1. ✅ Timing-Kreise zeigen "Nacht" statt "Bett" mit Mond-Icon
2. ✅ ARES Prompt wird korrekt übergeben und ausgeführt
3. ⚠️ Hersteller-Dropdown erscheint nur bei Supplements mit gültiger `supplement_id` (Daten-Fix separat erforderlich)
