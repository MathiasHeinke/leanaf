import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageCircle, 
  TrendingUp,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { BugReportDialog } from "./BugReportDialog";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, key: "header.main" },
  { title: "Coach", url: "/coach", icon: MessageCircle, key: "coach" },
  { title: "Training+", url: "/training", icon: TrendingUp },
  { title: "Analyse", url: "/history", icon: TrendingUp, key: "insights" },
  { title: "Profil", url: "/profile", icon: UserIcon, key: "header.profile" },
];

const settingsItems = [
  { title: "Einstellungen", url: "/account", icon: Settings, key: "header.account" },
  { title: "Subscription", url: "/subscription", icon: CreditCard, key: "header.subscription" },
  { title: "Erfolge", url: "/achievements", icon: Trophy, key: "achievements" },
  { title: "Wissenschaft", url: "/science", icon: Microscope, key: "science" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const collapsed = state === "collapsed";

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