import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Menu,
  User,
  CreditCard,
  LogOut,
  RefreshCw,
  Activity,
  LayoutDashboard,
  MessageCircle,
  UserIcon
} from "lucide-react";

interface GlobalHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onViewChange?: (view: 'main' | 'coach' | 'profile' | 'subscription') => void;
  currentView?: string;
}

export const GlobalHeader = ({ 
  onRefresh, 
  isRefreshing = false, 
  onViewChange, 
  currentView = 'main'
}: GlobalHeaderProps) => {
  const { language, setLanguage, t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (view: 'main' | 'coach' | 'profile' | 'subscription') => {
    if (onViewChange) {
      onViewChange(view);
    } else {
      // Default navigation behavior
      switch (view) {
        case 'main':
          navigate('/');
          break;
        case 'profile':
          navigate('/profile');
          break;
        case 'subscription':
          navigate('/subscription');
          break;
        case 'coach':
          // This is handled by the parent component
          break;
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Default refresh behavior
      window.location.reload();
    }
  };

  // Determine current active tab
  const getActiveTab = () => {
    if (onViewChange) {
      return currentView;
    }
    
    switch (location.pathname) {
      case '/':
        return 'main';
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
              className="flex items-center gap-2"
            >
              <span className="text-sm font-medium">
                {language === 'de' ? '🇩🇪 DE' : '🇺🇸 EN'}
              </span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleNavigation('subscription')}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('nav.subscription')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Global Navigation Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        <Button 
          variant={activeTab === 'main' ? 'default' : 'outline'}
          size="sm" 
          onClick={() => handleNavigation('main')}
          className="flex-1"
        >
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
        <Button 
          variant={activeTab === 'coach' ? 'default' : 'outline'}
          size="sm" 
          onClick={() => handleNavigation('coach')}
          className="flex-1"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Kalo Coach
        </Button>
        <Button 
          variant={activeTab === 'profile' ? 'default' : 'outline'}
          size="sm" 
          onClick={() => handleNavigation('profile')}
          className="flex-1"
        >
          <UserIcon className="h-4 w-4 mr-2" />
          Profil
        </Button>
      </div>
    </div>
  );
};