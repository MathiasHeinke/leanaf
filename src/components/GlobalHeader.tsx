import { useState, useEffect } from "react";
import { Menu, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useLocation, useNavigate } from "react-router-dom";
import { PointsDebugPanel } from "./PointsDebugPanel";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { COACH_REGISTRY } from "@/lib/coachRegistry";
import { cn } from "@/lib/utils";

interface GlobalHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const GlobalHeader = ({ 
  onRefresh, 
  isRefreshing = false
}: GlobalHeaderProps) => {
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  
  const { status: creditsStatus } = useCredits();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";

  // Get ARES coach data
  const aresCoach = COACH_REGISTRY.ares;


  // Route to title mapping with breadcrumb support
  const getPageTitle = (pathname: string) => {
    // Handle coach-specific routes with breadcrumb
    if (pathname.startsWith('/coach/')) {
      const coachId = pathname.split('/')[2];
      if (coachId) {
        // Capitalize first letter for display
        const coachName = coachId.charAt(0).toUpperCase() + coachId.slice(1);
        return `Coaching / ${coachName}`;
      }
    }
    
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/profile': return 'Profil';
      case '/coach': return 'Coaching';
      case '/training': return 'Workout';
      case '/plus': return 'Momentum-Board';
      case '/analyse': return 'Analyse';
      case '/achievements': return 'Erfolge';
      case '/science': return 'Wissenschaft';
      case '/credits': return 'Credits & Packs';
      case '/account': return 'Account';
      case '/admin': return 'Admin';
      case '/gehirn': return 'Gehirn';
      case '/history': return 'Historie';
      case '/transformation': return 'Transformation';
      default: return 'GetleanAI';
    }
  };

  // Reset click count after 1 second
  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => setClickCount(0), 1000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);


  // Handle refresh with debug functionality
  const handleRefresh = () => {
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    
    // Open debug panel on triple click
    if (newClickCount >= 3) {
      setIsDebugPanelOpen(true);
      setClickCount(0);
      return;
    }
    
    // Normal refresh functionality
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  // Check if we're in coach chat to show dashboard button
  const isInCoachChat = location.pathname.startsWith('/coach/');
  
  // Handle navigation to ARES or Dashboard
  const handleRightButtonClick = () => {
    if (isInCoachChat) {
      navigate('/');
    } else {
      navigate('/coach/ares');
    }
  };


  return (
    <div className="relative">
      {/* Fixed Minimalist Header with Glassmorphism */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-50 border-b border-border/20 bg-background/70 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60 transition-[left] duration-200",
          isSidebarCollapsed 
            ? "left-0 md:left-[--sidebar-width-icon]" 
            : "left-0 md:left-[--sidebar-width]"
        )}
      >
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          {/* Left: Sidebar Toggle */}
          <SidebarTrigger className="p-2 hover:bg-accent/60 rounded-lg transition-colors">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          
          {/* Center: Page Title */}
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-foreground/90">
              {getPageTitle(location.pathname)}
            </h1>
          </div>
          
          {/* Right: ARES Avatar or Dashboard Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRightButtonClick}
            className="p-1 hover:bg-accent/60 rounded-lg transition-colors"
            title={isInCoachChat ? 'Zum Dashboard' : 'Zu ARES Chat'}
          >
            {isInCoachChat ? (
              <Home className="h-5 w-5" />
            ) : (
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={aresCoach.imageUrl} 
                  alt="ARES" 
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  AR
                </AvatarFallback>
              </Avatar>
            )}
          </Button>
        </div>
      </div>

      {/* Spacer to prevent content overlap */}
      <div className="h-[61px]" />

      {/* Debug Panel for Super Admins */}
      {(creditsStatus?.tester || false) && (
        <PointsDebugPanel 
          isOpen={isDebugPanelOpen} 
          onClose={() => setIsDebugPanelOpen(false)} 
        />
      )}
    </div>
  );
};

// Entferne die FloatingBottomNav
export const FloatingBottomNav = () => null;
