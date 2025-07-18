import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { 
  Activity, 
  RefreshCw, 
  Menu, 
  LogOut, 
  CreditCard, 
  User as UserIcon, 
  MessageCircle, 
  LayoutDashboard,
  TrendingUp,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "next-themes";

interface GlobalHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onViewChange?: (view: 'main' | 'coach' | 'profile' | 'subscription' | 'history') => void;
  currentView?: string;
}

export const GlobalHeader = ({ 
  onRefresh, 
  isRefreshing = false, 
  onViewChange,
  currentView
}: GlobalHeaderProps) => {
  const [currentActiveView, setCurrentActiveView] = useState<string>('main');
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();


  // Handle navigation to different views
  const handleNavigation = (view: 'main' | 'coach' | 'profile' | 'subscription' | 'history') => {
    if (onViewChange) {
      onViewChange(view);
      setCurrentActiveView(view);
    } else {
      // For route-based navigation
      switch (view) {
        case 'main':
          navigate('/');
          break;
        case 'coach':
          navigate('/coach');
          break;
        case 'history':
          navigate('/history');
          break;
        case 'profile':
          navigate('/profile');
          break;
        case 'subscription':
          navigate('/subscription');
          break;
      }
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  // Determine current active tab
  const getActiveTab = () => {
    switch (location.pathname) {
      case '/':
        return 'main';
      case '/coach':
        return 'coach';
      case '/history':
        return 'history';
      case '/profile':
        return 'profile';
      case '/subscription':
        return 'subscription';
      default:
        return 'main';
    }
  };

  const activeTab = getActiveTab();

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Header - Kompakt ohne unnötige Wrapper */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-primary to-primary-glow p-3 rounded-2xl">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            kaloAI
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Dark Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          
          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
            className="flex items-center gap-2 text-sm"
          >
            <span className="text-xs">{language === 'de' ? '🇩🇪' : '🇬🇧'}</span>
            {language.toUpperCase()}
          </Button>
          
          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleNavigation('subscription')}>
                <CreditCard className="h-4 w-4 mr-2" />
                Abonnement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Segmented Control Navigation with Smooth Sliding Background */}
      <div className="flex justify-center mb-6">
        <div className="relative bg-muted/60 backdrop-blur-xl p-1.5 rounded-2xl border border-border/30 shadow-lg">
          {/* Sliding background indicator */}
          <div 
            className={`absolute top-1.5 h-[calc(100%-12px)] bg-gradient-to-r from-background to-background/95 rounded-xl shadow-md border border-border/20 transition-all duration-300 ease-out transform ${
              activeTab === 'main' ? 'left-1.5 w-[calc(25%-3px)]' :
              activeTab === 'coach' ? 'left-[calc(25%+3px)] w-[calc(25%-3px)]' :
              activeTab === 'history' ? 'left-[calc(50%+3px)] w-[calc(25%-3px)]' :
              'left-[calc(75%+3px)] w-[calc(25%-3px)]'
            }`}
          />
          
          <div className="flex relative z-10">
            <button 
              onClick={() => handleNavigation('main')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex items-center justify-center ${
                activeTab === 'main' 
                  ? 'text-foreground scale-105 font-semibold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ width: '25%' }}
            >
              <LayoutDashboard className={`h-4 w-4 mr-2 transition-all duration-300 ${
                activeTab === 'main' ? 'animate-pulse text-primary' : ''
              }`} style={{ animationDuration: activeTab === 'main' ? '2s' : undefined }} />
              Basis
            </button>
            <button 
              onClick={() => handleNavigation('coach')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex items-center justify-center ${
                activeTab === 'coach' 
                  ? 'text-foreground scale-105 font-semibold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ width: '25%' }}
            >
              <MessageCircle className={`h-4 w-4 mr-2 transition-all duration-300 ${
                activeTab === 'coach' ? 'animate-pulse text-primary' : ''
              }`} style={{ animationDuration: activeTab === 'coach' ? '2s' : undefined }} />
              Coach
            </button>
            <button 
              onClick={() => handleNavigation('history')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex items-center justify-center ${
                activeTab === 'history' 
                  ? 'text-foreground scale-105 font-semibold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ width: '25%' }}
            >
              <TrendingUp className={`h-4 w-4 mr-2 transition-all duration-300 ${
                activeTab === 'history' ? 'animate-pulse text-primary' : ''
              }`} style={{ animationDuration: activeTab === 'history' ? '2s' : undefined }} />
              Verlauf
            </button>
            <button 
              onClick={() => handleNavigation('profile')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex items-center justify-center ${
                activeTab === 'profile' 
                  ? 'text-foreground scale-105 font-semibold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ width: '25%' }}
            >
              <UserIcon className={`h-4 w-4 mr-2 transition-all duration-300 ${
                activeTab === 'profile' ? 'animate-pulse text-primary' : ''
              }`} style={{ animationDuration: activeTab === 'profile' ? '2s' : undefined }} />
              Profil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Entferne die FloatingBottomNav
export const FloatingBottomNav = () => null;