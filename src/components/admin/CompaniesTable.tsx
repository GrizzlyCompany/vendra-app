'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Building,
  Building2,
  Phone,
  Mail,
  MoreHorizontal,
  AlertCircle,
  Calendar,
  CheckCheck
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

interface AdminCompany {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  contact_person: string | null;
  projects_count: number;
  verification_status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  website?: string;
}

interface CompaniesTableProps {
  onRefreshStats?: () => void;
}

export function CompaniesTable({ onRefreshStats }: CompaniesTableProps) {
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { error: showError, success: showSuccess } = useToastContext()

  const itemsPerPage = 50
  const [currentPage, setCurrentPage] = useState(1)

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: companiesData, error: companiesError } = await supabase.functions.invoke('admin-get-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (companiesError) throw companiesError

      setCompanies(companiesData.companies || [])
    } catch (err) {
      console.error('Error fetching companies:', err)
      setError('Error al cargar las empresas')
      showError('Error al cargar las empresas')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (companyId: string, newStatus: 'approved' | 'pending' | 'rejected') => {
    try {
      setActionLoading(companyId)

      // Note: This would typically call an admin-update-company function
      // For now, we'll simulate the status change

      showSuccess(`Empresa ${newStatus === 'approved' ? 'aprobada' : newStatus === 'rejected' ? 'rechazada' : 'marcada como pendiente'} exitosamente`)

      // Optimistically update the UI
      setCompanies(companies.map(company =>
        company.id === companyId
          ? { ...company, verification_status: newStatus }
          : company
      ))

      onRefreshStats?.()
    } catch (err) {
      console.error('Error updating company status:', err)
      showError('Error al actualizar el estado de la empresa')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewCompany = (company: AdminCompany) => {
    setSelectedCompany(company)
    setShowDetailsModal(true)
  }

  const handleEditCompany = (companyId: string) => {
    // This would navigate to edit page or open edit modal
    showSuccess('Funcionalidad de edición próximamente disponible')
  }

  // Filtered and paginated companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.contact_person && company.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || company.verification_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [companies, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage)
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Unique values for filters
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(companies.map(c => c.verification_status)))
  }, [companies])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: 'approved' | 'pending' | 'rejected') => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: 'approved' | 'pending' | 'rejected') => {
    switch (status) {
      case 'approved': return 'Aprobada'
      case 'pending': return 'Pendiente'
      case 'rejected': return 'Rechazada'
      default: return status
    }
  }

  const getVerificationBadge = (status: 'approved' | 'pending' | 'rejected') => {
    const icon = status === 'approved' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                 status === 'rejected' ? <XCircle className="h-3 w-3 mr-1" /> :
                 <AlertCircle className="h-3 w-3 mr-1" />

    return (
      <Badge className={getStatusColor(status)} variant="secondary">
        {icon}
        {getStatusText(status)}
      </Badge>
    )
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Empresas Constructoras</h2>
          <p className="text-gray-600">Gestión de empresas constructoras registradas</p>
        </div>
        <Button onClick={fetchCompanies} variant="outline">
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
                onClick={fetchCompanies}
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
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o persona de contacto..."
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
              title="Filtrar por estado de verificación"
            >
              <option value="all">Todos los estados</option>
              <option value="approved">Aprobadas</option>
              <option value="pending">Pendientes</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Empresas ({filteredCompanies.length})
          </CardTitle>
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
          ) : paginatedCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {companies.length === 0
                  ? 'No hay empresas registradas'
                  : 'No se encontraron empresas con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Company Logo/Icon */}
                  <div className="h-12 w-12 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {company.name}
                        </h3>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{company.email}</span>
                        </div>

                        {company.contact_person && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="h-3 w-3" />
                            <span>Contacto: {company.contact_person}</span>
                            {company.phone && (
                              <span className="text-gray-400">• {company.phone}</span>
                            )}
                          </div>
                        )}

                        {company.website && (
                          <div className="text-sm text-blue-600 mt-1 truncate">
                            🌐 {company.website}
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col items-end gap-2">
                        {getVerificationBadge(company.verification_status)}

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building className="h-4 w-4" />
                          <span>{company.projects_count} proyectos</span>
                        </div>
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
                        onClick={() => handleViewCompany(company)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditCompany(company.id)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar información
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {company.verification_status !== 'approved' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(company.id, 'approved')}
                          className="gap-2 text-green-600 focus:text-green-600"
                          disabled={actionLoading === company.id}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprobar empresa
                        </DropdownMenuItem>
                      )}
                      {company.verification_status !== 'pending' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(company.id, 'pending')}
                          className="gap-2 text-yellow-600 focus:text-yellow-600"
                          disabled={actionLoading === company.id}
                        >
                          <AlertCircle className="h-4 w-4" />
                          Marcar como pendiente
                        </DropdownMenuItem>
                      )}
                      {company.verification_status !== 'rejected' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(company.id, 'rejected')}
                          className="gap-2 text-red-600 focus:text-red-600"
                          disabled={actionLoading === company.id}
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar empresa
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCompanies.length)} de {filteredCompanies.length} empresas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perfil de Empresa</DialogTitle>
            <DialogDescription>
              Información completa de la empresa constructora
            </DialogDescription>
          </DialogHeader>

          {selectedCompany && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedCompany.name}</h3>
                  <p className="text-gray-600 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {selectedCompany.email}
                  </p>
                  {selectedCompany.website && (
                    <p className="text-blue-600 flex items-center gap-1 mt-1">
                      🌐 {selectedCompany.website}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    {getVerificationBadge(selectedCompany.verification_status)}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCompany.contact_person && (
                  <div>
                    <label className="font-medium text-sm text-gray-600">Persona de Contacto</label>
                    <p className="text-lg font-medium mt-1">{selectedCompany.contact_person}</p>
                  </div>
                )}

                {selectedCompany.phone && (
                  <div>
                    <label className="font-medium text-sm text-gray-600">Teléfono</label>
                    <p className="text-lg font-medium mt-1">{selectedCompany.phone}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedCompany.projects_count}
                    </div>
                    <p className="text-sm text-gray-600">Proyectos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedCompany.verification_status === 'approved' ? 'Sí' : 'No'}
                    </div>
                    <p className="text-sm text-gray-600">Verificada</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-gray-900">
                      {formatDate(selectedCompany.created_at).split(' ')[2]}
                    </div>
                    <p className="text-sm text-gray-600">Registrada</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-gray-900">
                      Activa
                    </div>
                    <p className="text-sm text-gray-600">Estado</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <div>
                  <label className="font-medium text-sm text-gray-600">ID de Empresa</label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                    {selectedCompany.id}
                  </p>
                </div>

                <div>
                  <label className="font-medium text-sm text-gray-600">Fecha de Registro</label>
                  <p className="text-sm mt-1">{formatDate(selectedCompany.created_at)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1"
                >
                  Cerrar
                </Button>
                {selectedCompany.verification_status === 'pending' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusChange(selectedCompany.id, 'rejected')}
                      disabled={actionLoading === selectedCompany.id}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleStatusChange(selectedCompany.id, 'approved')}
                      disabled={actionLoading === selectedCompany.id}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CompaniesTable
