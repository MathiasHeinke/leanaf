
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
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
  Moon,
  Clock
} from "lucide-react";

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
  const { language, setLanguage, t } = useTranslation();
  const { toggleTheme, getThemeStatus, isWithinDarkModeHours } = useAutoDarkMode();

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
  const themeStatus = getThemeStatus();

  // Get theme icon and tooltip
  const themeIcon = () => {
    if (themeStatus.isAuto && isWithinDarkModeHours) {
      return <Clock className="h-4 w-4" />;
    }
    return themeStatus.current === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  };

  const themeTooltip = () => {
    if (themeStatus.isAuto) {
      return t('settings.darkModeAuto');
    }
    return themeStatus.current === 'dark' ? t('settings.darkModeLight') : t('settings.darkModeDark');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Header - Restructured logo with icon on left */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Icon positioned further left */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          
          {/* Logo text with subtext */}
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
            <p className="text-sm text-gray-600 -mt-1">
              {t('app.letsGetLean')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
            title={t('app.refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Dark Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="flex items-center gap-2"
            title={themeTooltip()}
          >
            {themeIcon()}
          </Button>
          
          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
            className="flex items-center gap-2 text-sm"
            title={t('settings.language')}
          >
            <span className="text-xs">{language === 'de' ? '🇩🇪' : '🇬🇧'}</span>
            {language.toUpperCase()}
          </Button>
          
          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" title={t('app.menu')}>
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/account')}>
                <UserIcon className="h-4 w-4 mr-2" />
                {t('header.account')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation('subscription')}>
                <CreditCard className="h-4 w-4 mr-2" />
                {t('header.subscription')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('header.logout')}
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
              {t('header.main')}
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
              {t('header.coach')}
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
              {t('header.history')}
            </button>
            <button 
              onClick={() => handleNavigation('profile')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex items-center justify-center profile-button ${
                activeTab === 'profile' 
                  ? 'text-foreground scale-105 font-semibold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ width: '25%' }}
            >
              <UserIcon className={`h-4 w-4 mr-2 transition-all duration-300 ${
                activeTab === 'profile' ? 'animate-pulse text-primary' : ''
              }`} style={{ animationDuration: activeTab === 'profile' ? '2s' : undefined }} />
              {t('header.profile')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Entferne die FloatingBottomNav
export const FloatingBottomNav = () => null;
