import { BadgeSystem } from "@/components/BadgeSystem";
import { LevelBadge } from "@/components/LevelBadge";
import { DepartmentProgress } from "@/components/DepartmentProgress";
import { useTranslation } from "@/hooks/useTranslation";
import { Trophy, Award, TrendingUp } from "lucide-react";

export default function Achievements() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Erfolge & Fortschritt
          </h1>
        </div>
        <p className="text-muted-foreground">
          Verfolge deine Achievements, Level und Transformationen
        </p>
      </div>

      {/* Level Badge - Shows current level prominently */}
      <div className="flex justify-center">
        <div className="scale-150">
          <LevelBadge />
        </div>
      </div>

      {/* Department Progress - Shows progress in different areas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Bereichsfortschritt</h2>
        </div>
        <DepartmentProgress />
      </div>

      {/* Badge System - Shows all earned badges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Deine Badges</h2>
        </div>
        <BadgeSystem />
      </div>
    </div>
  );
}