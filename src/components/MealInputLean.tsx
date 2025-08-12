import React from "react";
import { MealInput as BaseMealInput } from "@/components/MealInput";

// Thin wrapper to keep original functionality but expose as MealInputLean
// Adds a stable test id so we can distinguish it from the enhanced input
export const MealInputLean: React.FC<any> = (props) => {
  return (
    <div data-testid="mealinput_lean">
      <BaseMealInput {...props} />
    </div>
  );
};

export default MealInputLean;
