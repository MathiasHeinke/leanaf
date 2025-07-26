import React from "react"
import { useAuth } from "@/hooks/useAuth"
import { useLocation } from "react-router-dom"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { NewHeader } from "@/components/NewHeader"

interface NewLayoutProps {
  children: React.ReactNode
}

export const NewLayout = ({ children }: NewLayoutProps) => {
  const { user } = useAuth()
  const location = useLocation()
  
  // Don't show layout on auth page or if no user
  if (location.pathname === '/auth' || !user) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <NewHeader />
          <main className="flex-1 p-4 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}