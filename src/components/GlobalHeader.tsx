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
  TrendingUp 
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
  const { language, setLanguage } = useTranslation();

  // Listen for navigation events
  useEffect(() => {
    const handleCoachNavigation = () => {
      setCurrentActiveView('coach');
    };
    
    const handleMainNavigation = () => {
      setCurrentActiveView('main');
    };

    const handleHistoryNavigation = () => {
      setCurrentActiveView('history');
    };

    window.addEventListener('navigate-coach', handleCoachNavigation);
    window.addEventListener('navigate-main', handleMainNavigation);
    window.addEventListener('navigate-history', handleHistoryNavigation);

    return () => {
      window.removeEventListener('navigate-coach', handleCoachNavigation);
      window.removeEventListener('navigate-main', handleMainNavigation);
      window.removeEventListener('navigate-history', handleHistoryNavigation);
    };
  }, []);

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
          window.dispatchEvent(new CustomEvent('navigate-main'));
          break;
        case 'coach':
          navigate('/');
          window.dispatchEvent(new CustomEvent('navigate-coach'));
          break;
        case 'history':
          navigate('/');
          window.dispatchEvent(new CustomEvent('navigate-history'));
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
    // If we're on the main page, use the internal state
    if (location.pathname === '/') {
      return currentActiveView;
    }
    
    // For other routes, use the pathname
    switch (location.pathname) {
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
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-primary to-primary-glow p-3 rounded-2xl">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              KaloTracker
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
            
            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-xs">🇩🇪</span>
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
      </div>

      {/* Global Navigation Tabs */}
      <div className="flex justify-center gap-1 mb-6">
        <Button 
          variant={activeTab === 'main' ? 'default' : 'outline'}
          size="sm" 
          onClick={() => handleNavigation('main')}
          className="flex-1 px-2"
        >
          <LayoutDashboard className="h-4 w-4 mr-1" />
          <span className="text-xs">Basis</span>
        </Button>
        <Button 
          variant={activeTab === 'coach' ? 'default' : 'outline'}
          size="sm" 
          onClick={() => handleNavigation('coach')}
          className="flex-1 px-2"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          <span className="text-xs">Coach</span>
        </Button>
        <Button 
          variant={activeTab === 'history' ? 'default' : 'outline'}
          size="sm" 
          onClick={() => handleNavigation('history')}
          className="flex-1 px-2"
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-xs">Verlauf</span>
        </Button>
        <Button 
          variant={activeTab === 'profile' ? 'default' : 'outline'}
          size="sm" 
          onClick={() => handleNavigation('profile')}
          className="flex-1 px-2"
        >
          <UserIcon className="h-4 w-4 mr-1" />
          <span className="text-xs">Profil</span>
        </Button>
      </div>
    </div>
  );
};