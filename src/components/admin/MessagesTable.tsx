'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  Filter,
  MessageSquare,
  Clock,
  MoreHorizontal,
  AlertCircle,
  Mail,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToastContext } from '@/components/ToastProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConversationDetail } from './ConversationDetail'

interface Conversation {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  conversation_type: string;
  case_status: string;
  last_message: {
    content: string;
    created_at: string;
    sender_name: string;
    is_from_admin: boolean;
  };
  message_count: number;
  unread_count?: number;
  closed_at?: string;
  closed_by?: string;
}

interface MessagesTableProps {
  onRefreshStats?: () => void;
}

export function MessagesTable({ onRefreshStats }: MessagesTableProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { error: showError, success: showSuccess } = useToastContext()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)

  const itemsPerPage = 20

  const fetchConversations = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: conversationsData, error: conversationsError } = await supabase.functions.invoke('admin-get-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (conversationsError) throw conversationsError

      setConversations(conversationsData.conversations || [])
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError('Error al cargar las conversaciones')
      showError('Error al cargar las conversaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseCase = async (conversationId: string, userId: string) => {
    try {
      setActionLoading(conversationId);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();

      // Call the admin-close-case function using fetch directly
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-close-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();

      showSuccess('Caso cerrado exitosamente. El usuario no podrá seguir chateando sobre este caso.');

      // Refresh conversations to show updated status
      await fetchConversations();

      onRefreshStats?.();
    } catch (err) {
      console.error('Error closing case:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      showError('Error al cerrar el caso: ' + errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenCase = async (conversationId: string, userId: string) => {
    try {
      setActionLoading(conversationId);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();

      // Call the admin-reopen-case function using fetch directly
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-reopen-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();

      showSuccess('Caso reabierto exitosamente. El usuario puede seguir chateando sobre este caso.');

      // Refresh conversations to show updated status
      await fetchConversations();

      onRefreshStats?.();
    } catch (err) {
      console.error('Error reopening case:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      showError('Error al reabrir el caso: ' + errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered and paginated conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      const matchesSearch = conversation.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          conversation.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          conversation.last_message.content.toLowerCase().includes(searchTerm.toLowerCase())

      // Show all conversations by default, but allow filtering by status
      const matchesStatus = statusFilter === 'all' || conversation.case_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [conversations, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage)
  const paginatedConversations = filteredConversations.slice(
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // If a conversation is selected, show the detail view
  if (selectedConversation) {
    // Validate that the selected conversation ID is valid
    const isValidConversationId = selectedConversation && 
                                  typeof selectedConversation === 'string' && 
                                  selectedConversation.length > 0;
    
    if (!isValidConversationId) {
      // If invalid, go back to the list
      setSelectedConversation(null);
      showError('ID de conversación no válido');
      return null;
    }
    
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ConversationDetail 
            conversationId={selectedConversation} 
            onBack={() => setSelectedConversation(null)} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Conversaciones de Soporte</h2>
          <p className="text-gray-600">Gestión de casos y mensajería de usuarios</p>
        </div>
        <Button onClick={fetchConversations} variant="outline">
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
                onClick={fetchConversations}
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
                  placeholder="Buscar por usuario, email o contenido..."
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
              title="Filtrar por estado del caso"
            >
              <option value="all">Todos los casos</option>
              <option value="open">Casos abiertos</option>
              <option value="closed">Casos cerrados</option>
              <option value="resolved">Casos resueltos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Conversaciones ({filteredConversations.length})
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
          ) : paginatedConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {conversations.length === 0
                  ? 'No hay conversaciones activas'
                  : 'No se encontraron conversaciones con los filtros aplicados'
                }
              </p>
              <Button 
                onClick={fetchConversations} 
                variant="outline" 
                className="mt-4"
              >
                Recargar conversaciones
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
                    conversation.unread_count && conversation.unread_count > 0
                      ? 'bg-blue-50 border-blue-200'
                      : conversation.case_status === 'closed'
                      ? 'bg-gray-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    // Validate conversation ID before setting it
                    if (conversation.id && typeof conversation.id === 'string' && conversation.id.length > 0) {
                      setSelectedConversation(conversation.id);
                    } else {
                      showError('ID de conversación no válido');
                    }
                  }}
                >
                  {/* User Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={conversation.user_name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(conversation.user_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Conversation Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {conversation.user_name}
                          </span>
                          <span className="text-gray-400 text-sm">
                            ({conversation.user_email})
                          </span>
                          {conversation.case_status === 'closed' && (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                              Cerrado
                            </Badge>
                          )}
                          {conversation.unread_count && conversation.unread_count > 0 && (
                            <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                              {conversation.unread_count} sin leer
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-1 truncate">
                          {conversation.last_message.is_from_admin ? 'Tú: ' : ''}
                          {truncateContent(conversation.last_message.content)}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(conversation.last_message.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {conversation.message_count} mensajes
                          </span>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col items-end gap-2">
                        {conversation.case_status === 'open' ? (
                          <Badge variant="outline" className="text-green-600 border-green-300 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Abierto
                          </Badge>
                        ) : conversation.case_status === 'closed' ? (
                          <Badge variant="secondary" className="text-gray-600 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Cerrado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 flex items-center gap-1">
                            Resuelto
                          </Badge>
                        )}

                        {conversation.case_status === 'open' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones del Caso</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`¿Estás seguro de que quieres cerrar el caso con ${conversation.user_name}? Una vez cerrado, el usuario no podrá seguir chateando sobre este caso.`)) {
                                    handleCloseCase(conversation.id, conversation.user_id);
                                  }
                                }}
                                className="gap-2 text-orange-600 focus:text-orange-600"
                                disabled={actionLoading === conversation.id}
                              >
                                <XCircle className="h-4 w-4" />
                                {actionLoading === conversation.id ? 'Cerrando...' : 'Cerrar Caso'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : conversation.case_status === 'closed' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones del Caso</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`¿Estás seguro de que quieres reabrir el caso con ${conversation.user_name}? El usuario podrá seguir chateando sobre este caso.`)) {
                                    handleReopenCase(conversation.id, conversation.user_id);
                                  }
                                }}
                                className="gap-2 text-green-600 focus:text-green-600"
                                disabled={actionLoading === conversation.id}
                              >
                                <CheckCircle className="h-4 w-4" />
                                {actionLoading === conversation.id ? 'Reabriendo...' : 'Reabrir Caso'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredConversations.length)} de {filteredConversations.length} conversaciones
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

    </div>
  )
}

export default MessagesTable