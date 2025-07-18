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

      {/* Modern Segmented Control Navigation */}
      <div className="flex justify-center mb-6">
        <div className="bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50 shadow-sm">
          <div className="flex gap-1">
            <button 
              onClick={() => handleNavigation('main')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'main' 
                  ? 'bg-background text-foreground shadow-md border border-border/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 mr-2 inline" />
              Basis
            </button>
            <button 
              onClick={() => handleNavigation('coach')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'coach' 
                  ? 'bg-background text-foreground shadow-md border border-border/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <MessageCircle className="h-4 w-4 mr-2 inline" />
              Coach
            </button>
            <button 
              onClick={() => handleNavigation('history')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'history' 
                  ? 'bg-background text-foreground shadow-md border border-border/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <TrendingUp className="h-4 w-4 mr-2 inline" />
              Verlauf
            </button>
            <button 
              onClick={() => handleNavigation('profile')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'profile' 
                  ? 'bg-background text-foreground shadow-md border border-border/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <UserIcon className="h-4 w-4 mr-2 inline" />
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