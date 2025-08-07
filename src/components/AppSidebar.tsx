import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  MessageCircle, 
  Dumbbell,
  TrendingUp,
  BarChart3,
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Trophy, 
  Microscope, 
  Bug, 
  LogOut,
  Star,
  Award,
  Crown,
  Lightbulb,
  MapPin,
  FileText,
  Shield,
  Info,
  Mail,
  History as HistoryIcon,
  Brain
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
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { BugReportDialog } from "./BugReportDialog";
import { FeatureRequestDialog } from "./FeatureRequestDialog";
import { LevelBadge } from "./LevelBadge";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Coaching", url: "/coach", icon: MessageCircle },
  { title: "Workout", url: "/training", icon: Dumbbell },
  { title: "Transformation", url: "/transformation", icon: TrendingUp },
  { title: "History", url: "/history", icon: HistoryIcon },
  { title: "Analyse", url: "/analyse", icon: BarChart3 },
  { title: "Erfolge", url: "/achievements", icon: Trophy },
  { title: "Profil", url: "/profile", icon: UserIcon, key: "header.profile" },
];

const settingsItems = [
  { title: "Einstellungen", url: "/account", icon: Settings, key: "header.account" },
  { title: "Credits & Packs", url: "/credits", icon: CreditCard, key: "header.subscription" },
  { title: "Wissenschaft", url: "/science", icon: Microscope },
  { title: "Features", url: "/features", icon: Lightbulb },
  { title: "Roadmap", url: "/roadmap", icon: MapPin },
  { title: "Email", url: "/marketing", icon: Mail },
  { title: "Admin", url: "/admin", icon: Shield, adminOnly: true },
  { title: "Gehirn", url: "/gehirn", icon: Brain, adminOnly: true },
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
  const { isProfileComplete } = useProfileCompletion();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasMarketingRole, setHasMarketingRole] = useState<boolean>(false);
  
  const collapsed = state === "collapsed";

  useEffect(() => {
    const checkMarketingRole = async () => {
      if (!user) {
        setHasMarketingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('current_user_has_role', {
          _role: 'marketing'
        });
        if (error) {
          console.error('Error checking marketing role:', error);
          setHasMarketingRole(false);
        } else {
          setHasMarketingRole(data || false);
        }
      } catch (error) {
        console.error('Error checking marketing role:', error);
        setHasMarketingRole(false);
      }
    };

    checkMarketingRole();
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
    const baseClass = isActive(path) 
      ? "bg-accent text-accent-foreground font-medium" 
      : "hover:bg-accent/50";
    
    // Disable navigation if profile not complete (except for Profile and Settings pages)
    if (!isProfileComplete && path !== "/profile" && path !== "/account") {
      return `${baseClass} opacity-50 cursor-not-allowed`;
    }
    
    return baseClass;
  };

  const isNavDisabled = (path: string) => {
    return !isProfileComplete && path !== "/profile" && path !== "/account";
  };

  const handleNavigation = (url: string, disabled: boolean = false) => {
    if (!disabled) {
      navigate(url);
      if (isMobile) {
        setTimeout(() => setOpenMobile(false), 100);
      }
    }
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      {/* Header with Level Badge */}
      <SidebarHeader className="border-b border-border/40 pb-4">
        {userPoints && (
          <>
            {!collapsed ? (
              <div className="flex items-start gap-3 px-2">
                {/* Level Icon links */}
                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6" style={{ color: userPoints.level_name === 'Gold' ? '#FFD700' : userPoints.level_name === 'Silver' ? '#C0C0C0' : userPoints.level_name === 'Bronze' ? '#CD7F32' : '#4A90E2' }}>
                  {userPoints.level_name === 'Rookie' && <Star className="w-5 h-5" />}
                  {userPoints.level_name === 'Bronze' && <Award className="w-5 h-5" />}
                  {userPoints.level_name === 'Silver' && <Trophy className="w-5 h-5" />}
                  {(userPoints.level_name === 'Gold' || userPoints.level_name === 'Platinum' || userPoints.level_name === 'Diamond' || userPoints.level_name === 'Master' || userPoints.level_name === 'Grandmaster') && <Crown className="w-5 h-5" />}
                </div>
                
                {/* Level Text und Progress rechts daneben */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground mb-2">
                    Level {userPoints.current_level} {userPoints.level_name} | {userPoints.total_points.toLocaleString()} Punkte
                  </div>
                  
                  {/* Kleinere Progress Bar ohne Prozente */}
                  <Progress 
                    value={((userPoints.total_points - getMinPointsForLevel(userPoints.current_level)) / (getMaxPointsForLevel(userPoints.current_level) - getMinPointsForLevel(userPoints.current_level))) * 100} 
                    className="h-1.5"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center px-2">
                {/* Nur das Level Icon im collapsed State */}
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

      <SidebarContent className="gap-6">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    className={getNavClass(item.url)}
                    size={collapsed ? "sm" : "default"}
                  >
                    <button
                      onClick={() => handleNavigation(item.url, isNavDisabled(item.url))}
                      className="flex items-center w-full relative"
                      disabled={isNavDisabled(item.url)}
                    >
                      <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span>{item.key ? t(item.key) : item.title}</span>
                          {item.url === "/profile" && !isProfileComplete && (
                            <Badge variant="destructive" className="text-xs ml-2">
                              Jetzt ausfüllen
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings & More */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Einstellungen
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                // Only show Email item if user has marketing role
                if (item.url === '/marketing' && !hasMarketingRole) {
                  return null;
                }
                
                // Only show Admin item for admin users or in development
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

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Legal */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Rechtliches
          </SidebarGroupLabel>
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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}