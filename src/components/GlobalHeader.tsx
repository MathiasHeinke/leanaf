import { useState, useEffect } from "react";
import { Menu, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";

  // Don't render GlobalHeader on new AresHome - it has its own nav
  if (location.pathname === '/') {
    return null;
  }

  // Get ARES coach data
  const aresCoach = COACH_REGISTRY.ares;

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
          "fixed top-0 right-0 z-40 border-b border-border/20 bg-background/70 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60 transition-[left] duration-200",
          isSidebarCollapsed 
            ? "left-0 md:left-[--sidebar-width-icon]" 
            : "left-0 md:left-[--sidebar-width]"
        )}
      >
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          {/* Left: Sidebar Toggle */}
          <SidebarTrigger className="p-2 hover:bg-accent/60 rounded-lg transition-colors" />
          
          {/* Center: Spacer */}
          <div className="flex-1" />
          
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
    </div>
  );
};

// Entferne die FloatingBottomNav
export const FloatingBottomNav = () => null;
