import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();

  // Don't show header on auth page
  if (location.pathname === '/auth' || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <GlobalHeader />
      <main className="container mx-auto px-4 pb-6 max-w-md">
        {children}
      </main>
    </div>
  );
};