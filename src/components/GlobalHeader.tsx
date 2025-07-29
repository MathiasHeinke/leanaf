import { useState, useEffect } from "react";
import { Menu, Sun, Moon, Clock, ChevronDown, ArrowLeft, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { useSubscription } from "@/hooks/useSubscription";
import { useLocation } from "react-router-dom";
import { PointsDebugPanel } from "./PointsDebugPanel";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
  const [showCoachHeader, setShowCoachHeader] = useState(false);
  
  const { subscriptionTier } = useSubscription();
  const { t } = useTranslation();
  const { toggleTheme, getThemeStatus, getThemeIcon, isWithinDarkModeHours } = useAutoDarkMode();
  const location = useLocation();

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

  // Check if current route is a coach chat route
  const isCoachChatRoute = 
    location.pathname === '/coach' || 
    location.pathname === '/training/sascha';

  // Get coach info based on route
  const getCoachInfo = () => {
    if (location.pathname === '/training/sascha') {
      return {
        name: 'Coach Sascha',
        avatar: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
        role: 'Workout Coach'
      };
    }
    return {
      name: 'GetleanAI Coach',
      avatar: '/coach-images/dr-vita-femina.png',
      role: 'Personal Coach'
    };
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

  return (
    <>
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
      </div>

      
      {/* Coach Toggle Button - Centered under GlobalHeader (only on coach routes) */}
      {isCoachChatRoute && (
        <div className="fixed top-[73px] left-0 right-0 z-40 border-b border-border/20 bg-background/70 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-2 max-w-4xl flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCoachHeader(prev => !prev)}
              className="p-2 hover:bg-accent/60 rounded-lg transition-all duration-300"
              title="Coach Info anzeigen"
            >
              <ChevronDown className={`h-4 w-4 text-primary transition-transform duration-300 ${showCoachHeader ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Coach Dropdown Header (only on coach routes) */}
      {isCoachChatRoute && (
        <div className={`fixed left-0 right-0 z-30 border-b border-border/20 bg-secondary/90 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-secondary/70 transition-all duration-500 ease-in-out ${
          showCoachHeader 
            ? 'top-[122px] opacity-100 translate-y-0' 
            : 'top-[73px] opacity-0 -translate-y-full pointer-events-none'
        }`}>
          <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
            {/* Left: Back Button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-accent/60 rounded-lg transition-colors"
              onClick={() => {
                if (location.pathname === '/training/sascha') {
                  window.location.href = '/training';
                } else {
                  window.location.href = '/';
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* Center: Coach Info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden shadow-lg flex-shrink-0">
                <img 
                  src={getCoachInfo().avatar} 
                  alt={getCoachInfo().name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/coach-images/dr-vita-femina.png';
                  }}
                />
              </div>
              <div className="text-center">
                <h3 className="font-medium text-sm text-foreground/90">{getCoachInfo().name}</h3>
                <p className="text-xs text-muted-foreground">{getCoachInfo().role}</p>
              </div>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-accent/60 rounded-lg transition-colors"
                title="Chat-Verlauf"
                onClick={() => {
                  // TODO: Chat-Verlauf anzeigen
                  console.log('Chat-Verlauf öffnen');
                }}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-destructive/60 rounded-lg transition-colors"
                title="Chat löschen"
                onClick={() => {
                  if (confirm('Möchten Sie wirklich den gesamten Chat-Verlauf löschen?')) {
                    // TODO: Chat löschen
                    console.log('Chat wird gelöscht');
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content overlap */}
      <div className={`transition-all duration-300 ${
        isCoachChatRoute && showCoachHeader ? 'h-[195px]' : 
        isCoachChatRoute ? 'h-[122px]' : 'h-[73px]'
      }`} />

      {/* Debug Panel for Super Admins */}
      {(subscriptionTier?.toLowerCase() === 'enterprise' || subscriptionTier?.toLowerCase() === 'super admin') && (
        <PointsDebugPanel 
          isOpen={isDebugPanelOpen} 
          onClose={() => setIsDebugPanelOpen(false)} 
        />
      )}
    </>
  );
};

// Entferne die FloatingBottomNav
export const FloatingBottomNav = () => null;
