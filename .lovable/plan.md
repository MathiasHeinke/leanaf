
# Expandable Supplement Chips - Pro-Level UX Implementation

## Status Quo

Die ProtocolBundleCard zeigt Supplements aktuell als **einfache Buttons**:
```tsx
<button className="px-3 py-1.5 rounded-full">
  <span>{supplement.name}</span>
  <span>{supplement.dosage}{supplement.unit}</span>
</button>
```

**Was fehlt:**
- Timing Constraint Badges (Nuechtern, Mit Fett, etc.)
- Edit/Delete Icons
- Expandable Edit Mode mit Formular
- Liquid Animation (Geschwister rutschen weg)
- Hersteller-Auswahl
- Zyklus-Konfiguration

---

## Loesung: ExpandableSupplementChip Komponente

### Collapsed State (Normal)

```text
+---------------------------------------------------------------------+
| 💊 Vitamin D3 | 5000IU | 🥑 Mit Fett | [angepasst] | [✏️] [🗑️]     |
+---------------------------------------------------------------------+
```

### Expanded State (Edit Mode)

```text
+---------------------------------------------------------------------+
| VITAMIN D3 BEARBEITEN                                    [❌ Close] |
+---------------------------------------------------------------------+
| Menge:     [5000    ] [IU     ▼]                                    |
| Timing:    [◉ Morgens] [○ Mittags] [○ Abends] [○ Vor Schlaf]        |
| Einnahme:  🥑 Mit Fett (fettloeslich) - readonly Badge              |
| Hersteller: [Sunday Natural     ▼]                                  |
| Zyklus:    [○ Taeglich] [● Zyklisch: 5 On / 2 Off]                  |
| Notizen:   [___________________________]                            |
+---------------------------------------------------------------------+
| [💾 Speichern]                                         [🗑️ Entfernen]|
+---------------------------------------------------------------------+
```

---

## Animation: Framer Motion Layout

```typescript
// LayoutGroup umschliesst alle Chips
<LayoutGroup>
  {supplements.map((s) => (
    <motion.div key={s.id} layout>
      <ExpandableSupplementChip ... />
    </motion.div>
  ))}
</LayoutGroup>
```

Die `layout` Prop sorgt automatisch fuer "Liquid Shift" - andere Chips gleiten sanft zur Seite wenn einer expandiert.

---

## Timing Constraint Badges

| Constraint | Icon | Label | Farbe |
|------------|------|-------|-------|
| `fasted` | 💧 | Nuechtern | blue-100 |
| `with_food` | 🍽️ | Zum Essen | amber-100 |
| `with_fats` | 🥑 | Mit Fett | yellow-100 |
| `bedtime` | 🌙 | Vor Schlaf | indigo-100 |
| `pre_workout` | 🏋️ | Vor Training | green-100 |
| `post_workout` | 💪 | Nach Training | teal-100 |
| `any` | ⏰ | Flexibel | gray-100 |

---

## Dateien

### 1. Neue Komponente

**`src/components/supplements/ExpandableSupplementChip.tsx`**

- Collapsed View mit Name, Dosierung, Constraint Badge
- Edit/Delete Icons (on hover/focus)
- Expanded View mit Formular
- Spring Animation (stiffness: 300, damping: 30)
- Haptic Feedback bei Save/Delete

### 2. Update ProtocolBundleCard

**`src/components/supplements/ProtocolBundleCard.tsx`**

- Importiert `LayoutGroup` von framer-motion
- Ersetzt `<button>` mit `<ExpandableSupplementChip>`
- Uebergibt `onSave`, `onDelete`, `brands` Props

### 3. Neuer Hook: useUpdateSupplement

**`src/hooks/useSupplementLibrary.ts`**

```typescript
export function useUpdateSupplement() {
  // Updates user_supplements row
  // Fires 'supplement-stack-changed' event
  // Haptic feedback on success
}

export function useDeleteSupplement() {
  // Sets is_active = false
  // Fires 'supplement-stack-changed' event
}
```

### 4. Brands Hook

**`src/hooks/useSupplementBrands.ts`**

```typescript
export function useSupplementBrands() {
  // Fetches supplement_brands table
  // Returns { brands, isLoading }
}
```

---

## Formular-Felder im Expanded State

| Feld | Typ | Quelle | Editierbar |
|------|-----|--------|------------|
| Dosierung | Input + Unit Select | `dosage`, `unit` | ✅ |
| Timing | Radio Buttons | `preferred_timing` | ✅ |
| Constraint | Badge (readonly) | `supplement.timing_constraint` | ❌ |
| Hersteller | Select | `supplement_brands` | ✅ |
| Zyklus | Toggle + Inputs | `schedule` | ✅ |
| Notizen | Textarea | `notes` | ✅ |

---

## Zyklus-Konfiguration

Fuer Supplements wie Ashwagandha die Pausen brauchen:

```tsx
{scheduleType === 'cycle' && (
  <div className="flex items-center gap-2">
    <NumericInput value={cycleOnDays} onChange={...} />
    <span>Tage an,</span>
    <NumericInput value={cycleOffDays} onChange={...} />
    <span>Tage Pause</span>
  </div>
)}
```

---

## "Angepasst" Badge

Wenn User etwas aendert (Dosis, Hersteller, etc.), erscheint ein Badge:

```tsx
{isCustomized && (
  <Badge variant="outline" className="text-[10px] text-muted-foreground">
    angepasst
  </Badge>
)}
```

Logik: Vergleich `dosage !== supplement.default_dosage`

---

## Accessibility & Touch

- Minimum Tap Target: 44x44px
- Keyboard: Tab Navigation, Escape schliesst Edit
- Focus Visible: Ring um aktiven Chip
- Haptic: `haptics.medium()` bei Save, `haptics.error()` bei Delete

---

## Erwartetes Verhalten

1. User sieht Morning Protocol mit 3 Chips
2. Jeder Chip zeigt: Name + Dosis + Timing Badge (🥑 Mit Fett)
3. Hover auf Chip → Edit/Delete Icons erscheinen
4. Klick auf Edit:
   - Chip expandiert mit Spring-Animation
   - Andere Chips gleiten nach unten (Liquid Shift)
   - Formular mit allen Optionen erscheint
5. Aenderungen machen (z.B. Dosis auf 10.000 IU)
6. Speichern klicken:
   - Animation zurueck zum Collapsed State
   - Chip zeigt "[angepasst]" Badge
   - Toast: "Aenderungen gespeichert"
7. Delete klicken:
   - Confirmation Dialog
   - Supplement wird deaktiviert
   - Chip verschwindet mit Animation

---

## Technische Details

### Animation Config

```typescript
const SPRING_CONFIG = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

<motion.div
  layout
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={SPRING_CONFIG}
>
```

### Database Update

```typescript
await supabase
  .from('user_supplements')
  .update({
    dosage,
    unit,
    preferred_timing,
    schedule: { type: scheduleType, cycle_on_days, cycle_off_days },
    notes,
    // brand_id: brandId (wenn vorhanden)
  })
  .eq('id', supplement.id);
```

---

## Zusammenfassung

| Datei | Aktion |
|-------|--------|
| `src/components/supplements/ExpandableSupplementChip.tsx` | **NEU** |
| `src/components/supplements/ProtocolBundleCard.tsx` | **UPDATE** |
| `src/hooks/useSupplementLibrary.ts` | **EXTEND** |
| `src/hooks/useSupplementBrands.ts` | **NEU** |

Das Ergebnis: **Pro-Level UX** mit Liquid Animations, inline Editing, und maximaler Kontrolle ohne Modals.
