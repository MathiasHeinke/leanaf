import { Phase1Dashboard } from "@/components/dashboard/Phase1Dashboard";
import { Training3SaeulenTracker } from "@/components/training/Training3SaeulenTracker";
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
      <Training3SaeulenTracker />
    </div>
  );
}
