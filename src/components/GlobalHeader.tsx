import { useState, useEffect } from "react";
import { Menu, Sun, Moon, Clock, ChevronDown, ChevronUp, ArrowLeft, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { useSubscription } from "@/hooks/useSubscription";
import { useLocation, useNavigate } from "react-router-dom";
import { PointsDebugPanel } from "./PointsDebugPanel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CoachDropdownHeader } from "./CoachDropdownHeader";

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
  const [showCoachBanner, setShowCoachBanner] = useState(false);
  
  const { subscriptionTier } = useSubscription();
  const { t } = useTranslation();
  const { toggleTheme, getThemeStatus, getThemeIcon, isWithinDarkModeHours } = useAutoDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  // Route to title mapping
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/profile': return 'Profil';
      case '/coach': return 'Coach';
      case '/training': return 'Workout';
      case '/training/sascha': return 'Workout/Sascha';
      case '/training/markus': return 'Workout/Markus';
      case '/history': return 'Analyse';
      case '/achievements': return 'Erfolge';
      case '/science': return 'Wissenschaft';
      case '/subscription': return 'Abonnement';
      case '/account': return 'Account';
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

  const themeStatus = getThemeStatus();
  const themeIconType = getThemeIcon();

  // Get theme icon component based on status
  const renderThemeIcon = () => {
    switch (themeIconType) {
      case 'clock':
        return <Clock className="h-4 w-4" />;
      case 'sun':
      case 'sun-override':
        return <Sun className="h-4 w-4" />;
      case 'moon':
      case 'moon-override':
        return <Moon className="h-4 w-4" />;
      default:
        return themeStatus.current === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
    }
  };

  // Get theme tooltip with detailed status
  const getThemeTooltip = () => {
    if (themeStatus.override) {
      return `${t('settings.darkModeOverride')} (${themeStatus.nextChange} remaining)`;
    }
    if (themeStatus.isAuto) {
      const timeInfo = isWithinDarkModeHours ? 
        `Auto: Dark until ${themeStatus.nextChange}` : 
        `Auto: Light until ${themeStatus.nextChange}`;
      return timeInfo;
    }
  return themeStatus.current === 'dark' ? t('settings.darkModeLight') : t('settings.darkModeDark');
  };

  // Check if we're on a coach chat route
  const isCoachChatRoute = 
    location.pathname.startsWith('/coach') || 
    location.pathname.startsWith('/training/sascha');

  return (
    <div className="relative">
      {/* Fixed Minimalist Header with Glassmorphism */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/70 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
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
          
          {/* Right: Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="p-2 hover:bg-accent/60 rounded-lg transition-colors"
            title={getThemeTooltip()}
          >
            {renderThemeIcon()}
          </Button>
        </div>

        {/* Chevron-Button als Knubbel unten am Header */}
        {isCoachChatRoute && (
          <button
            onClick={() => setShowCoachBanner(prev => !prev)}
            className="absolute left-1/2 -bottom-2 transform -translate-x-1/2 bg-blue-500 rounded-full p-1 shadow-sm hover:bg-blue-600 z-50 transition-colors"
          >
            {showCoachBanner ? (
              <ChevronUp className="h-4 w-4 text-white" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white" />
            )}
          </button>
        )}
      </div>

      {/* Coach-Banner direkt unter Header (ohne Abstand) */}
      {isCoachChatRoute && (
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden w-full fixed top-[73px] z-40 ${
            showCoachBanner ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <CoachDropdownHeader />
        </div>
      )}

      {/* Spacer to prevent content overlap */}
      <div className={`${isCoachChatRoute && showCoachBanner ? 'h-[153px]' : 'h-[73px]'} transition-all duration-500`} />

      {/* Debug Panel for Super Admins */}
      {(subscriptionTier?.toLowerCase() === 'enterprise' || subscriptionTier?.toLowerCase() === 'super admin') && (
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
