'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Building2,
  Users,
  Building,
  MessageSquare,
  Settings,
  FileText,
  Home,
  X,
  User,
  LogOut,
  Users2
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'

export type AdminSection =
  | 'dashboard'
  | 'properties'
  | 'requests'
  | 'messages'
  | 'users'
  | 'settings'

interface AdminSidebarProps {
  activeSection: AdminSection
  onSectionChange: (section: AdminSection) => void
  isMobileOpen?: boolean
  onMobileToggle?: () => void
}

const navigationItems = [
  {
    category: 'General',
    items: [
      { id: 'dashboard' as AdminSection, label: 'Dashboard', icon: BarChart3 },
      { id: 'messages' as AdminSection, label: 'Mensajes', icon: MessageSquare },
      { id: 'requests' as AdminSection, label: 'Solicitudes', icon: FileText },
    ]
  },
  {
    category: 'Gestión',
    items: [
      { id: 'properties' as AdminSection, label: 'Propiedades', icon: Home },
    ]
  },

  {
    category: 'Sistema',
    items: [
      { id: 'users' as AdminSection, label: 'Usuarios', icon: Users2 },
      { id: 'settings' as AdminSection, label: 'Configuración', icon: Settings },
    ]
  }
]

export function AdminSidebar({
  activeSection,
  onSectionChange,
  isMobileOpen = false,
  onMobileToggle,
}: AdminSidebarProps) {
  const { signOut } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-[100dvh] w-72 transform border-r border-white/10 bg-[#0f172a]/95 backdrop-blur-xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) lg:relative lg:translate-x-0 overflow-hidden shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[30%] bg-primary/10 blur-[100px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[30%] bg-blue-500/10 blur-[80px] rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col h-full">

          {/* Header */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-white tracking-tight">Vendra</h2>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Admin Panel</p>
              </div>
            </div>

            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/70 hover:text-white hover:bg-white/10"
              onClick={onMobileToggle}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 no-scrollbar">
            {navigationItems.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="px-4 text-xs font-bold uppercase tracking-wider text-white/40 mb-3">{group.category}</h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeSection === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSectionChange(item.id)
                          onMobileToggle?.()
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden',
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 font-medium'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-emerald-500 rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                        )}
                        <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                        <span className="text-sm tracking-wide">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-black/20">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors pl-4"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </Button>
            <div className="mt-4 text-[10px] text-center text-white/20 font-mono">
              v1.0.4 • Build 240
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar