'use client'

import { useState } from 'react'
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
  Menu,
  X,
} from 'lucide-react'

export type AdminSection =
  | 'dashboard'
  | 'properties'
  | 'agents'
  | 'companies'
  | 'requests'
  | 'messages'
  | 'settings'

interface AdminSidebarProps {
  activeSection: AdminSection
  onSectionChange: (section: AdminSection) => void
  isMobileOpen?: boolean
  onMobileToggle?: () => void
}

const navigationItems = [
  {
    id: 'dashboard' as AdminSection,
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Vista General',
  },
  {
    id: 'properties' as AdminSection,
    label: 'Propiedades',
    icon: Home,
    description: 'Gestión de Propiedades',
  },
  {
    id: 'agents' as AdminSection,
    label: 'Agentes',
    icon: Users,
    description: 'Agentes Inmobiliarios',
  },
  {
    id: 'companies' as AdminSection,
    label: 'Constructoras',
    icon: Building,
    description: 'Empresas Constructoras',
  },
  {
    id: 'requests' as AdminSection,
    label: 'Solicitudes',
    icon: FileText,
    description: 'Formularios y Solicitudes',
  },
  {
    id: 'messages' as AdminSection,
    label: 'Mensajes',
    icon: MessageSquare,
    description: 'Mensajes y Comentarios',
  },
  {
    id: 'settings' as AdminSection,
    label: 'Configuración',
    icon: Settings,
    description: 'Sistema y Configuración',
  },
]

export function AdminSidebar({
  activeSection,
  onSectionChange,
  isMobileOpen = false,
  onMobileToggle,
}: AdminSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform border-r bg-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          </div>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMobileToggle}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 text-left font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => {
                    onSectionChange(item.id)
                    onMobileToggle?.() // Close mobile sidebar on navigation
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-xs text-gray-500">{item.description}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="text-xs text-gray-500 text-center">
            Vendra Admin v1.0
          </div>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar
