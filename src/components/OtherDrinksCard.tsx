import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Wine } from "lucide-react";

interface Props {
  todaysFluids: any[];
}

export const OtherDrinksCard: React.FC<Props> = ({ todaysFluids }) => {
  // Calculate coffee intake
  const totalCoffeeMl = todaysFluids
    .filter(fluid => fluid.fluid_type === 'kaffee')
    .reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0);

  // Calculate alcohol intake
  const totalAlcoholMl = todaysFluids
    .filter(fluid => fluid.has_alcohol)
    .reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0);

  // Format values
  const formatFluid = (ml: number) => {
    if (ml >= 1000) {
      return `${(ml / 1000).toFixed(1)}L`;
    }
    return `${ml}ml`;
  };

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
              {formatFluid(totalCoffeeMl)}
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
              {formatFluid(totalAlcoholMl)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};