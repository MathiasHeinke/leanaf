// Nutritional value formatting and rounding utilities

export type NutritionalValueType = 'calories' | 'macros' | 'percentage' | 'weight' | 'ml';

/**
 * Rounds a nutritional value based on its type
 * @param value - The value to round
 * @param type - The type of nutritional value
 * @returns Rounded number
 */
export const roundNutritionalValue = (value: number | string | null | undefined, type: NutritionalValueType = 'macros'): number => {
  if (value === null || value === undefined || value === '') return 0;
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 0;
  
  switch (type) {
    case 'calories':
      // Calories: round to whole numbers
      return Math.round(numValue);
    case 'macros':
      // Macronutrients (protein, carbs, fats): round to 1 decimal place
      return Math.round(numValue * 10) / 10;
    case 'percentage':
      // Percentages: round to 1 decimal place
      return Math.round(numValue * 10) / 10;
    case 'weight':
      // Weight values: round to 1 decimal place
      return Math.round(numValue * 10) / 10;
    case 'ml':
      // Milliliters: round to whole numbers
      return Math.round(numValue);
    default:
      return Math.round(numValue * 10) / 10;
  }
};

/**
 * Formats a nutritional value for display
 * @param value - The value to format
 * @param type - The type of nutritional value
 * @returns Formatted string
 */
export const formatNutritionalValue = (value: number | string | null | undefined, type: NutritionalValueType = 'macros'): string => {
  const rounded = roundNutritionalValue(value, type);
  
  switch (type) {
    case 'calories':
      return rounded.toString();
    case 'macros':
      return rounded === Math.floor(rounded) ? rounded.toString() : rounded.toFixed(1);
    case 'percentage':
      return rounded === Math.floor(rounded) ? rounded.toString() : rounded.toFixed(1);
    case 'weight':
      return rounded === Math.floor(rounded) ? rounded.toString() : rounded.toFixed(1);
    case 'ml':
      return rounded.toString();
    default:
      return rounded === Math.floor(rounded) ? rounded.toString() : rounded.toFixed(1);
  }
};

/**
 * Rounds an object with nutritional values
 * @param values - Object containing nutritional values
 * @returns Object with rounded values
 */
export const roundNutritionalValues = (values: {
  calories?: number | string;
  protein?: number | string;
  carbs?: number | string;
  fats?: number | string;
  [key: string]: any;
}) => {
  return {
    ...values,
    calories: roundNutritionalValue(values.calories, 'calories'),
    protein: roundNutritionalValue(values.protein, 'macros'),
    carbs: roundNutritionalValue(values.carbs, 'macros'),
    fats: roundNutritionalValue(values.fats, 'macros'),
  };
};