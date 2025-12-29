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
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Calendar,
  User,
  Mail,
  Phone,
  AlertCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  X,
  Building2,
  ExternalLink
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

interface SellerApplication {
  id: string
  user_id: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'needs_more_info'
  role_choice: string
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string
  submitted_at: string | null
  review_notes: string | null
  reviewer_id: string | null
  user_name: string
  user_email: string
  // KYC Document URLs
  doc_front_url: string | null
  doc_back_url: string | null
  selfie_url: string | null
  id_document_type: string | null
  id_document_number: string | null
  // Company fields
  company_name: string | null
  company_tax_id: string | null
  website_url: string | null
}

interface ApplicationsTableProps {
  onRefreshStats?: () => void
}

export function ApplicationsTable({ onRefreshStats }: ApplicationsTableProps) {
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedApplication, setSelectedApplication] = useState<SellerApplication | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { success: showSuccess, error: showError } = useToastContext()
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const itemsPerPage = 50
  const [currentPage, setCurrentPage] = useState(1)

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: appsData, error: appsError } = await supabase.functions.invoke('admin-get-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (appsError) throw appsError

      setApplications(appsData.applications || [])
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError('Error al cargar solicitudes de vendedor')
      showError('Error al cargar solicitudes de vendedor')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (appId: string, newStatus: 'approved' | 'rejected' | 'needs_more_info') => {
    try {
      setActionLoading(appId)

      // Call the admin-update-application function
      const { data, error } = await supabase.functions.invoke('admin-update-application', {
        method: 'POST',
        body: {
          application_id: appId,
          status: newStatus,
          review_notes: `Application ${newStatus} by admin`
        }
      })

      if (error) throw error

      const statusText = newStatus === 'approved' ? 'aprobada' :
        newStatus === 'rejected' ? 'rechazada' :
          'marcada como necesita más información'

      showSuccess(`Solicitud ${statusText} exitosamente`)

      // Optimistically update the UI
      setApplications(applications.map(app =>
        app.id === appId
          ? { ...app, status: newStatus }
          : app
      ))

      onRefreshStats?.()
    } catch (err) {
      console.error('Error updating application status:', err)
      showError('Error al actualizar el estado de la solicitud')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewApplication = (application: SellerApplication) => {
    setSelectedApplication(application)
    setShowDetailsModal(true)
  }

  // Filtered and paginated applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.phone && app.phone.includes(searchTerm))

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [applications, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage)
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'needs_more_info': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador'
      case 'submitted': return 'Enviada'
      case 'approved': return 'Aprobada'
      case 'rejected': return 'Rechazada'
      case 'needs_more_info': return 'Necesita más información'
      default: return status
    }
  }

  const getRoleChoiceText = (role: string | null) => {
    switch (role) {
      case 'agente_inmobiliario': return 'Agente Inmobiliario'
      case 'vendedor_particular': return 'Vendedor Particular'
      case 'empresa_constructora': return 'Empresa Constructora'
      default: return role || 'N/A'
    }
  }

  const getVerificationBadge = (status: string) => {
    const icon = status === 'approved' ? <CheckCircle className="h-3 w-3 mr-1" /> :
      status === 'rejected' ? <XCircle className="h-3 w-3 mr-1" /> :
        status === 'submitted' ? <Clock className="h-3 w-3 mr-1" /> :
          <AlertCircle className="h-3 w-3 mr-1" />

    return (
      <Badge className={getStatusColor(status)} variant="secondary">
        {icon}
        {getStatusText(status)}
      </Badge>
    )
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Solicitudes de Vendedor</h2>
          <p className="text-gray-600">Gestión de solicitudes para convertirse en vendedor/agente</p>
        </div>
        <Button onClick={fetchApplications} variant="outline">
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
                onClick={fetchApplications}
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
                  placeholder="Buscar por nombre, email o teléfono..."
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
              <option value="draft">Borrador</option>
              <option value="submitted">Enviada</option>
              <option value="approved">Aprobada</option>
              <option value="rejected">Rechazada</option>
              <option value="needs_more_info">Necesita más información</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Solicitudes ({filteredApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedApplications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {applications.length === 0
                  ? 'No hay solicitudes registradas'
                  : 'No se encontraron solicitudes con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedApplications.map((app) => (
                <div
                  key={app.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${app.status === 'submitted' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* Application Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {app.full_name || app.user_name}
                          </span>
                          {getVerificationBadge(app.status)}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{app.user_email}</span>
                          {app.phone && (
                            <>
                              <span className="text-gray-400">•</span>
                              <Phone className="h-3 w-3" />
                              <span>{app.phone}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(app.submitted_at || app.created_at)}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{getRoleChoiceText(app.role_choice)}</span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewApplication(app)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {app.status !== 'approved' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(app.id, 'approved')}
                              className="gap-2 text-green-600 focus:text-green-600"
                              disabled={actionLoading === app.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Aprobar
                            </DropdownMenuItem>
                          )}
                          {app.status !== 'rejected' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(app.id, 'rejected')}
                              className="gap-2 text-red-600 focus:text-red-600"
                              disabled={actionLoading === app.id}
                            >
                              <XCircle className="h-4 w-4" />
                              Rechazar
                            </DropdownMenuItem>
                          )}
                          {app.status !== 'needs_more_info' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(app.id, 'needs_more_info')}
                              className="gap-2 text-yellow-600 focus:text-yellow-600"
                              disabled={actionLoading === app.id}
                            >
                              <AlertCircle className="h-4 w-4" />
                              Necesita más información
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredApplications.length)} de {filteredApplications.length} solicitudes
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

      {/* Application Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Solicitud</DialogTitle>
            <DialogDescription>
              Información completa de la solicitud de vendedor
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Applicant Info */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{selectedApplication.full_name || selectedApplication.user_name}</h3>
                    {getVerificationBadge(selectedApplication.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {selectedApplication.user_email}
                    </span>
                    {selectedApplication.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {selectedApplication.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enviado: {formatDate(selectedApplication.submitted_at || selectedApplication.created_at)}
                  </p>
                </div>
              </div>

              {/* Company Details */}
              {selectedApplication.role_choice === 'empresa_constructora' && (
                <div className="space-y-2 border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-lg">Información de la Empresa</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Nombre de la Empresa</label>
                      <Card><CardContent className="p-3"><p>{selectedApplication.company_name || 'N/A'}</p></CardContent></Card>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">RNC</label>
                      <Card><CardContent className="p-3"><p>{selectedApplication.company_tax_id || 'N/A'}</p></CardContent></Card>
                    </div>
                    {selectedApplication.website_url && (
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <label className="text-sm font-medium text-gray-500">Sitio Web</label>
                        <Card>
                          <CardContent className="p-3">
                            <a href={selectedApplication.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              {selectedApplication.website_url} <ExternalLink className="h-3 w-3" />
                            </a>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de solicitud</label>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-gray-900">{getRoleChoiceText(selectedApplication.role_choice)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de creación</label>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-gray-900">{formatDate(selectedApplication.created_at)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Review Notes */}
              {selectedApplication.review_notes && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notas de revisión</label>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedApplication.review_notes}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* KYC Documents Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-lg">Verificación de Identidad (KYC)</h4>
                </div>

                {selectedApplication.id_document_number && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <span className="font-medium">Documento:</span> {selectedApplication.id_document_type === 'cedula' ? 'Cédula' : 'Pasaporte'} - {selectedApplication.id_document_number}
                  </div>
                )}

                {/* Document Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Cédula Frontal */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula Frontal</label>
                    {selectedApplication.doc_front_url ? (
                      <div
                        className="relative aspect-[3/2] rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-primary transition-colors group"
                        onClick={() => setPreviewImage(selectedApplication.doc_front_url)}
                      >
                        <img
                          src={selectedApplication.doc_front_url}
                          alt="Cédula frontal"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[3/2] rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                        <span className="text-xs text-gray-400">No subido</span>
                      </div>
                    )}
                  </div>

                  {/* Cédula Trasera */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula Trasera</label>
                    {selectedApplication.doc_back_url ? (
                      <div
                        className="relative aspect-[3/2] rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-primary transition-colors group"
                        onClick={() => setPreviewImage(selectedApplication.doc_back_url)}
                      >
                        <img
                          src={selectedApplication.doc_back_url}
                          alt="Cédula trasera"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[3/2] rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                        <span className="text-xs text-gray-400">No subido</span>
                      </div>
                    )}
                  </div>

                  {/* Selfie */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Selfie</label>
                    {selectedApplication.selfie_url ? (
                      <div
                        className="relative aspect-[3/2] rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-primary transition-colors group"
                        onClick={() => setPreviewImage(selectedApplication.selfie_url)}
                      >
                        <img
                          src={selectedApplication.selfie_url}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[3/2] rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                        <span className="text-xs text-gray-400">No subido</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Side-by-side Comparison */}
                {selectedApplication.doc_front_url && selectedApplication.selfie_url && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Comparación Visual: Cédula vs Selfie
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-200">
                        <img
                          src={selectedApplication.doc_front_url}
                          alt="Cédula"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Cédula</span>
                      </div>
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-200">
                        <img
                          src={selectedApplication.selfie_url}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Selfie</span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-3 text-center">
                      Verifica que la persona en el selfie coincida con la foto del documento
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default ApplicationsTable