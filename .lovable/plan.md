
# Chip UX Improvements: Form Icons, Two-Line Layout & Green Checkmark

## Aenderungen

### 1. Form-Spezifische Icons (statt generisches 💊)

**Neue `getFormIcon` Funktion:**

| Unit | Icon | Beispiel |
|------|------|----------|
| `Tropfen`, `ml`, `Hub` | 💧 `Droplets` (blau) | Vitamin D Tropfen |
| `g`, `Scoop`, `Loeffel` | 🥄 Emoji | Kreatin Pulver |
| `Kapseln`, `Kapsel` | 💊 `Pill` (amber) | Omega-3 Kapseln |
| `Tabletten`, `Tabl` | ⚪ `Disc` (slate) | Tabletten |
| `IU`, `mg`, `mcg` | 🥚 `Egg` (Softgel) | Vitamin D3 Softgels |
| Fallback | 💊 `Pill` (muted) | Alles andere |

```typescript
const getFormIcon = (unit: string): React.ReactNode => {
  const u = unit?.toLowerCase() || '';
  if (u.includes('tropfen') || u === 'ml' || u === 'hub') {
    return <Droplets className="h-4 w-4 text-blue-500" />;
  }
  if (u === 'g' || u.includes('löffel') || u.includes('scoop')) {
    return <span className="text-sm">🥄</span>;
  }
  if (u.includes('kapsel')) {
    return <Pill className="h-4 w-4 text-amber-500" />;
  }
  if (u.includes('tabl')) {
    return <Disc className="h-4 w-4 text-slate-500" />;
  }
  // IU, mg, mcg => Softgel style
  return <Pill className="h-4 w-4 text-muted-foreground" />;
};
```

---

### 2. Flexible Zwei-Zeilen Layout

**Problem:** Bei langen Namen wie "Magnesium Glycinat" wird Text abgeschnitten.

**Loesung:** `flex-wrap` erlaubt automatischen Umbruch:

```text
EINZEILIG (wenn Platz):
+--------------------------------------------------+
| 💧 Vitamin D3 | 5000IU | 🥑 Mit Fett         | ✓ |
+--------------------------------------------------+

ZWEIZEILIG (wenn zu lang):
+--------------------------------------------------+
| 💊 Magnesium Glycinat | 400mg              | ✓  |
| 🌙 Vor Schlaf                                    |
+--------------------------------------------------+
```

**CSS Approach:**
```tsx
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-8">
  {/* Icon + Name + Dosierung + Constraint Badge */}
</div>
```

- `flex-wrap`: Erlaubt Zeilenumbruch
- `gap-x-2 gap-y-1`: Horizontaler und vertikaler Abstand
- `pr-8`: Platz fuer den Checkmark rechts oben

---

### 3. Gruener Checkmark statt "[angepasst]" Badge

**Vorher:**
```tsx
<Badge variant="outline" className="text-[10px]">
  angepasst
</Badge>
```

**Nachher:** Absolut positionierter gruener Kreis mit Haken:

```tsx
{isCustomized && (
  <div className="absolute -top-1.5 -right-1.5 z-10">
    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm ring-2 ring-background">
      <Check className="h-2.5 w-2.5 text-white" />
    </div>
  </div>
)}
```

**Visuelles Ergebnis:**
```text
                                              ✓  (gruener Kreis)
+--------------------------------------------------+
| 💧 Vitamin D3 | 5000IU | 🥑 Mit Fett              |
+--------------------------------------------------+
```

---

## Code-Aenderungen

### Datei: `src/components/supplements/ExpandableSupplementChip.tsx`

1. **Neuer Import:** `Pill`, `Disc` von lucide-react
2. **Neue Funktion:** `getFormIcon(unit: string)`
3. **Collapsed State Layout:**
   - Container bekommt `relative` Position
   - Checkmark als absolutes Element oben rechts
   - Content Area mit `flex-wrap` und `pr-8`
   - Name ohne `truncate max-w-[100px]` Limit
4. **Entfernen:** Das `angepasst` Badge

### Collapsed State Struktur (neu):

```tsx
<motion.div className="relative group ...">
  {/* Gruener Checkmark oben rechts */}
  {isCustomized && (
    <div className="absolute -top-1.5 -right-1.5 z-10">
      <div className="w-4 h-4 rounded-full bg-green-500 ...">
        <Check className="h-2.5 w-2.5 text-white" />
      </div>
    </div>
  )}
  
  {/* Content mit flex-wrap */}
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 flex-1 pr-8">
    {/* Form Icon */}
    <div className="shrink-0">{getFormIcon(unit)}</div>
    
    {/* Name (kein truncate mehr) */}
    <span className="text-sm font-medium">{item.name}</span>
    
    {/* Dosierung */}
    <span className="text-xs text-muted-foreground">{dosage}{unit}</span>
    
    {/* Constraint Badge */}
    {constraint !== 'any' && <ConstraintBadge />}
  </div>
  
  {/* Edit/Delete Buttons */}
</motion.div>
```

---

## Ergebnis

| Vorher | Nachher |
|--------|---------|
| 💊 Omega-... 3g 🥑 [angepasst] | 💊 Omega-3 3g 🥑 Mit Fett ✓ |
| 💊 Magn... 400mg 🌙 | 💊 Magnesium Glycinat 400mg ✓<br>🌙 Vor Schlaf |
| 💊 Kreatin 5g | 🥄 Kreatin 5g (Pulver-Icon) |
| 💊 D3 Tropfen | 💧 D3 Tropfen (Tropfen-Icon) |

---

## Zusammenfassung

| Aenderung | Datei |
|-----------|-------|
| `getFormIcon()` Helper | `ExpandableSupplementChip.tsx` |
| `flex-wrap` Layout | `ExpandableSupplementChip.tsx` |
| Gruener Checkmark | `ExpandableSupplementChip.tsx` |
| Pill/Disc Icons Import | `ExpandableSupplementChip.tsx` |
