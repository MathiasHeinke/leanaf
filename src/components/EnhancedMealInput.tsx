import React from "react";
import { MomentumBottomComposer } from "@/components/momentum/MomentumBottomComposer";

// Expose MomentumBottomComposer on Index under a clear name
export const EnhancedMealInput: React.FC = () => {
  return (
    <div data-testid="enhancedmealinput">
      <MomentumBottomComposer />
    </div>
  );
};

export default EnhancedMealInput;
