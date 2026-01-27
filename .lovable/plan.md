

# Fix: Supplement Card Bottom Spacing

## Problem

Die Supplement Card zeigt die Timing Circles (Morgens, Abends, Pre-WO etc.) mit Labels, die bis an den unteren Kartenrand reichen. Der `SnoozeHint` Button (`absolute bottom-3 right-3`) ueberlappt optisch mit dem Content.

---

## Loesung

Wir erhoehen das Bottom-Padding der SmartActions Area speziell fuer Cards mit viel Content unten, damit der SnoozeHint genug Platz hat.

---

## Technische Aenderung

### src/components/home/SmartFocusCard.tsx

**Zeile 331** - SmartActions Wrapper anpassen:

```typescript
// VORHER:
<div className="relative z-10 mt-auto pt-5">
  <SmartActions ... />
</div>

// NACHHER:
<div className="relative z-10 mt-auto pt-5 pb-4">
  <SmartActions ... />
</div>
```

Das fuegt 16px (pb-4) unter den SmartActions hinzu, sodass der SnoozeHint nicht mit den Timing Circle Labels kollidiert.

---

## Alternatives Approach (falls pb-4 nicht reicht)

Falls das nicht ausreicht, koennten wir das Card-Container Padding erhoehen:

**Zeile 285:**
```typescript
// VORHER:
"relative h-full w-full overflow-hidden rounded-3xl p-6 pb-10 text-white..."

// NACHHER:
"relative h-full w-full overflow-hidden rounded-3xl p-6 pb-14 text-white..."
```

Das gibt 56px statt 40px unten - aber das koennte andere Cards mit weniger Content beeinflussen.

---

## Empfehlung

Ich empfehle den ersten Ansatz (`pb-4` auf dem SmartActions Wrapper), da dieser gezielter ist und den Abstand zwischen Content und SnoozeHint direkt adressiert, ohne andere Card-Typen zu beeinflussen.

---

## Visuelles Ergebnis

```text
+----------------------------------------+
|  PRIORITY  +30 XP              [X]     |
|                                        |
|  Supplements einnehmen                 |
|  Noch offen: Abends, Pre-WO            |
|                                        |
|   [✓]      [🌙]      [💪]              |
|  Morgens   Abends   Pre-WO             |
|                                        |  <- Neuer Abstand (pb-4 = 16px)
|                          [← 2h 🕐]     |  <- SnoozeHint hat jetzt Platz
+----------------------------------------+
```

