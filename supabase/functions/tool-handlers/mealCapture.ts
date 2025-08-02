// Enhanced meal capture tool with OpenFoodFacts integration
export default async function handleMealCapture(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Simple food parsing - in real implementation would use OpenFoodFacts API
  function parseMealText(text: string): {
    food_name: string;
    amount?: number;
    unit?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  } {
    // Extract amount and unit
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|stück|portion|portionen)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    const unit = amountMatch?.[2]?.toLowerCase() || 'g';
    
    // Simple food database lookup (mock)
    const foodDb: Record<string, any> = {
      'haferflocken': { calories: 380, protein: 13, carbs: 60, fats: 7 },
      'banane': { calories: 95, protein: 1, carbs: 23, fats: 0.3 },
      'apfel': { calories: 52, protein: 0.3, carbs: 14, fats: 0.2 },
      'reis': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
      'hähnchen': { calories: 165, protein: 31, carbs: 0, fats: 3.6 }
    };
    
    // Find matching food
    const textLower = text.toLowerCase();
    const matchedFood = Object.keys(foodDb).find(food => textLower.includes(food));
    
    if (matchedFood && amount) {
      const baseNutrition = foodDb[matchedFood];
      const factor = amount / 100; // assuming per 100g values
      
      return {
        food_name: matchedFood,
        amount,
        unit,
        calories: Math.round(baseNutrition.calories * factor),
        protein: Math.round(baseNutrition.protein * factor * 10) / 10,
        carbs: Math.round(baseNutrition.carbs * factor * 10) / 10,
        fats: Math.round(baseNutrition.fats * factor * 10) / 10
      };
    }
    
    return {
      food_name: text,
      amount,
      unit
    };
  }
  
  const mealData = parseMealText(lastUserMsg);
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'meal',
    payload: {
      ...mealData,
      meal_type: 'snack', // Default, user can adjust
      ts: Date.now(),
      actions: [{
        type: 'save_meal',
        label: 'Mahlzeit speichern',
        data: {
          ...mealData,
          date: new Date().toISOString().split('T')[0]
        }
      }]
    },
    meta: { clearTool: true }
  };
}