
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { DebugFloatingButton } from "@/components/debug/DebugFloatingButton";





interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showSubscriptionDebug, setShowSubscriptionDebug] = useState(false);
  
  // Check if navigating to dashboard from coach chat
  const isDashboard = location.pathname === '/';
  const isFromCoachChat = document.referrer.includes('/coach/');
  const shouldSlideIn = isDashboard && isFromCoachChat;
  
  // Detect if running in Lovable Preview mode
  const isPreviewMode = window.location.hostname.includes('lovable.app');
  
  // Keyboard shortcut for subscription debug panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        setShowSubscriptionDebug(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Don't show header on auth page - early return AFTER hook calls
  // In preview mode, show full layout even without user
  if (location.pathname === '/auth' || (!user && !isPreviewMode)) {
    return <>{children}</>;
  }


  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background to-accent/20 relative overflow-hidden flex w-full"
    >
      {/* Background Geometric Shapes for Glass Effect - Animated */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-primary-glow/10 rounded-full blur-2xl animate-float-1"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-carbs/25 to-carbs/10 rounded-full blur-xl animate-float-2"></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-gradient-to-br from-fats/20 to-fats/5 rounded-full blur-2xl animate-float-3"></div>
        <div className="absolute bottom-60 right-10 w-20 h-20 bg-gradient-to-br from-protein/30 to-protein/10 rounded-full blur-xl animate-float-4"></div>
        <div className="absolute top-1/3 left-1/2 w-40 h-20 bg-gradient-to-r from-primary/10 to-transparent rounded-full blur-3xl transform -translate-x-1/2 rotate-45 animate-float-5"></div>
      </div>
      
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalHeader 
          onRefresh={() => setShowSubscriptionDebug(true)}
        />
        <main className={`container mx-auto px-3 pb-0 pt-2 max-w-md relative z-10 flex-1 ${shouldSlideIn ? 'animate-slide-in-right' : ''}`}>
          {children}
        </main>
        <Footer />
        <DebugFloatingButton />
      </div>
    </div>
  );
};
