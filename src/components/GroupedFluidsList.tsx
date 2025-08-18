
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Coffee, Wine, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { 
  groupFluids, 
  fluidCalculations, 
  formatFluidAmount, 
  getFluidDisplayName 
} from "@/utils/fluidCalculations";

interface Props {
  todaysFluids: any[];
}

export const GroupedFluidsList: React.FC<Props> = ({ todaysFluids }) => {
  // Group fluids by category (unified)
  const { water: waterFluids, nonAlcoholic: nonAlcoholicFluids, alcoholic: alcoholicFluids } = groupFluids(todaysFluids);

  // Calculate last alcohol consumption for "sober since" display
  const lastAlcoholDate = alcoholicFluids.length > 0 
    ? new Date(Math.max(...alcoholicFluids.map(f => new Date(f.created_at || f.date).getTime())))
    : null;

  const daysSinceLastAlcohol = lastAlcoholDate 
    ? differenceInDays(new Date(), lastAlcoholDate)
    : null;

  // All formatting now uses unified utilities
  // formatFluidAmount and getFluidDisplayName are imported
  // fluidCalculations.getTotalAmount replaces calculateCategoryTotal

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Droplet size={16} />
          FLÜSSIGKEITEN HEUTE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Water Section */}
        {waterFluids.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Droplet size={14} className="text-blue-500" />
                Wasser
              </h4>
              <span className="text-sm font-medium text-blue-500">
                {formatFluidAmount(fluidCalculations.getTotalAmount(waterFluids))}
              </span>
            </div>
            <div className="pl-6 space-y-1">
              {waterFluids.map((fluid, index) => (
                <div key={`water-${index}`} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getFluidDisplayName(fluid)}</span>
                  <span className="text-blue-500">{formatFluidAmount(fluid.amount_ml || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Non-Alcoholic Section */}
        {nonAlcoholicFluids.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Coffee size={14} className="text-amber-600" />
                Non-Alkohol
              </h4>
              <span className="text-sm font-medium text-amber-600">
                {formatFluidAmount(fluidCalculations.getTotalAmount(nonAlcoholicFluids))}
              </span>
            </div>
            <div className="pl-6 space-y-1">
              {nonAlcoholicFluids.map((fluid, index) => (
                <div key={`non-alcohol-${index}`} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getFluidDisplayName(fluid)}</span>
                  <span className="text-amber-600">{formatFluidAmount(fluid.amount_ml || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alcohol Section or Sober Counter */}
        {alcoholicFluids.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Wine size={14} className="text-purple-600" />
                Alkohol
              </h4>
              <span className="text-sm font-medium text-purple-600">
                {formatFluidAmount(fluidCalculations.getTotalAmount(alcoholicFluids))}
              </span>
            </div>
            <div className="pl-6 space-y-1">
              {alcoholicFluids.map((fluid, index) => (
                <div key={`alcohol-${index}`} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getFluidDisplayName(fluid)}</span>
                  <span className="text-purple-600">{formatFluidAmount(fluid.amount_ml || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-green-600" />
              <h4 className="text-sm font-medium text-foreground">
                Alkoholfrei
                {daysSinceLastAlcohol !== null && daysSinceLastAlcohol > 0 && (
                  <span className="text-green-600 ml-1">
                    seit {daysSinceLastAlcohol} {daysSinceLastAlcohol === 1 ? 'Tag' : 'Tagen'}
                  </span>
                )}
              </h4>
            </div>
            {daysSinceLastAlcohol === null && (
              <p className="text-xs text-muted-foreground pl-6">
                Keine Alkohol-Einträge gefunden
              </p>
            )}
          </div>
        )}

        {/* Total Summary */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Gesamt:</span>
            <span className="text-lg font-semibold text-foreground">
              {formatFluidAmount(fluidCalculations.getTotalAmount(todaysFluids))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
