import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sun, Moon, Clock } from "lucide-react";

interface GlobalHeaderProps {
  // Props können hier in Zukunft erweitert werden
}

export const GlobalHeader = ({}: GlobalHeaderProps) => {
  const { user } = useAuth();
  const { toggleTheme } = useAutoDarkMode();
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'Home';
      case '/coach':
        return 'AI Coach';
      case '/analysis':
        return 'Analyse';
      case '/history':
        return 'Historie';
      case '/profile':
        return 'Profil';
      case '/account':
        return 'Account';
      case '/achievements':
        return 'Erfolge';
      case '/subscription':
        return 'Abonnement';
      case '/features':
        return 'Features';
      case '/roadmap':
        return 'Roadmap';
      case '/science':
        return 'Wissenschaft';
      case '/training-markus':
        return 'Training mit Markus';
      case '/training-sascha':
        return 'Training mit Sascha';
      case '/training-plus':
        return 'Training Plus';
      case '/training-with-timer':
        return 'Training Timer';
      case '/marketing':
        return 'Marketing';
      default:
        return 'KaloAI';
    }
  };

  // Theme icon and tooltip logic
  const renderThemeIcon = () => {
    const { getThemeIcon } = useAutoDarkMode();
    const iconType = getThemeIcon();
    
    switch (iconType) {
      case 'sun':
      case 'sun-override':
        return <Sun className="h-4 w-4" />;
      case 'moon':
      case 'moon-override':
        return <Moon className="h-4 w-4" />;
      case 'clock':
        return <Clock className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  const getThemeTooltip = () => {
    const { getThemeStatus } = useAutoDarkMode();
    const status = getThemeStatus();
    
    if (status.isAuto) {
      return status.nextChange ? `Auto-Modus: ${status.nextChange}` : 'Auto-Modus aktiv';
    }
    return 'Theme wechseln';
  };

  return (
    <div>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-foreground">
              {getPageTitle(location.pathname)}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleTheme}
                  >
                    {renderThemeIcon()}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getThemeTooltip()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content overlap with fixed header */}
      <div className="h-16" />
    </div>
  );
};