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

      {/* Floating Bottom Navigation - wird unten gerendert */}
    </div>
  );
};

// Neue Floating Bottom Navigation Komponente
export const FloatingBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

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
      default:
        return 'main';
    }
  };

  const activeTab = getActiveTab();

  return (
    <div className="fixed bottom-6 left-4 right-4 z-40 animate-slide-up">
      <div className="max-w-sm mx-auto">
        <div className="glass-card dark:glass-card-dark rounded-3xl p-3 shadow-2xl border border-white/20 dark:border-gray-700/20 backdrop-blur-xl">
          <div className="flex items-center justify-around">
            {/* Dashboard/Main */}
            <button 
              onClick={() => handleNavigation('/')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 ${
                activeTab === 'main' 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-xs font-medium">Basis</span>
            </button>

            {/* Coach */}
            <button 
              onClick={() => handleNavigation('/coach')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 ${
                activeTab === 'coach' 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs font-medium">Coach</span>
            </button>

            {/* History */}
            <button 
              onClick={() => handleNavigation('/history')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 ${
                activeTab === 'history' 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-medium">Verlauf</span>
            </button>

            {/* Profile */}
            <button 
              onClick={() => handleNavigation('/profile')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 ${
                activeTab === 'profile' 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              <UserIcon className="h-5 w-5" />
              <span className="text-xs font-medium">Profil</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};