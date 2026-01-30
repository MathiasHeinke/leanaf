

## Quick-Add Suchfeld in Protocol Bundle Cards

### Zusammenfassung
Ein neues "Supplement hinzufügen"-Feld wird am Ende jeder `ProtocolBundleCard` eingefügt. Es ermöglicht das schnelle Suchen und Hinzufügen von Supplements direkt in einen bestimmten Timing-Slot (z.B. Post-Workout → Protein Shake).

### UI-Design

```text
┌─────────────────────────────────────────────────────────┐
│ 🌙 Evening & Night Routine                               │
│    ⏱ 18:00 - 23:00 · 2 Items                            │
├─────────────────────────────────────────────────────────┤
│  💧 Elektrolyte (LMNT)               200mg          ✕   │
│  💊 Magnesium Komplex 11 Ultra       200mg              │
├─────────────────────────────────────────────────────────┤
│  🔍  Supplement suchen...                         [＋]  │  ← NEU
├─────────────────────────────────────────────────────────┤
│  ~0.80 €/Tag                      [Stack abschließen >] │
└─────────────────────────────────────────────────────────┘
```

### Komponenten-Architektur

**Neue Komponente:** `QuickSupplementSearch.tsx`
- Kompaktes Suchfeld mit Lupe-Icon (links) und Plus-Button (rechts)
- Placeholder: "Supplement suchen..."
- Bei Fokus: Dropdown mit gefilterten Ergebnissen aus `supplement_database`
- Bei Auswahl: Supplement wird mit dem vorgegebenen `timing` direkt zum Stack hinzugefügt

### Datei-Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/supplements/QuickSupplementSearch.tsx` | **Neu erstellen** – Kompaktes Inline-Suchfeld mit Dropdown |
| `src/components/supplements/ProtocolBundleCard.tsx` | Neues Feld nach den Chips einfügen, vor dem Footer |

### Technische Details

**QuickSupplementSearch Props:**
```typescript
interface QuickSupplementSearchProps {
  timing: PreferredTiming;    // Target-Slot (morning, evening, post_workout, etc.)
  onAdd?: () => void;         // Optional callback nach erfolgreichem Add
}
```

**Verhalten:**
1. Bei Eingabe: Debounced (300ms) Suche gegen `useSupplementLibrary()`
2. Dropdown zeigt max. 5 Treffer mit Name + Kategorie
3. Klick auf Treffer → `useSupplementToggle().toggleSupplement(item, true)` mit überschriebenem `preferred_timing`
4. Plus-Button ohne Suchbegriff → Öffnet vollständiges Such-Sheet (optional für spätere Erweiterung)

**Integration in ProtocolBundleCard:**
```tsx
{/* Nach den Supplement Chips, vor dem Footer */}
<div className="px-4 pb-2">
  <QuickSupplementSearch 
    timing={timing} 
    onAdd={onRefetch} 
  />
</div>
```

### Styling

- Hintergrund: `bg-background/60` (leicht transparent, passt zum Card-Gradient)
- Border: `border border-dashed border-border/50`
- Rounded: `rounded-lg`
- Höhe: 40px (touch-friendly)
- Lupe-Icon: 16px, `text-muted-foreground`
- Plus-Button: 24x24px Circle, `bg-primary text-primary-foreground`

### Flow

```text
User tippt "Protein" 
       ↓
Dropdown erscheint:
  • Whey Protein Isolate (Protein)
  • Casein Protein (Protein)  
  • Kollagen (Protein)
       ↓
User klickt "Whey Protein Isolate"
       ↓
→ Insert in user_supplements mit preferred_timing = 'post_workout'
→ Toast: "Whey Protein Isolate zu Post-Workout hinzugefügt"
→ Card aktualisiert sich automatisch (refetch)
```

### Aufwand
- 1 neue Komponente (~120 Zeilen)
- 1 kleine Integration in ProtocolBundleCard (~5 Zeilen)

