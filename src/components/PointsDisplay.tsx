
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface PointsDisplayProps {
  basePoints: number;
  bonusPoints?: number;
  reason?: string;
  className?: string;
}

export const PointsDisplay = ({ basePoints, bonusPoints = 0, reason, className = "" }: PointsDisplayProps) => {
  const totalPoints = basePoints + bonusPoints;
  
  if (totalPoints === 0) return null;

  return (
    <div className={`flex items-center gap-1 text-xs flex-wrap ${className}`}>
      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300 px-2 py-0.5">
        📊 +{basePoints}P
      </Badge>
      {bonusPoints > 0 && (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-300 px-2 py-0.5">
          <Star className="h-3 w-3 mr-0.5" />
          +{bonusPoints}BP
        </Badge>
      )}
      {reason && (
        <span className="text-muted-foreground text-xs">({reason})</span>
      )}
    </div>
  );
};
