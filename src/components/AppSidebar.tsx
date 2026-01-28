import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Dumbbell,
  TrendingUp,
  BarChart3,
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Trophy, 
  Bug, 
  LogOut,
  Star,
  Award,
  Crown,
  FileText,
  Shield,
  Info,
  History as HistoryIcon,
  Zap,
  Sun,
  Moon,
  Clock,
  TestTube,
  ChevronDown,
  FlaskConical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { BugReportDialog } from "./BugReportDialog";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "ARES Protokoll", url: "/protocol", icon: FlaskConical },
  { title: "Workout", url: "/training", icon: Dumbbell },
  { title: "Transformation", url: "/transformation", icon: TrendingUp },
  { title: "Blutwerte", url: "/bloodwork", icon: TestTube },
  { title: "History", url: "/history", icon: HistoryIcon },
  { title: "Analyse", url: "/analyse", icon: BarChart3 },
  // UNTER BEOBACHTUNG: Erfolge temporär ausgeblendet
  // { title: "Erfolge", url: "/achievements", icon: Trophy },
  { title: "Profil", url: "/profile", icon: UserIcon, key: "header.profile" },
];

const settingsItems = [
  { title: "Einstellungen", url: "/account", icon: Settings, key: "header.account" },
  { title: "Credits & Packs", url: "/credits", icon: CreditCard, key: "header.subscription" },
  { title: "Admin", url: "/admin", icon: Shield, adminOnly: true },
];

const legalItems = [
  { title: "AGB", url: "/terms", icon: FileText },
  { title: "Datenschutz", url: "/privacy", icon: Shield },
  { title: "Impressum", url: "/imprint", icon: Info },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { signOut, user } = useAuth();
  const { t } = useTranslation();
  const { userPoints } = usePointsSystem();
  const { toggleTheme, getThemeStatus, getThemeIcon } = useAutoDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [userGender, setUserGender] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  
  const collapsed = state === "collapsed";

  useEffect(() => {
    const fetchUserGender = async () => {
      if (!user) {
        setUserGender(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('gender')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user gender:', error);
          setUserGender(null);
        } else {
          setUserGender(data?.gender || null);
        }
      } catch (error) {
        console.error('Error fetching user gender:', error);
        setUserGender(null);
      }
    };

    fetchUserGender();
  }, [user]);

  // Helper functions for level calculations
  const getMinPointsForLevel = (level: number): number => {
    if (level === 1) return 0;
    if (level === 2) return 100;
    if (level === 3) return 200;
    if (level === 4) return 350;
    if (level === 5) return 550;
    if (level === 6) return 800;
    if (level === 7) return 1100;
    if (level >= 8) return 1500 + ((level - 8) * 500);
    return 0;
  };

  const getMaxPointsForLevel = (level: number): number => {
    if (level === 1) return 100;
    if (level === 2) return 200;
    if (level === 3) return 350;
    if (level === 4) return 550;
    if (level === 5) return 800;
    if (level === 6) return 1100;
    if (level === 7) return 1500;
    if (level >= 8) return 2000 + ((level - 8) * 500);
    return 100;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-accent text-accent-foreground font-medium" 
      : "hover:bg-accent/50";
  };

  const isNavDisabled = () => false;

  const handleNavigation = (url: string, disabled: boolean = false) => {
    if (!disabled) {
      navigate(url);
      if (isMobile) {
        setTimeout(() => setOpenMobile(false), 100);
      }
    }
  };

  // Theme functions
  const themeStatus = getThemeStatus();
  const themeIconType = getThemeIcon();

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

  const getThemeTooltip = () => {
    if (themeStatus.override) {
      return `Dark Mode Override (${themeStatus.nextChange} remaining)`;
    }
    if (themeStatus.isAuto) {
      return `Auto Mode: ${themeStatus.current} until ${themeStatus.nextChange}`;
    }
    return themeStatus.current === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      {/* UNTER BEOBACHTUNG: Level-Anzeige temporär ausgeblendet
      <SidebarHeader className="border-b border-border/40 pb-4">
        {userPoints && (
          <>
            {!collapsed ? (
              <div className="flex items-start gap-3 px-2">
                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6" style={{ color: userPoints.level_name === 'Gold' ? '#FFD700' : userPoints.level_name === 'Silver' ? '#C0C0C0' : userPoints.level_name === 'Bronze' ? '#CD7F32' : '#4A90E2' }}>
                  {userPoints.level_name === 'Rookie' && <Star className="w-5 h-5" />}
                  {userPoints.level_name === 'Bronze' && <Award className="w-5 h-5" />}
                  {userPoints.level_name === 'Silver' && <Trophy className="w-5 h-5" />}
                  {(userPoints.level_name === 'Gold' || userPoints.level_name === 'Platinum' || userPoints.level_name === 'Diamond' || userPoints.level_name === 'Master' || userPoints.level_name === 'Grandmaster') && <Crown className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground mb-2">
                    Level {userPoints.current_level} {userPoints.level_name} | {userPoints.total_points.toLocaleString()} Punkte
                  </div>
                  
                  <Progress 
                    value={((userPoints.total_points - getMinPointsForLevel(userPoints.current_level)) / (getMaxPointsForLevel(userPoints.current_level) - getMinPointsForLevel(userPoints.current_level))) * 100} 
                    className="h-1.5"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center px-2">
                <div className="flex items-center justify-center h-6 w-6" style={{ color: userPoints.level_name === 'Gold' ? '#FFD700' : userPoints.level_name === 'Silver' ? '#C0C0C0' : userPoints.level_name === 'Bronze' ? '#CD7F32' : '#4A90E2' }}>
                  {userPoints.level_name === 'Rookie' && <Star className="w-5 h-5" />}
                  {userPoints.level_name === 'Bronze' && <Award className="w-5 h-5" />}
                  {userPoints.level_name === 'Silver' && <Trophy className="w-5 h-5" />}
                  {(userPoints.level_name === 'Gold' || userPoints.level_name === 'Platinum' || userPoints.level_name === 'Diamond' || userPoints.level_name === 'Master' || userPoints.level_name === 'Grandmaster') && <Crown className="w-5 h-5" />}
                </div>
              </div>
            )}
          </>
        )}
      </SidebarHeader>
      */}

      <SidebarContent className="gap-2">
        {/* Main Navigation with ARES/FREYA integrated */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* UNTER BEOBACHTUNG: ARES/FREYA temporär ausgeblendet
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    className={`${getNavClass(userGender === 'male' ? '/coach/ares' : '/coach/freya')} font-semibold`}
                    size={collapsed ? "sm" : "default"}
                  >
                    <button
                      onClick={() => handleNavigation(userGender === 'male' ? '/coach/ares' : '/coach/freya')}
                      className="flex items-center w-full"
                    >
                      {userGender === 'male' ? (
                        <Zap className={`h-4 w-4 ${collapsed ? "" : "mr-3"} text-amber-500`} />
                      ) : (
                        <Crown className={`h-4 w-4 ${collapsed ? "" : "mr-3"} text-purple-500`} />
                      )}
                      {!collapsed && (
                        <span>{userGender === 'male' ? 'ARES' : 'FREYA'}</span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              */}

              {/* Rest der Navigation */}
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    className={getNavClass(item.url)}
                    size={collapsed ? "sm" : "default"}
                  >
                    <button
                      onClick={() => handleNavigation(item.url, isNavDisabled())}
                      className="flex items-center w-full"
                    >
                      <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
                      {!collapsed && (
                        <span>{item.key ? t(item.key) : item.title}</span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Einstellungen - Collapsible */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className={`cursor-pointer flex items-center justify-between hover:bg-accent/30 rounded-md px-2 py-1 ${collapsed ? "sr-only" : ""}`}>
                <span>Einstellungen</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsItems.map((item) => {
                    if (item.adminOnly && !(user?.email?.includes('admin') || process.env.NODE_ENV === 'development')) {
                      return null;
                    }
                    
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton 
                          asChild 
                          className={getNavClass(item.url)}
                          size={collapsed ? "sm" : "default"}
                        >
                          <button
                            onClick={() => handleNavigation(item.url)}
                            className="flex items-center w-full"
                          >
                            <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
                            {!collapsed && (
                              <span>{item.key ? t(item.key) : item.title}</span>
                            )}
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  
                  {/* Dark Mode Toggle */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={toggleTheme}
                      className="hover:bg-accent/50"
                      size={collapsed ? "sm" : "default"}
                      title={getThemeTooltip()}
                    >
                      {renderThemeIcon()}
                      {!collapsed && <span className="ml-3">Dark Mode</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {/* Bug Report */}
                  <SidebarMenuItem>
                    <BugReportDialog 
                      trigger={
                        <SidebarMenuButton 
                          className="hover:bg-accent/50 w-full justify-start"
                          size={collapsed ? "sm" : "default"}
                        >
                          <Bug className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
                          {!collapsed && <span>Bug melden</span>}
                        </SidebarMenuButton>
                      }
                    />
                  </SidebarMenuItem>

                  {/* Logout */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={handleSignOut}
                      className="hover:bg-accent/50 text-destructive hover:text-destructive"
                      size={collapsed ? "sm" : "default"}
                    >
                      <LogOut className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
                      {!collapsed && <span>{t('header.logout')}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Rechtliches - Collapsible */}
        <Collapsible open={legalOpen} onOpenChange={setLegalOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className={`cursor-pointer flex items-center justify-between hover:bg-accent/30 rounded-md px-2 py-1 ${collapsed ? "sr-only" : ""}`}>
                <span>Rechtliches</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${legalOpen ? 'rotate-180' : ''}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {legalItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton 
                        asChild 
                        className={getNavClass(item.url)}
                        size={collapsed ? "sm" : "default"}
                      >
                        <button
                          onClick={() => handleNavigation(item.url)}
                          className="flex items-center w-full"
                        >
                          <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
                          {!collapsed && (
                            <span>{item.title}</span>
                          )}
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}
