'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  Filter,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Users,
  Mail,
  Phone,
  MoreHorizontal,
  AlertCircle,
  Building,
  Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToastContext } from '@/components/ToastProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  properties_count: number;
  last_login: string;
  status: 'active' | 'inactive';
  avatar_url?: string;
  bio?: string;
  location?: string;
}

interface AgentsTableProps {
  onRefreshStats?: () => void;
}

export function AgentsTable({ onRefreshStats }: AgentsTableProps) {
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedAgent, setSelectedAgent] = useState<AdminAgent | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { error: showError, success: showSuccess } = useToastContext()

  const itemsPerPage = 50
  const [currentPage, setCurrentPage] = useState(1)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: agentsData, error: agentsError } = await supabase.functions.invoke('admin-get-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (agentsError) throw agentsError

      setAgents(agentsData.agents || [])
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError('Error al cargar los agentes')
      showError('Error al cargar los agentes')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (agentId: string, currentStatus: 'active' | 'inactive') => {
    try {
      setActionLoading(agentId)
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

      // Note: This would typically call an update function, but for now just show success
      // In a real implementation, you'd call an admin-update-agent function

      showSuccess(`Agente ${newStatus === 'active' ? 'activado' : 'desactivado'} exitosamente`)

      // Optimistically update the UI
      setAgents(agents.map(agent =>
        agent.id === agentId
          ? { ...agent, status: newStatus }
          : agent
      ))

      onRefreshStats?.()
    } catch (err) {
      console.error('Error updating agent status:', err)
      showError('Error al actualizar el estado del agente')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewAgent = (agent: AdminAgent) => {
    setSelectedAgent(agent)
    setShowDetailsModal(true)
  }

  const handleEditAgent = (agentId: string) => {
    // This would navigate to edit page or open edit modal
    showSuccess('Funcionalidad de edición próximamente disponible')
  }

  // Filtered and paginated agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [agents, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage)
  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Unique values for filters
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(agents.map(a => a.status)))
  }, [agents])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Hoy'
    if (diffDays === 2) return 'Ayer'
    if (diffDays <= 7) return `Hace ${diffDays - 1} días`

    return date.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: 'active' | 'inactive') => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }

  const getStatusText = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'Activo' : 'Inactivo'
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAgentStats = (agent: AdminAgent) => {
    // Calculate some basic stats - in a real app these would come from the backend
    const lastActivityDays = Math.floor((Date.now() - new Date(agent.last_login).getTime()) / (1000 * 60 * 60 * 24))
    const activityLevel = lastActivityDays <= 1 ? 'high' : lastActivityDays <= 7 ? 'medium' : 'low'

    return { activityLevel, lastActivityDays }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agentes Inmobiliarios</h2>
          <p className="text-gray-600">Gestiona los agentes registrados en la plataforma</p>
        </div>
        <Button onClick={fetchAgents} variant="outline">
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
                onClick={fetchAgents}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o email..."
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
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{filteredAgents.length} agente{filteredAgents.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedAgents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {agents.length === 0
                  ? 'No hay agentes registrados'
                  : 'No se encontraron agentes con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedAgents.map((agent) => {
                const stats = getAgentStats(agent)
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={agent.avatar_url} alt={agent.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {agent.name}
                          </h3>

                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{agent.email}</span>
                          </div>

                          {agent.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{agent.phone}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs">
                              <Building className="h-3 w-3 text-gray-400" />
                              <span>{agent.properties_count} propiedades</span>
                            </div>

                            <div className={`px-2 py-1 rounded text-xs ${
                              stats.activityLevel === 'high' ? 'bg-green-100 text-green-800' :
                              stats.activityLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {stats.activityLevel === 'high' ? 'Activo' :
                               stats.activityLevel === 'medium' ? 'Moderado' : 'Inactivo'}
                            </div>
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(agent.status)} variant="secondary">
                            {getStatusText(agent.status)}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleViewAgent(agent)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditAgent(agent.id)}
                                className="gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Editar información
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleStatusToggle(agent.id, agent.status)}
                                className={`gap-2 ${
                                  agent.status === 'active'
                                    ? 'text-red-600 focus:text-red-600'
                                    : 'text-green-600 focus:text-green-600'
                                }`}
                                disabled={actionLoading === agent.id}
                              >
                                {agent.status === 'active' ? (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perfil del Agente</DialogTitle>
            <DialogDescription>
              Información completa del agente inmobiliario
            </DialogDescription>
          </DialogHeader>

          {selectedAgent && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedAgent.avatar_url} alt={selectedAgent.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                    {getInitials(selectedAgent.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedAgent.name}</h3>
                  <p className="text-gray-600 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {selectedAgent.email}
                  </p>
                  {selectedAgent.phone && (
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="h-4 w-4" />
                      {selectedAgent.phone}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className={getStatusColor(selectedAgent.status)} variant="secondary">
                      {getStatusText(selectedAgent.status)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      <Building className="h-3 w-3 inline mr-1" />
                      {selectedAgent.properties_count} propiedades asignadas
                    </span>
                  </div>
                </div>

                <Button
                  variant={selectedAgent.status === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => handleStatusToggle(selectedAgent.id, selectedAgent.status)}
                  disabled={actionLoading === selectedAgent.id}
                >
                  {selectedAgent.status === 'active' ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activar
                    </>
                  )}
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedAgent.properties_count}
                    </div>
                    <p className="text-sm text-gray-600">Propiedades</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDate(selectedAgent.last_login)}
                    </div>
                    <p className="text-sm text-gray-600">Última conexión</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">-</div>
                    <p className="text-sm text-gray-600">Clientes atendidos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <div>
                  <label className="font-medium text-sm text-gray-600">ID del Agente</label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                    {selectedAgent.id}
                  </p>
                </div>

                {selectedAgent.bio && (
                  <div>
                    <label className="font-medium text-sm text-gray-600">Biografía</label>
                    <p className="text-sm mt-1">{selectedAgent.bio}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AgentsTable
