import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageCircle, 
  Dumbbell,
  BarChart3,
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Trophy, 
  Microscope, 
  Bug, 
  LogOut 
} from "lucide-react";
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
import { LevelBadge } from "./LevelBadge";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Coaching", url: "/coach", icon: MessageCircle },
  { title: "Workout", url: "/training", icon: Dumbbell },
  { title: "Analyse", url: "/history", icon: BarChart3 },
  { title: "Profil", url: "/profile", icon: UserIcon, key: "header.profile" },
];

const settingsItems = [
  { title: "Einstellungen", url: "/account", icon: Settings, key: "header.account" },
  { title: "Subscription", url: "/subscription", icon: CreditCard, key: "header.subscription" },
  { title: "Erfolge", url: "/achievements", icon: Trophy },
  { title: "Wissenschaft", url: "/science", icon: Microscope },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const { userPoints } = usePointsSystem();
  const navigate = useNavigate();
  const location = useLocation();
  
  const collapsed = state === "collapsed";

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

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      {/* Header with Level Badge */}
      <SidebarHeader className="border-b border-border/40 pb-4">
        {userPoints && (
          <>
            {!collapsed ? (
              <div className="flex items-start gap-3 px-2">
                {/* Sich füllender Kreis links */}
                <div className="relative h-6 w-6 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-secondary/20" />
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from 0deg, hsl(var(--primary)) ${((userPoints.total_points - getMinPointsForLevel(userPoints.current_level)) / (getMaxPointsForLevel(userPoints.current_level) - getMinPointsForLevel(userPoints.current_level))) * 100}%, transparent ${((userPoints.total_points - getMinPointsForLevel(userPoints.current_level)) / (getMaxPointsForLevel(userPoints.current_level) - getMinPointsForLevel(userPoints.current_level))) * 100}%)`
                    }}
                  />
                  <div className="absolute inset-1 rounded-full bg-background" />
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
                {/* Nur der Kreis im collapsed State */}
                <div className="relative h-6 w-6">
                  <div className="absolute inset-0 rounded-full bg-secondary/20" />
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from 0deg, hsl(var(--primary)) ${((userPoints.total_points - getMinPointsForLevel(userPoints.current_level)) / (getMaxPointsForLevel(userPoints.current_level) - getMinPointsForLevel(userPoints.current_level))) * 100}%, transparent ${((userPoints.total_points - getMinPointsForLevel(userPoints.current_level)) / (getMaxPointsForLevel(userPoints.current_level) - getMinPointsForLevel(userPoints.current_level))) * 100}%)`
                    }}
                  />
                  <div className="absolute inset-1 rounded-full bg-background" />
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
                      onClick={() => navigate(item.url)}
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

        {/* Settings & More */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Einstellungen
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    className={getNavClass(item.url)}
                    size={collapsed ? "sm" : "default"}
                  >
                    <button
                      onClick={() => navigate(item.url)}
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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}