import { useState, useEffect } from "react";
import { Menu, Sun, Moon, Clock, ChevronDown, ChevronUp, ArrowLeft, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { useSubscription } from "@/hooks/useSubscription";
import { useLocation, useNavigate } from "react-router-dom";
import { PointsDebugPanel } from "./PointsDebugPanel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CoachData {
  coach_id: string;
  name: string;
  specialization_description: string;
}

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
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [coachData, setCoachData] = useState<CoachData | null>(null);
  
  const { user } = useAuth();
  const { subscriptionTier } = useSubscription();
  const { t } = useTranslation();
  const { toggleTheme, getThemeStatus, getThemeIcon, isWithinDarkModeHours } = useAutoDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current coach ID from route and URL params
  const getCurrentCoachId = () => {
    if (location.pathname.startsWith('/training/sascha')) return 'sascha';
    if (location.pathname.startsWith('/training/markus')) return 'markus';
    if (location.pathname.startsWith('/coach/')) {
      // Extract coach ID from route parameter /coach/:coachId
      const coachId = location.pathname.split('/coach/')[1];
      return coachId || null;
    }
    if (location.pathname === '/coach') {
      // Fallback: Check URL params for backwards compatibility
      const params = new URLSearchParams(location.search);
      return params.get('coach') || null;
    }
    return null;
  };

  // Load coach data from database
  useEffect(() => {
    const loadCoachData = async () => {
      const coachId = getCurrentCoachId();
      if (!coachId) return;

      try {
        const { data, error } = await supabase
          .from('coach_specializations')
          .select('coach_id, name, specialization_description')
          .eq('coach_id', coachId)
          .single();

        if (error) {
          console.error('Error loading coach data:', error);
          return;
        }

        setCoachData(data);
      } catch (error) {
        console.error('Error fetching coach data:', error);
      }
    };

    loadCoachData();
  }, [location.pathname, location.search]);

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

  // Clear chat function
  const handleClearChat = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('coach_personality', 'sascha');
        
      if (error) throw error;
      
      // Refresh page to clear local state
      window.location.reload();
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  // Check if we're on a coach chat route (show dropdown when in actual coach conversation)
  const isCoachChatRoute = 
    location.pathname.startsWith('/training/sascha') ||
    location.pathname.startsWith('/training/markus') ||
    location.pathname.startsWith('/coach/') || // New route pattern /coach/:coachId
    (location.pathname === '/coach' && new URLSearchParams(location.search).get('coach')); // Backwards compatibility

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
            className="absolute left-1/2 -bottom-2 transform -translate-x-1/2 bg-background/70 backdrop-blur-md border border-border/20 rounded-full p-1 shadow-sm hover:bg-accent/60 z-50 transition-colors"
          >
            {showCoachBanner ? (
              <ChevronUp className="h-4 w-4 text-blue-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-500" />
            )}
          </button>
        )}
      </div>

      {/* Coach-Banner direkt unter Header (ohne Abstand) */}
      {isCoachChatRoute && (
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden bg-background/70 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60 border-b border-border/20 shadow-md w-full fixed top-[61px] z-40 ${
            showCoachBanner ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex justify-between items-center px-4 py-2">
            <button 
              onClick={() => {
                if (location.pathname.startsWith('/training/sascha')) {
                  navigate('/training');
                } else if (location.pathname.startsWith('/training/markus')) {
                  navigate('/training');
                } else if (location.pathname.startsWith('/coach')) {
                  navigate('/coach');
                } else {
                  navigate('/');
                }
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </button>

            <div className="flex items-center gap-2">
              <img
                src={`/coach-images/${
                  getCurrentCoachId() === 'sascha' ? '9e4f4475-6b1f-4563-806d-89f78ba853e6.png' : 
                  getCurrentCoachId() === 'markus' ? 'markus-ruehl.jpg' :
                  getCurrentCoachId() === 'lucy' ? 'fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png' :
                  getCurrentCoachId() === 'kai' ? '2c06031d-707a-400d-aaa0-a46decdddfe2.png' :
                  getCurrentCoachId() === 'dr_vita' ? '/lovable-uploads/954a7ee8-1579-4a1b-bf4c-87b4ef4588b1.png' :
                  getCurrentCoachId() === 'integral' ? '/lovable-uploads/ea8ea3bb-ceaa-4809-9cec-580177f741d1.png' :
                  'fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png'
                }`}
                alt={coachData?.name || 'Coach'}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-medium text-sm">
                {/* Für alle Coaches: zeige nur den Namen, nicht die lange Beschreibung */}
                {coachData?.name || 'Coach'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowChatHistory(true)}
                className="text-sm hover:text-primary transition-colors"
                title="Chat-Verlauf"
              >
                <History className="h-4 w-4" />
              </button>
              <button 
                onClick={() => {
                  if (confirm('Chat-Verlauf wirklich löschen?')) {
                    handleClearChat();
                  }
                }}
                className="text-sm hover:text-destructive transition-colors"
                title="Chat löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content overlap */}
      <div className={`${isCoachChatRoute && showCoachBanner ? 'h-[125px]' : 'h-[61px]'} transition-all duration-500`} />

      {/* Chat History Dialog */}
      {showChatHistory && (
        <Dialog open={showChatHistory} onOpenChange={setShowChatHistory}>
          <DialogContent className="max-w-md max-h-[70vh] overflow-hidden p-4 mt-20 top-[25%]">
            <DialogTitle className="sr-only">Chat-Verlauf</DialogTitle>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Chat-Verlauf
                </h2>
              </div>
              <ChatHistorySidebar
                selectedCoach={getCurrentCoachId() || 'sascha'}
                onSelectDate={(date) => {
                  console.log('Selected date:', date);
                  setShowChatHistory(false);
                }}
                onClose={() => setShowChatHistory(false)}
                className="border-0 shadow-none"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

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
