
# Fix: Pre-Fill Meal Data beim Oeffnen des Meal-Sheets

## Problem

Die AI Nutrition Advisor speichert die Meal-Daten korrekt in `localStorage`:
```typescript
localStorage.setItem('prefill_meal', JSON.stringify(prefillData));
```

**Aber**: Das Meal-Sheet (`mealOpen` in `AresHome.tsx`) liest diese Daten nicht aus und befuellt die Felder daher nicht.

---

## Loesung

### 1. AresHome.tsx - useEffect zum Laden der Pre-Fill-Daten

Neuer `useEffect` der beim Oeffnen des Meal-Sheets (`mealOpen === true`) die localStorage-Daten liest und in den Input setzt:

```typescript
// Pre-fill meal data from localStorage (from AI Advisor)
useEffect(() => {
  if (mealOpen) {
    const prefillJson = localStorage.getItem('prefill_meal');
    if (prefillJson) {
      try {
        const prefillData = JSON.parse(prefillJson);
        
        // Set input text with title
        if (prefillData.title) {
          setInputText(prefillData.title);
        }
        
        // Clear localStorage after reading
        localStorage.removeItem('prefill_meal');
        
        // Optional: Auto-trigger analysis with pre-filled macros
        // by directly opening the confirmation dialog
        if (prefillData.calories !== undefined) {
          const analyzedData = {
            title: prefillData.title || 'Mahlzeit',
            calories: prefillData.calories || 0,
            protein: prefillData.protein || 0,
            carbs: prefillData.carbs || 0,
            fats: prefillData.fats || 0,
            meal_type: 'other',
            confidence: 0.9
          };
          
          // Close sheet, show confirmation dialog directly
          setMealOpen(false);
          setAnalyzedMealData(analyzedData);
          setShowConfirmationDialog(true);
        }
      } catch (e) {
        console.warn('Failed to parse prefill_meal data:', e);
        localStorage.removeItem('prefill_meal');
      }
    }
  }
}, [mealOpen, setInputText]);
```

### 2. Ablauf nach Fix

| Schritt | Aktion |
|---------|--------|
| 1 | User klickt "Loggen" auf AI Suggestion Card |
| 2 | `onLogMeal` speichert Daten in localStorage |
| 3 | `onClose()` + `onAddMeal()` wird aufgerufen |
| 4 | `mealOpen` wird `true` |
| 5 | **NEU**: useEffect liest `prefill_meal` |
| 6 | **NEU**: MealConfirmationDialog oeffnet mit Pre-Fill-Daten |
| 7 | User sieht Titel + Makros und kann speichern |

### 3. Alternative: Direkt Confirmation Dialog oeffnen

Da die AI bereits Makros geschaetzt hat, ueberspringen wir das Meal-Sheet komplett und oeffnen direkt den `MealConfirmationDialog` mit den vorausgefuellten Werten:

```typescript
// In useEffect: Wenn prefill_meal Makros hat
if (prefillData.calories !== undefined) {
  // Skip meal sheet, go directly to confirmation
  setMealOpen(false);
  
  // Use existing updateDialogState or set directly
  setAnalyzedMealData({
    title: prefillData.title,
    calories: prefillData.calories,
    protein: prefillData.protein,
    carbs: prefillData.carbs,
    fats: prefillData.fats,
    meal_type: 'other',
    confidence: 0.9
  });
  setShowConfirmationDialog(true);
  
  // Clean up
  localStorage.removeItem('prefill_meal');
}
```

---

## Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/pages/AresHome.tsx` | EDIT | useEffect hinzufuegen der localStorage liest und Dialog oeffnet |

---

## Ergebnis

Nach dem Fix:
1. User klickt "Loggen" auf einer AI Suggestion Card
2. MealConfirmationDialog oeffnet **direkt** mit vorausgefuellten Werten (Titel, kcal, P, C, F)
3. User kann bestaetigen oder anpassen und speichern
4. Keine manuelle Eingabe mehr noetig - ein Klick zum Speichern

