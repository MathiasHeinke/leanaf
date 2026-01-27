

# MealInput Modal: Z-Index Fix + Favoriten-Feature

## Problem-Analyse

### Z-Index Abschneidung
Die SmartChips in Zeile 511 haben `overflow-x-auto` Container:
```tsx
<div className="flex gap-2 overflow-x-auto scroll-smooth flex-nowrap hide-scrollbar pb-1">
```
Das `overflow-x-auto` schneidet Elemente ab die ueber den Container hinausragen (z.B. Fokus-Ring, Schatten, oder ein Stern-Badge).

### Favoriten
Es gibt aktuell **keine Favoriten-Tabelle** in der Datenbank. Das `useFrequentMeals` Hook holt nur die haeufigsten Mahlzeiten basierend auf Frequenz - aber der User kann sie nicht manuell als Favorit markieren.

---

## Loesung: Zwei-Schichten Design

### Konzept

Wir trennen:
1. **Favoriten (Gold-Sterne)** - Max 3, vom User manuell gewaehlt, immer sichtbar
2. **Vorschlaege (Grau)** - Automatisch basierend auf Frequenz + Tageszeit

```text
+----------------------------------------------------------+
| [★ Proteinshake 30g] [★ Skyr Bowl] [★ Haferflocken]      |  <- Favoriten (gelb)
| [Frosta Curry...] [2 Haenchenschenkel] [Reis mit Brok...]|  <- Vorschlaege (grau)
+----------------------------------------------------------+
```

Der gelbe Stern soll **ueber** dem blauen Fokus-Ring liegen.

---

## Technische Implementierung

### Datei 1: Neue DB-Tabelle `meal_favorites`

```sql
CREATE TABLE public.meal_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_text text NOT NULL,
  position smallint DEFAULT 1,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, meal_text)
);

-- Max 3 Favoriten pro User via Trigger oder App-Logic
ALTER TABLE meal_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
  ON meal_favorites FOR ALL USING (auth.uid() = user_id);
```

### Datei 2: Neuer Hook `src/hooks/useMealFavorites.ts`

```typescript
export function useMealFavorites(userId?: string) {
  // Query: SELECT meal_text FROM meal_favorites WHERE user_id = $1 ORDER BY position LIMIT 3
  // Mutation: toggle(mealText) - INSERT or DELETE
  // Max 3 enforced: if count >= 3 and adding, return error/toast
  
  return {
    favorites: string[],           // Max 3 meal texts
    isFavorite: (text: string) => boolean,
    toggleFavorite: (text: string) => void,
    isLoading: boolean
  }
}
```

### Datei 3: Neue SmartChip Variante `favorite`

In `src/components/ui/smart-chip.tsx`:

```typescript
favorite: [
  "bg-amber-100 hover:bg-amber-200 text-amber-700",
  "border-amber-300 hover:border-amber-400",
  "dark:bg-amber-900/50 dark:hover:bg-amber-900/70",
  "dark:text-amber-300 dark:border-amber-700"
]
```

Neues Prop: `starBadge?: boolean` - Zeigt goldenen Stern ueber dem Chip

### Datei 4: Update `AresHome.tsx` MealInput Sheet

```tsx
// Zeile ~509-523 ersetzen mit:

{/* Container mit overflow-visible fuer Sterne */}
<div className="relative overflow-visible">
  {/* Favoriten-Reihe (max 3) */}
  {favorites.length > 0 && (
    <div className="flex gap-2 mb-2 relative z-20">
      {favorites.map((meal, index) => (
        <SmartChip
          key={`fav-${index}`}
          variant="favorite"
          size="sm"
          onClick={() => handleMealChipClick(meal)}
          onLongPress={() => toggleFavorite(meal)} // Long-press to unfavorite
          icon={<Star className="w-3 h-3 fill-amber-400 text-amber-500" />}
        >
          {meal}
        </SmartChip>
      ))}
    </div>
  )}
  
  {/* Vorschlaege-Reihe (scrollbar) */}
  {getCurrentMealSuggestions().filter(m => !isFavorite(m)).length > 0 && (
    <div className="flex gap-2 overflow-x-auto scroll-smooth flex-nowrap hide-scrollbar pb-1 relative z-10">
      {getCurrentMealSuggestions()
        .filter(m => !isFavorite(m))
        .map((meal, index) => (
          <div key={`sug-${index}`} className="relative">
            <SmartChip
              variant="secondary"
              size="sm"
              onClick={() => handleMealChipClick(meal)}
              onLongPress={() => toggleFavorite(meal)} // Long-press to favorite
            >
              {meal}
            </SmartChip>
          </div>
        ))}
    </div>
  )}
</div>
```

---

## Z-Index Stack

| Element | Z-Index | Beschreibung |
|---------|---------|--------------|
| Goldener Stern Badge | z-30 | Ueber allem |
| Favoriten-Row | z-20 | Ueber Vorschlaegen |
| Vorschlaege-Row | z-10 | Basis |
| Focus Ring (blue) | z-0 | Standard |

---

## Interaktions-Flow

### Favorit hinzufuegen
1. User sieht Vorschlag "Proteinshake 30g"
2. Long-Press (oder kleines Stern-Icon antippen)
3. Wenn < 3 Favoriten: Chip wandert nach oben, wird gold
4. Wenn bereits 3: Toast "Maximal 3 Favoriten - entferne zuerst einen"

### Favorit entfernen
1. User long-pressed auf goldenen Favoriten-Chip
2. Chip verschwindet aus Favoriten
3. Erscheint wieder in Vorschlaegen (wenn haeufig genug)

### Chip klicken
1. Fuellt Textfeld mit Mahlzeit-Text
2. Fokus auf Textarea

---

## Dateien-Uebersicht

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| Migration: `meal_favorites` | NEU | DB-Tabelle + RLS |
| `src/hooks/useMealFavorites.ts` | NEU | Hook fuer Favoriten-CRUD |
| `src/components/ui/smart-chip.tsx` | EDIT | +`favorite` Variante, +`starBadge` Prop |
| `src/pages/AresHome.tsx` | EDIT | Integration beider Chip-Reihen |

---

## Alternative: Ohne Datenbank

Falls schnellere Implementierung gewuenscht - **localStorage**:

```typescript
// In useMealFavorites.ts
const STORAGE_KEY = 'meal_favorites';

const getFavorites = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const setFavorites = (favs: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs.slice(0, 3)));
};
```

**Pro:** Sofort nutzbar, kein DB-Migration
**Contra:** Nicht cross-device synchronisiert

---

## Empfehlung

Ich empfehle **DB-Loesung** weil:
1. Favoriten sind wichtig fuer wiederkehrende Mahlzeiten
2. Cross-device Sync (Mobile/Desktop)
3. Kann spaeter fuer AI-Training genutzt werden ("User bevorzugt diese Mahlzeiten")

Soll ich mit der DB-Tabelle oder localStorage-Version starten?

