'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Home,
  Users,
  Building,
  Eye,
  TrendingUp,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToastContext } from '@/components/ToastProvider'
import { useAuth } from '@/features/auth/hooks/useAuth'

interface DashboardStats {
  activeProperties: number;
  buyersCount: number;
  agentsCount: number;
  companiesCount: number;
  websiteVisits: number;
  propertiesWithAgents: number;
}

interface RecentProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  created_at: string;
  images: string[];
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { error: showError } = useToastContext()
  const { session, loading: authLoading } = useAuth()

  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setError(null)

      // Check if user is authenticated
      if (!session?.access_token) {
        throw new Error('Usuario no autenticado')
      }

      console.log('🔍 Fetching admin stats...')

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase.functions.invoke('admin-get-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (statsError) {
        console.error('❌ Stats error:', statsError)
        console.error('❌ Stats error details:', {
          message: statsError.message,
          details: statsError.details,
          status: statsError.status,
          hint: statsError.hint
        })
        throw new Error(`Error al obtener estadísticas: ${statsError.message}`)
      }

      if (!statsData) {
        throw new Error('No se recibieron datos de estadísticas')
      }

      console.log('✅ Stats data received:', statsData)
      setStats(statsData.stats)

      // Fetch recent properties
      console.log('🔍 Fetching recent properties...')
      const { data: propertiesData, error: propertiesError } = await supabase.functions.invoke('admin-get-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (propertiesError) {
        console.error('❌ Properties error:', propertiesError)
        console.error('❌ Properties error details:', {
          message: propertiesError.message,
          details: propertiesError.details,
          status: propertiesError.status,
          hint: propertiesError.hint
        })

        // More specific error handling
        let errorMessage = 'Error al obtener propiedades'
        if (propertiesError.message) {
          errorMessage += `: ${propertiesError.message}`
        }
        if (propertiesError.details) {
          errorMessage += ` (${propertiesError.details})`
        }
        if (propertiesError.status) {
          errorMessage += ` [Status: ${propertiesError.status}]`
        }

        throw new Error(errorMessage)
      }

      if (!propertiesData?.properties) {
        throw new Error('No se recibieron datos de propiedades')
      }

      console.log('✅ Properties data received:', propertiesData.properties.length, 'properties')

      // Get the 5 most recent properties
      const recent = propertiesData.properties
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      setRecentProperties(recent)

    } catch (err: any) {
      console.error('❌ Error fetching dashboard data:', err)
      console.error('❌ Error stack:', err.stack)

      // Handle specific error types
      let errorMessage = 'Error al cargar las estadísticas'

      if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        errorMessage = 'Error de autenticación. Por favor, inicia sesión nuevamente.'
      } else if (err.message?.includes('403')) {
        errorMessage = 'Acceso denegado. No tienes permisos de administrador.'
      } else if (err.message?.includes('500')) {
        errorMessage = 'Error del servidor. Por favor, intenta nuevamente.'
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.'
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      showError(errorMessage)

      // Clear stats if there was an error to show empty state
      setStats(null)
      setRecentProperties([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchStats(true)
  }

  // Initial load - wait for authentication to complete
  useEffect(() => {
    if (!authLoading && session?.access_token) {
      fetchStats()
    }
  }, [authLoading, session])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(true)
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return <DashboardSkeleton />
  }

  const formatCurrency = (amount: number, currency: string = 'DOP') => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Vista general del portal Vendra</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Error de carga</h3>
                <p className="text-red-600 text-sm">{error}</p>
                <details className="mt-2">
                  <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                    Ver detalles técnicos
                  </summary>
                  <p className="text-xs text-red-400 mt-1 font-mono">
                    Revisa la consola del navegador para más detalles técnicos
                  </p>
                </details>
              </div>
              <Button
                onClick={() => fetchStats()}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Propiedades Activas"
          value={stats?.activeProperties.toString() || '0'}
          icon={<Home className="h-8 w-8" />}
          description="Publicado y disponible"
          trend="+12% este mes"
          loading={loading && refreshing}
        />

        <MetricCard
          title="Compradores Registrados"
          value={stats?.buyersCount.toString() || '0'}
          icon={<Users className="h-8 w-8" />}
          description="Usuarios compradores"
          trend="+8% esta semana"
          loading={loading && refreshing}
        />

        <MetricCard
          title="Agentes Inmobiliarios"
          value={stats?.agentsCount.toString() || '0'}
          icon={<Users className="h-8 w-8" />}
          description="Profesionales activos"
          trend="+2 nuevos"
          loading={loading && refreshing}
        />

        <MetricCard
          title="Constructoras Reg."
          value={stats?.companiesCount.toString() || '0'}
          icon={<Building className="h-8 w-8" />}
          description="Empresas afiliadas"
          trend="Estable"
          loading={loading && refreshing}
        />

        <MetricCard
          title="Visitas al Portal"
          value={stats?.websiteVisits.toString() || '0'}
          icon={<Eye className="h-8 w-8" />}
          description="Visitas totales"
          trend="+25% esta semana"
          loading={loading && refreshing}
        />

        <MetricCard
          title="Prop. con Agentes"
          value={stats?.propertiesWithAgents.toString() || '0'}
          icon={<TrendingUp className="h-8 w-8" />}
          description="Gestionadas por agentes"
          trend={`${stats ? ((stats.propertiesWithAgents / stats.activeProperties) * 100).toFixed(1) : '0'}%`}
          loading={loading && refreshing}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              Propiedades Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentProperties.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay propiedades recientes
              </p>
            ) : (
              <div className="space-y-4">
                {recentProperties.map((property) => (
                  <div key={property.id} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
                    <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      {property.images?.length > 0 ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                          <Home className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {property.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {property.location} • {formatCurrency(property.price)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Creado {formatDate(property.created_at)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Nueva
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" variant="outline">
              <Users className="h-4 w-4" />
              Ver todas las propiedades
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Building className="h-4 w-4" />
              Gestionar agentes
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Eye className="h-4 w-4" />
              Revisar solicitudes pendientes ({'5'})
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <TrendingUp className="h-4 w-4" />
              Ver reportes de actividad
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  description: string
  trend: string
  loading?: boolean
}

function MetricCard({ title, value, icon, description, trend, loading }: MetricCardProps) {
  const isPositive = trend.includes('+') || trend.includes('Estable');

  return (
    <Card className="relative overflow-hidden border-none shadow-lg bg-white dark:bg-card group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Decorative gradient background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

      <CardContent className="p-6 relative z-10">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                {icon}
              </div>
              <Badge
                variant="outline"
                className={`
                    border-none px-2.5 py-0.5 rounded-full font-medium
                    ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}
                `}
              >
                {trend}
              </Badge>
            </div>

            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-foreground font-serif tracking-tight">{value}</h3>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">{title}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-12" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardOverview
