
# Fix: SupplementGroupRow UI & Deduplizierungs-Probleme

## Identifizierte Probleme

### 1. "Im Stack" Badge redundant
Der Badge bei Zeile 166-170 in `SupplementGroupRow.tsx` ist überflüssig - der Switch zeigt bereits den Status.

### 2. Namen werden abgeschnitten
`truncate` auf Zeile 128 kürzt die Namen. Beispiele: "Elekt...", "Ome...", "Vita..."

**Lösung:** `truncate` entfernen, stattdessen mehr Platz für Namen lassen.

### 3. Zink zeigt keine Gruppe
**Problem:** Datenbank hat 3 Einträge:
- `Zink` 
- `Zink Bisglycinat`
- `Zinc Complex` ← Englische Schreibweise matcht NICHT mit `^zink/i`

**Lösung:** Pattern in `supplementDeduplication.ts` erweitern:
```typescript
// Vorher:
{ pattern: /^zink/i, baseName: 'Zink' },

// Nachher:
{ pattern: /^zink|^zinc/i, baseName: 'Zink' },
```

### 4. Magnesium zeigt nur 2 statt 4 Varianten
**Problem:** Die 4 DB-Einträge sind in VERSCHIEDENEN TIERS:
- Essential: `Magnesium`, `Magnesium Glycinat` (vermutlich durch Scoring)
- Optimizer: `Magnesium Komplex 11 Ultra`, `Magnesiumcitrat`

Die Gruppierung erfolgt NACH der Tier-Sortierung, daher werden nur Varianten im selben Tier gruppiert.

**Lösung:** Dies ist eigentlich korrektes Verhalten - Varianten mit niedrigerem Score erscheinen im Optimizer-Tab. Aber für bessere UX könnte man alle Magnesium-Varianten als eine Gruppe zeigen, unabhängig vom Tier.

---

## Technische Änderungen

### Datei 1: `src/components/supplements/SupplementGroupRow.tsx`

**Änderung A: "Im Stack" Badge entfernen (Zeile 166-170)**
```typescript
// ENTFERNEN:
{hasActiveVariant && (
  <span className="hidden sm:inline text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap">
    Im Stack
  </span>
)}
```

**Änderung B: Name nicht abschneiden (Zeile 128)**
```typescript
// Vorher:
<span className="font-medium text-sm truncate">{baseName}</span>

// Nachher:
<span className="font-medium text-sm">{baseName}</span>
```

**Änderung C: Flex-Layout anpassen für mehr Platz**
```typescript
// Content-Container breiter machen, Score-Badge kompakter
<div className="flex items-center gap-1.5 flex-wrap">
  <span className="font-medium text-sm">{baseName}</span>
  {getScoreBadge(topVariant)}
  ...
</div>
```

### Datei 2: `src/lib/supplementDeduplication.ts`

**Pattern für Zink erweitern (Zeile 13):**
```typescript
// Vorher:
{ pattern: /^zink/i, baseName: 'Zink' },

// Nachher:
{ pattern: /^zink|^zinc/i, baseName: 'Zink' },
```

**Pattern für Omega-3 erweitern (Zeile 31):**
```typescript
// Vorher:
{ pattern: /^omega[- ]?3/i, baseName: 'Omega-3' },

// Nachher:  
{ pattern: /^omega[- ]?3|fisch[öo]l|fish[- ]?oil/i, baseName: 'Omega-3' },
```

**Pattern für Vitamin D erweitern:**
```typescript
// Vorher:
{ pattern: /^vitamin\s*d/i, baseName: 'Vitamin D' },

// Nachher - auch D3, D3+K2 erfassen:
{ pattern: /^vitamin\s*d|^d3\b/i, baseName: 'Vitamin D' },
```

---

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| "Elekt..." + "Im Stack" | "Elektrolyte" |
| "Ome..." + "Im Stack" | "Omega-3" |
| "Vita..." + "Im Stack" | "Vitamin D3 + K2" |
| Zink ohne Gruppe | Zink → 3 Varianten |
| Magnesium 2 Varianten | Bleibt 2 im Essential, 2 im Optimizer |

---

## Dateien-Übersicht

| Datei | Änderung |
|-------|----------|
| `src/components/supplements/SupplementGroupRow.tsx` | "Im Stack" entfernen, `truncate` entfernen, Layout anpassen |
| `src/lib/supplementDeduplication.ts` | Patterns für Zink, Omega-3, Vitamin D erweitern |
