import React from "react";
import { MealInput as BaseMealInput } from "@/components/MealInput";

// Enhanced wrapper with AI features - now includes all EnhancedMealInput functionality
// Adds a stable test id and passes through all enhanced features
export const MealInputLean: React.FC<any> = (props) => {
  return (
    <div data-testid="mealinput_lean">
      <BaseMealInput {...props} />
    </div>
  );
};

export default MealInputLean;
