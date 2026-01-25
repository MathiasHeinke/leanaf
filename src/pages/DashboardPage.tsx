import { Phase1Dashboard } from "@/components/dashboard/Phase1Dashboard";
import { Training3SaeulenTracker } from "@/components/training/Training3SaeulenTracker";
import { DailyQuestsWidget } from "@/components/gamification/DailyQuestsWidget";
import { MemoryInsights } from "@/components/gamification/MemoryInsights";
import { DashboardQuickStats } from "@/components/dashboard/DashboardQuickStats";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container max-w-4xl py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <Phase1Dashboard />
      
      {/* Quick Stats Row */}
      <DashboardQuickStats />
      
      {/* Gamification Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DailyQuestsWidget />
        <MemoryInsights />
      </div>
      
      <Training3SaeulenTracker />
    </div>
  );
}
