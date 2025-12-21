"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Menu } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useToastContext } from "@/components/ToastProvider"
import { AdminSidebar, AdminSection } from "@/components/admin/AdminSidebar"
import { DashboardOverview } from "@/components/admin/DashboardOverview"
import { PropertiesTable } from "@/components/admin/PropertiesTable"
import { MessagesTable } from "@/components/admin/MessagesTable"
import { SettingsPanel } from "@/components/admin/SettingsPanel"
import { ContactFormsTable } from "@/components/admin/ContactFormsTable"
import { ApplicationsTable } from "@/components/admin/ApplicationsTable"
import { UsersTable } from "@/components/admin/UsersTable"
import { ReportsTable } from "@/components/admin/ReportsTable"
import { supabase } from "@/lib/supabase/client"

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { error: showError, success: showSuccess } = useToastContext()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Double-check admin access
  const isAdmin = user?.email === 'admin@vendra.com' ||
    user?.email?.endsWith('@admin.com') ||
    user?.email?.endsWith('@vendra.com') ||
    false

  // Handle redirection if user is not authenticated or not admin
  useEffect(() => {
    if (authLoading) return
    if (!user || !isAdmin) {
      router.push("/")
    }
  }, [user, authLoading, router, isAdmin])

  if (authLoading) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview />
      case 'properties':
        return <PropertiesTable />

      case 'requests':
        return <ApplicationsTable />
      case 'messages':
        return <MessagesTable />
      case 'reports':
        return <ReportsTable />
      case 'users':
        return <UsersTable />
      case 'settings':
        return <SettingsPanel />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background font-sans">
      <div className="flex h-screen overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
        {/* Sidebar */}
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Header (Desktop & Mobile) */}
          <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl border-b sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-serif font-bold text-gray-800 hidden lg:block">Panel de Administración</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Sistema Operativo
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-4 md:p-8 relative">
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}