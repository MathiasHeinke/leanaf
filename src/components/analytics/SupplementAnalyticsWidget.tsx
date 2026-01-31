import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill, TrendingUp, Calendar, Award } from "lucide-react";
import { useSupplementAnalytics } from "@/hooks/useSupplementAnalytics";
import { SupplementHeatmap } from "./SupplementHeatmap";
import { SupplementRanking } from "./SupplementRanking";

export const SupplementAnalyticsWidget = () => {
  const [period, setPeriod] = useState<7 | 30>(7);
  const { dailyCompliance, supplementRanking, stats, loading } = useSupplementAnalytics(period);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Supplement Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Supplement Analytics
          </CardTitle>
          <Tabs
            value={period.toString()}
            onValueChange={(v) => setPeriod(parseInt(v) as 7 | 30)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="7" className="text-xs px-3">
                7 Tage
              </TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-3">
                30 Tage
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-accent/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs">Ø Compliance</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {stats.averageCompliance}%
            </div>
          </div>
          <div className="bg-accent/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Beste Serie</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {stats.bestStreak} {stats.bestStreak === 1 ? "Tag" : "Tage"}
            </div>
          </div>
          <div className="bg-accent/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Award className="h-3.5 w-3.5" />
              <span className="text-xs">Konsistent</span>
            </div>
            <div className="text-sm font-bold text-foreground truncate px-1">
              {stats.mostConsistent}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        {dailyCompliance.length > 0 && (
          <SupplementHeatmap data={dailyCompliance} period={period} />
        )}

        {/* Ranking */}
        <SupplementRanking data={supplementRanking} />

        {stats.totalSupplements === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine aktiven Supplements</p>
            <p className="text-xs">Füge Supplements hinzu um Analytics zu sehen</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
