
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

  return (
    <div className={`flex items-center gap-1 text-xs flex-wrap ${className}`}>
      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300 px-2 py-0.5">
        {hasPhoto ? (
          <>
            <Camera className="h-3 w-3 mr-0.5" />
            📊 +{basePoints}P
          </>
        ) : (
          <>📊 +{basePoints}P</>
        )}
      </Badge>
      {bonusPoints > 0 && (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-300 px-2 py-0.5">
          <Star className="h-3 w-3 mr-0.5" />
          +{bonusPoints}BP
        </Badge>
      )}
      {qualityScore && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 px-2 py-0.5">
          🎯{qualityScore}/10
        </Badge>
      )}
    </div>
  );
};
