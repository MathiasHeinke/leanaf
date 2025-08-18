
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droplet, Coffee, Wine, Calendar, Edit, Trash2, Check, X } from "lucide-react";
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
  onEditFluid?: (fluidId: string, amount: number, notes?: string) => void;
  onDeleteFluid?: (fluidId: string) => void;
}

export const GroupedFluidsList: React.FC<Props> = ({ todaysFluids, onEditFluid, onDeleteFluid }) => {
  const [editingFluidId, setEditingFluidId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  
  // Group fluids by category (unified)
  const { water: waterFluids, nonAlcoholic: nonAlcoholicFluids, alcoholic: alcoholicFluids } = groupFluids(todaysFluids);

  // Calculate last alcohol consumption for "sober since" display
  const lastAlcoholDate = alcoholicFluids.length > 0 
    ? new Date(Math.max(...alcoholicFluids.map(f => new Date(f.created_at || f.date).getTime())))
    : null;

  const daysSinceLastAlcohol = lastAlcoholDate 
    ? differenceInDays(new Date(), lastAlcoholDate)
    : null;

  const handleEditStart = (fluid: any) => {
    setEditingFluidId(fluid.id);
    setEditAmount(fluid.amount_ml.toString());
  };

  const handleEditSave = async (fluidId: string) => {
    const amount = parseFloat(editAmount);
    if (!isNaN(amount) && amount > 0) {
      // Only call the external callback, don't trigger any reloads here
      onEditFluid?.(fluidId, amount);
      setEditingFluidId(null);
      setEditAmount('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, fluidId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave(fluidId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const handleEditCancel = () => {
    setEditingFluidId(null);
    setEditAmount('');
  };

  const FluidItem = ({ fluid, colorClass }: { fluid: any; colorClass: string }) => {
    const isEditing = editingFluidId === fluid.id;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground flex-1">{getFluidDisplayName(fluid)}</span>
          <Input
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, fluid.id)}
            onBlur={() => handleEditSave(fluid.id)}
            className="w-20 h-6 text-xs"
            autoFocus
          />
          <span className="text-xs text-muted-foreground">ml</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEditSave(fluid.id)}
            className="h-6 w-6 p-0"
          >
            <Check size={12} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEditCancel}
            className="h-6 w-6 p-0"
          >
            <X size={12} />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between text-sm group hover:bg-muted/50 rounded px-1 py-0.5">
        <span className="text-muted-foreground">{getFluidDisplayName(fluid)}</span>
        <div className="flex items-center gap-1">
          <span className={colorClass}>{formatFluidAmount(fluid.amount_ml || 0)}</span>
          {(onEditFluid || onDeleteFluid) && (
            <div className="flex gap-1 ml-2">
              {onEditFluid && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditStart(fluid)}
                  className="h-6 w-6 p-0"
                >
                  <Edit size={12} />
                </Button>
              )}
              {onDeleteFluid && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteFluid(fluid.id)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

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
                <FluidItem key={`water-${fluid.id || index}`} fluid={fluid} colorClass="text-blue-500" />
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
                <FluidItem key={`non-alcohol-${fluid.id || index}`} fluid={fluid} colorClass="text-amber-600" />
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
                <FluidItem key={`alcohol-${fluid.id || index}`} fluid={fluid} colorClass="text-purple-600" />
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
