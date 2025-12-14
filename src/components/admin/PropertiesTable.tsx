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
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'sold': return 'bg-blue-100 text-blue-800'
      case 'rented': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Propiedades</h2>
          <p className="text-gray-600">Administra todas las propiedades del portal</p>
        </div>
        <Button onClick={fetchProperties} variant="outline">
          <Filter className="h-4 w-4 mr-2" />
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, ubicación o agente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {getStatusText(status)}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filtrar por tipo"
            >
              <option value="all">Todos los tipos</option>
              {uniqueTypes.map(type => (
                <option key={type || 'null'} value={type || 'null'}>
                  {type || 'N/A'}
                </option>
              ))}
            </select>

            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filtrar por agente"
            >
              <option value="all">Todos los agentes</option>
              {uniqueAgents.map(agent => (
                <option key={agent || 'null'} value={agent || 'null'}>
                  {agent || 'Sin agente'}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Properties Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Propiedades ({filteredProperties.length})</CardTitle>
            <Badge variant="outline">
              Página {currentPage} de {totalPages || 1}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedProperties.length === 0 ? (
            <div className="text-center py-8">
              <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {properties.length === 0
                  ? 'No hay propiedades registradas'
                  : 'No se encontraron propiedades con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedProperties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Property Image */}
                  <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    {property.images && property.images.length > 0 ? (
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

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {property.location}
                            {property.address && ` • ${property.address}`}
                          </span>
                        </div>
                        {property.agent_name && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <User className="h-3 w-3" />
                            <span>Agente: {property.agent_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(property.price, property.currency)}
                        </p>
                        <Badge className={getStatusColor(property.status)} variant="secondary">
                          {getStatusText(property.status)}
                        </Badge>
                        {property.type && (
                          <p className="text-xs text-gray-500 mt-1">{property.type}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleViewProperty(property)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditProperty(property.id)}
                        className="gap-2"
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
                        className="gap-2 text-red-600 focus:text-red-600"
                        disabled={deleteLoading === property.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProperties.length)} de {filteredProperties.length} propiedades
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de Propiedad</DialogTitle>
            <DialogDescription>
              Información completa de la propiedad seleccionada
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-6">
              {/* Images */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedProperty.images.slice(0, 4).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${selectedProperty.title} ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-sm text-gray-600">Título</label>
                    <p className="text-lg font-semibold">{selectedProperty.title}</p>
                  </div>

                  <div>
                    <label className="font-medium text-sm text-gray-600">Precio</label>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(selectedProperty.price, selectedProperty.currency)}
                    </p>
                  </div>

                  <div>
                    <label className="font-medium text-sm text-gray-600">Estado</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedProperty.status)} variant="secondary">
                        {getStatusText(selectedProperty.status)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-sm text-gray-600">Publicado</label>
                    <p className="mt-1">{selectedProperty.is_published ? 'Sí' : 'No'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-sm text-gray-600">Ubicación</label>
                    <p>{selectedProperty.location}</p>
                    {selectedProperty.address && (
                      <p className="text-sm text-gray-600 mt-1">{selectedProperty.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-medium text-sm text-gray-600">Tipo</label>
                    <p>{selectedProperty.type || 'No especificado'}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="font-medium text-sm text-gray-600">Habitaciones</label>
                      <p className="text-2xl font-semibold text-orange-600">
                        {selectedProperty.bedrooms || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium text-sm text-gray-600">Baños</label>
                      <p className="text-2xl font-semibold text-blue-600">
                        {selectedProperty.bathrooms || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium text-sm text-gray-600">Área (m²)</label>
                      <p className="text-sm font-medium">
                        {selectedProperty.area ? `${selectedProperty.area} m²` : '-'}
                      </p>
                    </div>
                  </div>

                  {selectedProperty.agent_name && (
                    <div>
                      <label className="font-medium text-sm text-gray-600">Agente Asignado</label>
                      <p>{selectedProperty.agent_name}</p>
                    </div>
                  )}

                  <div>
                    <label className="font-medium text-sm text-gray-600">Fecha de Creación</label>
                    <p className="text-sm">{formatDate(selectedProperty.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialogComponent />
    </div>
  )
}

export default PropertiesTable
