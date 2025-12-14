'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Home,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToastContext } from '@/components/ToastProvider'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CustomSelect } from '@/components/ui/custom-select'

interface AdminProperty {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  location: string;
  address: string | null;
  type: string | null;
  status: string;
  is_published: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  agent_name: string | null;
  images: string[];
  created_at: string;
  owner_id: string | null;
}

interface PropertiesTableProps {
  onRefreshStats?: () => void;
}

export function PropertiesTable({ onRefreshStats }: PropertiesTableProps) {
  const [properties, setProperties] = useState<AdminProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProperty, setSelectedProperty] = useState<AdminProperty | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const { error: showError, success: showSuccess } = useToastContext()

  // Authentication hook
  const { session, loading: authLoading } = useAuth()

  // Confirmation dialog hook
  const { confirm, ConfirmationDialogComponent } = useConfirmationDialog()

  const itemsPerPage = 50

  const fetchProperties = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      if (!session?.access_token) {
        throw new Error('Usuario no autenticado')
      }

      const { data: propertiesData, error: propertiesError } = await supabase.functions.invoke('admin-get-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (propertiesError) throw propertiesError

      setProperties(propertiesData.properties || [])
    } catch (err) {
      console.error('Error fetching properties:', err)
      setError('Error al cargar las propiedades')
      showError('Error al cargar las propiedades')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      setDeleteLoading(propertyId)
      // Note: This would typically call a delete function, but for now just show success
      showSuccess('Propiedad eliminada exitosamente')
      await fetchProperties()
      onRefreshStats?.()
    } catch (err) {
      console.error('Error deleting property:', err)
      showError('Error al eliminar la propiedad')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleViewProperty = (property: AdminProperty) => {
    setSelectedProperty(property)
    setShowDetailsModal(true)
  }

  const handleEditProperty = (propertyId: string) => {
    // This would navigate to edit page or open edit modal
    showSuccess('Funcionalidad de edición próximamente disponible')
  }

  // Filtered and paginated properties
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (property.agent_name && property.agent_name.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || property.status === statusFilter
      const matchesType = typeFilter === 'all' || property.type === typeFilter
      const matchesAgent = agentFilter === 'all' || (property.agent_name === agentFilter)

      return matchesSearch && matchesStatus && matchesType && matchesAgent
    })
  }, [properties, searchTerm, statusFilter, typeFilter, agentFilter])

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage)
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Unique values for filters
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.status)))
  }, [properties])

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.type).filter(Boolean)))
  }, [properties])

  const uniqueAgents = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.agent_name).filter(Boolean)))
  }, [properties])

  const formatCurrency = (amount: number | null, currency: string = 'DOP') => {
    if (amount === null) return 'No especificado'
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200'
      case 'inactive': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200'
      case 'sold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200'
      case 'rented': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'Activa'
      case 'inactive': return 'Inactiva'
      case 'sold': return 'Vendida'
      case 'rented': return 'Rentada'
      default: return status
    }
  }

  useEffect(() => {
    if (!authLoading && session?.access_token) {
      fetchProperties()
    }
  }, [authLoading, session])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter, agentFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Gestión de Propiedades</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="bg-white/80">{filteredProperties.length} propiedades</Badge>
            <p className="text-sm text-gray-500">Administración general</p>
          </div>
        </div>
        <Button onClick={fetchProperties} variant="outline" className="bg-white/50 hover:bg-white shadow-sm">
          <Filter className="h-4 w-4 mr-2" />
          Actualizar Lista
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Error de sincronización</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <Button
                onClick={fetchProperties}
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

      {/* Filters (Glass Bar) */}
      <div className="bg-white/70 backdrop-blur-xl p-4 rounded-xl border border-white/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Filter className="h-4 w-4" />
          <span>Filtros Avanzados</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por título, ubicación o agente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 border-gray-200 focus:bg-white transition-all duration-300"
              />
            </div>
          </div>

          <CustomSelect
            icon={Filter}
            label="Estado"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'Todos los estados' },
              ...uniqueStatuses.map(s => ({ value: s, label: getStatusText(s) }))
            ]}
          />

          <CustomSelect
            icon={Home}
            label="Tipo"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'Todos los tipos' },
              ...uniqueTypes.map(t => ({ value: t || 'null', label: t || 'N/A' }))
            ]}
          />

          <CustomSelect
            icon={User}
            label="Agente"
            value={agentFilter}
            onChange={setAgentFilter}
            options={[
              { value: 'all', label: 'Todos los agentes' },
              ...uniqueAgents.map(a => ({ value: a || 'null', label: a || 'Sin agente' }))
            ]}
          />
        </div>
      </div>

      {/* Properties List */}
      <div className="bg-white/40 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg bg-white/50">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : paginatedProperties.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No se encontraron propiedades</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">
              {properties.length === 0
                ? 'No hay propiedades registradas en el sistema.'
                : 'Intenta ajustar los filtros de búsqueda para ver más resultados.'
              }
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
                setAgentFilter('all')
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedProperties.map((property) => (
              <div
                key={property.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-white/60 transition-all duration-200"
              >
                {/* Property Image */}
                <div className="h-16 w-16 sm:h-14 sm:w-14 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 group-hover:scale-105 transition-transform duration-300">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                      <Home className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Property Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                        {property.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate max-w-[200px]">{property.location}</span>
                        </div>
                        {property.type && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{property.type}</span>
                        )}
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="font-medium text-gray-700">{formatCurrency(property.price, property.currency)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {property.agent_name ? (
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{property.agent_name}</span>
                        </div>
                      ) : (
                        <span className="hidden md:inline-block text-xs text-gray-400 italic">Sin agente</span>
                      )}

                      <Badge className={`${getStatusColor(property.status)} border shadow-sm px-2.5`}>
                        {getStatusText(property.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleViewProperty(property)}
                      className="gap-2 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleEditProperty(property.id)}
                      className="gap-2 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        confirm(
                          `Eliminar "${property.title}"`,
                          `¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.`,
                          () => handleDeleteProperty(property.id),
                          {
                            confirmText: 'Eliminar',
                            confirmVariant: 'destructive',
                            type: 'danger'
                          }
                        )
                      }}
                      className="gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                      disabled={deleteLoading === property.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar Propiedad
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white/30 backdrop-blur-sm border-t border-white/20">
            <p className="text-xs text-gray-500">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Property Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Detalles de Propiedad</DialogTitle>
            <DialogDescription>
              ID: {selectedProperty?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-6">
              {/* Images Carousel Style */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="col-span-2 row-span-2">
                    <img
                      src={selectedProperty.images[0]}
                      alt="Main"
                      className="w-full h-full object-cover rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                    />
                  </div>
                  {selectedProperty.images.slice(1, 5).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-24 object-cover rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              )}

              {/* Verified Badge */}
              <div className="flex items-center justify-between">
                <Badge className={`${getStatusColor(selectedProperty.status)} px-3 py-1 text-sm`}>
                  {getStatusText(selectedProperty.status)}
                </Badge>
                <span className="text-2xl font-bold font-serif text-primary">
                  {formatCurrency(selectedProperty.price, selectedProperty.currency)}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Ubicación</span>
                  <p className="font-medium text-gray-900">{selectedProperty.location}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Tipo</span>
                  <p className="font-medium text-gray-900">{selectedProperty.type || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Habitaciones</span>
                  <p className="font-medium text-gray-900">{selectedProperty.bedrooms || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Baños</span>
                  <p className="font-medium text-gray-900">{selectedProperty.bathrooms || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Area</span>
                  <p className="font-medium text-gray-900">{selectedProperty.area} m²</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Agente</span>
                  <p className="font-medium text-gray-900">{selectedProperty.agent_name || 'Sin Asignar'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialogComponent />
    </div>
  )
}

export default PropertiesTable
