
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";

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
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
        📊 +{basePoints} Punkte
      </Badge>
      {bonusPoints > 0 && (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <Star className="h-3 w-3 mr-1" />
          +{bonusPoints} Bonus
        </Badge>
      )}
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
        <TrendingUp className="h-3 w-3 mr-1" />
        {totalPoints} Total
      </Badge>
      {reason && (
        <span className="text-muted-foreground">({reason})</span>
      )}
    </div>
  );
};
