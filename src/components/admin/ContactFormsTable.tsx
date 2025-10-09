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
  Reply,
  Archive,
  CheckCircle,
  Mail,
  Phone,
  User,
  Calendar,
  MoreHorizontal,
  MessageSquare,
  Send,
  AlertCircle
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

interface AdminContactForm {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: 'pending' | 'responded' | 'archived';
  created_at: string;
  updated_at: string;
  responder_id: string | null;
  response_message: string | null;
}

interface ContactFormsTableProps {
  onRefreshStats?: () => void;
}

export function ContactFormsTable({ onRefreshStats }: ContactFormsTableProps) {
  const [contactForms, setContactForms] = useState<AdminContactForm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedForm, setSelectedForm] = useState<AdminContactForm | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { success: showSuccess, error: showError } = useToastContext()

  const itemsPerPage = 50
  const [currentPage, setCurrentPage] = useState(1)

  const fetchContactForms = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: formsData, error: formsError } = await supabase.functions.invoke('admin-get-contact-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (formsError) throw formsError

      setContactForms(formsData.contactForms || [])
    } catch (err) {
      console.error('Error fetching contact forms:', err)
      setError('Error al cargar formularios de contacto')
      showError('Error al cargar formularios de contacto')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (formId: string, newStatus: 'pending' | 'responded' | 'archived') => {
    try {
      setActionLoading(formId)

      // Note: This would typically call an admin-update-contact-form function
      // For now, we'll simulate the status change

      const statusText = newStatus === 'responded' ? 'respondido' :
                        newStatus === 'archived' ? 'archivado' :
                        'marcado como pendiente'

      showSuccess(`Formulario ${statusText} exitosamente`)

      // Optimistically update the UI
      setContactForms(contactForms.map(form =>
        form.id === formId
          ? { ...form, status: newStatus, updated_at: new Date().toISOString() }
          : form
      ))

      onRefreshStats?.()
    } catch (err) {
      console.error('Error updating contact form status:', err)
      showError('Error al actualizar el estado del formulario')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReplyToForm = async () => {
    if (!selectedForm || !replyMessage.trim()) return

    try {
      setActionLoading(selectedForm.id)

      // Note: This would typically call a send email function
      // For now, we'll simulate saving the response

      showSuccess('Respuesta enviada exitosamente')

      setReplyMessage('')
      setShowReplyModal(false)

      // Update the form status and response
      setContactForms(contactForms.map(form =>
        form.id === selectedForm.id
          ? {
              ...form,
              status: 'responded',
              response_message: replyMessage,
              responder_id: 'admin', // In a real app, this would be the admin's ID
              updated_at: new Date().toISOString()
            }
          : form
      ))

      onRefreshStats?.()
    } catch (err) {
      console.error('Error sending reply:', err)
      showError('Error al enviar la respuesta')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewForm = (form: AdminContactForm) => {
    setSelectedForm(form)
    setShowDetailsModal(true)
  }

  const handleOpenReplyModal = (form: AdminContactForm) => {
    setSelectedForm(form)
    setReplyMessage(form.response_message || '')
    setShowReplyModal(true)
  }

  // Filtered and paginated contact forms
  const filteredForms = useMemo(() => {
    return contactForms.filter(form => {
      const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          form.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          form.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (form.phone && form.phone.includes(searchTerm))

      const matchesStatus = statusFilter === 'all' || form.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [contactForms, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredForms.length / itemsPerPage)
  const paginatedForms = filteredForms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: 'pending' | 'responded' | 'archived') => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'responded': return 'bg-green-100 text-green-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: 'pending' | 'responded' | 'archived') => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'responded': return 'Respondido'
      case 'archived': return 'Archivado'
      default: return status
    }
  }

  const getVerificationBadge = (status: 'pending' | 'responded' | 'archived') => {
    const icon = status === 'responded' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                 status === 'archived' ? <Archive className="h-3 w-3 mr-1" /> :
                 <AlertCircle className="h-3 w-3 mr-1" />

    return (
      <Badge className={getStatusColor(status)} variant="secondary">
        {icon}
        {getStatusText(status)}
      </Badge>
    )
  }

  const truncateMessage = (message: string, maxLength: number = 120) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message
  }

  useEffect(() => {
    fetchContactForms()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Formularios de Contacto</h2>
          <p className="text-gray-600">Gestión de solicitudes de contacto y consultas</p>
        </div>
        <Button onClick={fetchContactForms} variant="outline">
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
                onClick={fetchContactForms}
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
                  placeholder="Buscar por nombre, email, teléfono o mensaje..."
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
              <option value="pending">Pendientes</option>
              <option value="responded">Respondidos</option>
              <option value="archived">Archivados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Contact Forms List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Lista de Formularios ({filteredForms.length})
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
          ) : paginatedForms.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {contactForms.length === 0
                  ? 'No hay formularios de contacto registrados'
                  : 'No se encontraron formularios con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedForms.map((form) => (
                <div
                  key={form.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    form.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* Form Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {form.name}
                          </span>
                          {getVerificationBadge(form.status)}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{form.email}</span>
                          {form.phone && (
                            <>
                              <span className="text-gray-400">•</span>
                              <Phone className="h-3 w-3" />
                              <span>{form.phone}</span>
                            </>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-1 truncate">
                          {truncateMessage(form.message)}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(form.created_at)}
                          </span>
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
                            onClick={() => handleViewForm(form)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenReplyModal(form)}
                            className="gap-2"
                          >
                            <Reply className="h-4 w-4" />
                            Responder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {form.status !== 'responded' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(form.id, 'responded')}
                              className="gap-2 text-green-600 focus:text-green-600"
                              disabled={actionLoading === form.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Marcar como respondido
                            </DropdownMenuItem>
                          )}
                          {form.status !== 'archived' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(form.id, 'archived')}
                              className="gap-2 text-gray-600 focus:text-gray-600"
                              disabled={actionLoading === form.id}
                            >
                              <Archive className="h-4 w-4" />
                              Archivar
                            </DropdownMenuItem>
                          )}
                          {form.status !== 'pending' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(form.id, 'pending')}
                              className="gap-2 text-yellow-600 focus:text-yellow-600"
                              disabled={actionLoading === form.id}
                            >
                              <AlertCircle className="h-4 w-4" />
                              Marcar como pendiente
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
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredForms.length)} de {filteredForms.length} formularios
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

      {/* Form Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Formulario de Contacto</DialogTitle>
            <DialogDescription>
              Información completa del formulario enviado
            </DialogDescription>
          </DialogHeader>

          {selectedForm && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{selectedForm.name}</h3>
                    {getVerificationBadge(selectedForm.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {selectedForm.email}
                    </span>
                    {selectedForm.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {selectedForm.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enviado: {formatDate(selectedForm.created_at)}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensaje</label>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedForm.message}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Response */}
              {selectedForm.response_message && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tu respuesta</label>
                  <Card className="bg-green-50">
                    <CardContent className="p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedForm.response_message}</p>
                    </CardContent>
                  </Card>
                  <p className="text-xs text-gray-500">
                    Respondido: {formatDate(selectedForm.updated_at)}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Modal */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Responder a {selectedForm?.name}</DialogTitle>
            <DialogDescription>
              Enviar respuesta al formulario de contacto
            </DialogDescription>
          </DialogHeader>

          {selectedForm && (
            <div className="space-y-4">
              {/* Original Message */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">Mensaje original de {selectedForm.name}:</span>
                  </div>
                  <p className="text-sm text-gray-700 italic">"{truncateMessage(selectedForm.message, 200)}"</p>
                </CardContent>
              </Card>

              {/* Previous Response */}
              {selectedForm.response_message && (
                <Card className="bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-green-700">Respuesta anterior:</span>
                    </div>
                    <p className="text-sm text-green-800 italic">"{selectedForm.response_message}"</p>
                  </CardContent>
                </Card>
              )}

              {/* Response Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tu respuesta</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Escribe tu respuesta al mensaje de contacto..."
                  className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowReplyModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleReplyToForm}
                  disabled={!replyMessage.trim() || actionLoading === selectedForm.id}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {actionLoading === selectedForm.id ? 'Enviando...' : 'Enviar Respuesta'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ContactFormsTable
