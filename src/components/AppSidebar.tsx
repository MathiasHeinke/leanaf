import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Dumbbell,
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Bug, 
  LogOut,
  FileText,
  Shield,
  Info,
  History as HistoryIcon,
  Sun,
  Moon,
  Clock,
  ChevronDown,
  FlaskConical,
  Sparkles,
  Utensils,
  Pill,
  Syringe,
  Dna,
  LineChart
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { BugReportDialog } from "./BugReportDialog";

// Navigation item type
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  key?: string;
  adminOnly?: boolean;
}

// Group 1: LIVE - The Cockpit
const GROUP_LIVE: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

// Group 2: ARES PROTOKOLL - Strategy & Builder
const GROUP_PROTOKOLL: NavItem[] = [
  { title: "ARES Protokoll", url: "/protocol", icon: FlaskConical },
  { title: "Routinen", url: "/routines", icon: Sparkles, comingSoon: true },
  { title: "Training", url: "/training", icon: Dumbbell },
  { title: "Ernährung", url: "/nutrition-planner", icon: Utensils, comingSoon: true },
  { title: "Supplements", url: "/supplements", icon: Pill, comingSoon: true },
  { title: "Peptide", url: "/peptides", icon: Syringe, comingSoon: true },
];

// Group 3: ANALYSE & DATEN - The Lab
const GROUP_ANALYSE: NavItem[] = [
  { title: "Bio-Daten", url: "/biodata", icon: Dna },
  { title: "Analyse", url: "/analyse", icon: LineChart },
  { title: "Logbuch", url: "/history", icon: HistoryIcon },
];

// Group 4: SYSTEM
const GROUP_SYSTEM: NavItem[] = [
  { title: "Profil", url: "/profile", icon: UserIcon },
];

const settingsItems: NavItem[] = [
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
  const { toggleTheme, getThemeStatus, getThemeIcon } = useAutoDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  
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

  const handleNavigation = (url: string) => {
    navigate(url);
    if (isMobile) {
      setTimeout(() => setOpenMobile(false), 100);
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

  // Render a navigation group
  const renderNavGroup = (
    items: typeof GROUP_LIVE, 
    label: string, 
    showDivider: boolean = false
  ) => (
    <SidebarGroup className={showDivider ? "border-t border-border/40 pt-2" : ""}>
      <SidebarGroupLabel className={`text-xs font-medium text-muted-foreground uppercase tracking-wider ${collapsed ? "sr-only" : "px-2 mb-1"}`}>
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton 
                asChild 
                className={`${getNavClass(item.url)} ${item.comingSoon ? "opacity-70" : ""}`}
                size={collapsed ? "sm" : "default"}
              >
                <button
                  onClick={() => handleNavigation(item.url)}
                  className="flex items-center w-full"
                >
                  <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      {item.comingSoon && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-2">
                          Soon
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent className="gap-0">
        {/* Group 1: LIVE */}
        {renderNavGroup(GROUP_LIVE, "Live")}

        {/* Group 2: PROTOKOLL */}
        {renderNavGroup(GROUP_PROTOKOLL, "Protokoll", true)}

        {/* Group 3: ANALYSE */}
        {renderNavGroup(GROUP_ANALYSE, "Analyse", true)}

        {/* Group 4: SYSTEM */}
        {renderNavGroup(GROUP_SYSTEM, "System", true)}

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
