
import { Badge } from "@/components/ui/badge";
import { Star, Camera } from "lucide-react";

interface MealPointsDisplayProps {
  hasPhoto: boolean;
  qualityScore?: number;
  bonusPoints?: number;
  className?: string;
}

export const MealPointsDisplay = ({ hasPhoto, qualityScore, bonusPoints = 0, className = "" }: MealPointsDisplayProps) => {
  const basePoints = hasPhoto ? 5 : 3;
  const totalPoints = basePoints + bonusPoints;

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
        {hasPhoto ? (
          <>
            <Camera className="h-3 w-3 mr-1" />
            +{basePoints} Punkte
          </>
        ) : (
          <>📝 +{basePoints} Punkte</>
        )}
      </Badge>
      {bonusPoints > 0 && (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <Star className="h-3 w-3 mr-1" />
          +{bonusPoints} Bonus
        </Badge>
      )}
      {qualityScore && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          🎯 {qualityScore}/10
        </Badge>
      )}
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
        Total: +{totalPoints}
      </Badge>
    </div>
  );
};
