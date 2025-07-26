import React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { 
  BarChart3, 
  MessageCircle, 
  Dumbbell, 
  Target, 
  Trophy, 
  Settings, 
  ArrowLeft,
  User,
  Home
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"

const mainNavItems = [
  { title: "Base", url: "/new", icon: Home },
  { title: "Insights", url: "/new/insights", icon: BarChart3 },
  { title: "Coach", url: "/new/coach", icon: MessageCircle },
  { title: "Training+", url: "/new/training", icon: Dumbbell },
  { title: "Ziele", url: "/new/goals", icon: Target },
  { title: "Erfolge", url: "/new/achievements", icon: Trophy },
]

const secondaryNavItems = [
  { title: "Einstellungen", url: "/new/settings", icon: Settings },
  { title: "Zur alten Ansicht", url: "/", icon: ArrowLeft },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  const getNavCls = (path: string) =>
    isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50"

  return (
    <Sidebar
      className={state === "collapsed" ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        {state !== "collapsed" && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">GetleanAI</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls(item.url)}
                      title={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls(item.url)}
                      title={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {state !== "collapsed" && (
          <div className="text-xs text-sidebar-foreground/60">
            GetleanAI v2.0
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}