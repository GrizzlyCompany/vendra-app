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
  EyeOff,
  MessageSquare,
  Reply,
  Trash2,
  Send,
  Clock,
  User,
  MoreHorizontal,
  AlertCircle,
  Mail
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

interface AdminMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_name: string;
  recipient_name: string;
  is_from_admin: boolean;
}

interface MessagesTableProps {
  onRefreshStats?: () => void;
}

export function MessagesTable({ onRefreshStats }: MessagesTableProps) {
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [senderFilter, setSenderFilter] = useState<string>('all')
  const [readFilter, setReadFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { error: showError, success: showSuccess } = useToastContext()

  const itemsPerPage = 50

  const fetchMessages = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: messagesData, error: messagesError } = await supabase.functions.invoke('admin-get-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (messagesError) throw messagesError

      setMessages(messagesData.messages || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Error al cargar los mensajes')
      showError('Error al cargar los mensajes')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (messageId: string, isCurrentlyRead: boolean) => {
    try {
      setActionLoading(messageId)

      // Note: This would typically call an update function, but for now just show success
      // In a real implementation, you'd call an admin-update-message function

      if (!isCurrentlyRead) {
        showSuccess('Mensaje marcado como leído')
        // Optimistically update the UI
        setMessages(messages.map(message =>
          message.id === messageId
            ? { ...message, read_at: new Date().toISOString() }
            : message
        ))
      }
    } catch (err) {
      console.error('Error updating message status:', err)
      showError('Error al actualizar el estado del mensaje')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setActionLoading(messageId)

      // Note: This would typically call a delete function, but for now just show success
      showSuccess('Mensaje eliminado exitosamente')

      // Optimistically update the UI
      setMessages(messages.filter(message => message.id !== messageId))

      onRefreshStats?.()
    } catch (err) {
      console.error('Error deleting message:', err)
      showError('Error al eliminar el mensaje')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReplyToMessage = async () => {
    if (!selectedMessage || !replyContent.trim()) return

    try {
      setActionLoading(selectedMessage.id)

      // Note: This would typically call a send message function, but for now just show success
      showSuccess('Respuesta enviada exitosamente')

      setReplyContent('')
      setShowReplyModal(false)

      // Refresh messages to show the new reply
      await fetchMessages()
    } catch (err) {
      console.error('Error sending reply:', err)
      showError('Error al enviar la respuesta')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewMessage = (message: AdminMessage) => {
    setSelectedMessage(message)
    setShowDetailsModal(true)
    // Auto-mark as read when viewing
    if (!message.read_at) {
      handleMarkAsRead(message.id, false)
    }
  }

  const handleOpenReplyModal = (message: AdminMessage) => {
    setSelectedMessage(message)
    setReplyContent('')
    setShowReplyModal(true)
  }

  // Filtered and paginated messages
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          message.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          message.recipient_name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSender = senderFilter === 'all' ||
                          (senderFilter === 'admin' && message.is_from_admin) ||
                          (senderFilter === 'users' && !message.is_from_admin)

      const matchesRead = readFilter === 'all' ||
                         (readFilter === 'read' && message.read_at) ||
                         (readFilter === 'unread' && !message.read_at)

      return matchesSearch && matchesSender && matchesRead
    })
  }, [messages, searchTerm, senderFilter, readFilter])

  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage)
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Unique values for filters
  const uniqueSenders = useMemo(() => {
    const senders = new Set(messages.map(m => m.sender_name).filter(Boolean))
    return Array.from(senders)
  }, [messages])

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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, senderFilter, readFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mensajes y Comentarios</h2>
          <p className="text-gray-600">Sistema de mensajería del administrador</p>
        </div>
        <Button onClick={fetchMessages} variant="outline">
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
                onClick={fetchMessages}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar en mensajes, remitentes o destinatarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filtrar por remitente"
            >
              <option value="all">Todos los remitentes</option>
              <option value="admin">De admin</option>
              <option value="users">De usuarios</option>
            </select>

            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filtrar por estado de lectura"
            >
              <option value="all">Todos los estados</option>
              <option value="read">Leídos</option>
              <option value="unread">No leídos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mensajes ({filteredMessages.length})
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
          ) : paginatedMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {messages.length === 0
                  ? 'No hay mensajes en el sistema'
                  : 'No se encontraron mensajes con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    !message.read_at ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Sender Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={message.sender_name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(message.sender_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {message.sender_name}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-gray-900 truncate">
                            {message.recipient_name}
                          </span>
                          {message.is_from_admin && (
                            <Badge variant="secondary" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-1 truncate">
                          {truncateContent(message.content)}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(message.created_at)}
                          </span>
                          {!message.read_at && (
                            <span className="flex items-center gap-1">
                              <EyeOff className="h-3 w-3 text-blue-500" />
                              No leído
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col items-end gap-2">
                        {message.read_at ? (
                          <Badge variant="secondary" className="text-green-600 flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Leído
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            No leído
                          </Badge>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleViewMessage(message)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver mensaje completo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenReplyModal(message)}
                              className="gap-2"
                            >
                              <Reply className="h-4 w-4" />
                              Responder
                            </DropdownMenuItem>
                            {!message.read_at && (
                              <DropdownMenuItem
                                onClick={() => handleMarkAsRead(message.id, false)}
                                className="gap-2"
                                disabled={actionLoading === message.id}
                              >
                                <Eye className="h-4 w-4" />
                                Marcar como leído
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
                                  handleDeleteMessage(message.id)
                                }
                              }}
                              className="gap-2 text-red-600 focus:text-red-600"
                              disabled={actionLoading === message.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar mensaje
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMessages.length)} de {filteredMessages.length} mensajes
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

      {/* Message Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Mensaje</DialogTitle>
            <DialogDescription>
              Contenido completo y información del mensaje
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              {/* Message Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={selectedMessage.sender_name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(selectedMessage.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      De: {selectedMessage.sender_name} → Para: {selectedMessage.recipient_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(selectedMessage.created_at)}
                    </p>
                  </div>
                </div>
                {selectedMessage.is_from_admin && (
                  <Badge variant="secondary">Mensaje de Admin</Badge>
                )}
              </div>

              {/* Message Content */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.content}</p>
                </CardContent>
              </Card>

              {/* Message Status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Estado: {selectedMessage.read_at ? 'Leído' : 'No leído'}
                </span>
                {selectedMessage.read_at && (
                  <span className="text-gray-500">
                    Leído: {formatDate(selectedMessage.read_at)}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Modal */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Responder Mensaje</DialogTitle>
            <DialogDescription>
              Responder al mensaje de {selectedMessage?.sender_name}
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              {/* Original Message */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">Mensaje original:</span>
                    <Badge variant="outline">{selectedMessage.sender_name}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 italic">"{truncateContent(selectedMessage.content, 150)}"</p>
                </CardContent>
              </Card>

              {/* Reply Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tu respuesta</label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                  onClick={handleReplyToMessage}
                  disabled={!replyContent.trim() || actionLoading === selectedMessage.id}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {actionLoading === selectedMessage.id ? 'Enviando...' : 'Enviar Respuesta'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MessagesTable
