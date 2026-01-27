import { useLocation } from "react-router-dom";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const GlobalHeader = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";

  // Don't render GlobalHeader on AresHome - it has its own nav
  if (location.pathname === '/') {
    return null;
  }

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
          
          {/* Right: Empty - space for future element */}
        </div>
      </div>

      {/* Spacer to prevent content overlap */}
      <div className="h-[61px]" />
    </div>
  );
};

// Entferne die FloatingBottomNav
export const FloatingBottomNav = () => null;
