import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Wine } from "lucide-react";
import { fluidCalculations, formatFluidAmount } from "@/utils/fluidCalculations";

interface Props {
  todaysFluids: any[];
}

export const OtherDrinksCard: React.FC<Props> = ({ todaysFluids }) => {
  // Calculate intake (unified calculations)
  const totalCoffeeMl = fluidCalculations.getCoffeeAmount(todaysFluids);
  const totalAlcoholMl = fluidCalculations.getAlcoholAmount(todaysFluids);

  // Don't show card if no other drinks
  if (totalCoffeeMl === 0 && totalAlcoholMl === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          ANDERE GETRÄNKE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalCoffeeMl > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee size={16} className="text-amber-600" />
              <span className="text-sm text-foreground">Kaffee</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {formatFluidAmount(totalCoffeeMl)}
            </span>
          </div>
        )}
        
        {totalAlcoholMl > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wine size={16} className="text-purple-600" />
              <span className="text-sm text-foreground">Alkohol</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {formatFluidAmount(totalAlcoholMl)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};