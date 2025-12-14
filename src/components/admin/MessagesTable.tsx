'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  XCircle,
  ChevronLeft,
  ChevronRight
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
import { CustomSelect } from '@/components/ui/custom-select'
import { ConversationDetail } from './ConversationDetail'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'

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
  const { confirm, ConfirmationDialogComponent } = useConfirmationDialog()

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
      const { data: { session } } = await supabase.auth.getSession();
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

      showSuccess('Caso cerrado exitosamente');
      await fetchConversations();
      onRefreshStats?.();
    } catch (err) {
      console.error('Error closing case:', err);
      showError('Error al cerrar el caso');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenCase = async (conversationId: string, userId: string) => {
    try {
      setActionLoading(conversationId);
      const { data: { session } } = await supabase.auth.getSession();
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

      showSuccess('Caso reabierto exitosamente');
      await fetchConversations();
      onRefreshStats?.();
    } catch (err) {
      console.error('Error reopening case:', err);
      showError('Error al reabrir el caso');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      const matchesSearch = conversation.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.last_message.content.toLowerCase().includes(searchTerm.toLowerCase())
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
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
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

  if (selectedConversation) {
    return (
      <div className="h-full flex flex-col bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden shadow-sm">
        <ConversationDetail
          conversationId={selectedConversation}
          onBack={() => setSelectedConversation(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Conversaciones</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="bg-white/80">{filteredConversations.length} casos</Badge>
            <p className="text-sm text-gray-500">Soporte y Mensajería</p>
          </div>
        </div>
        <Button onClick={fetchConversations} variant="outline" className="bg-white/50 hover:bg-white shadow-sm">
          <Filter className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Error de carga</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <Button onClick={fetchConversations} variant="outline" size="sm" className="border-red-300">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl p-4 rounded-xl border border-white/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Filter className="h-4 w-4" />
          <span>Filtros y Búsqueda</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por usuario, email o contenido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 border-gray-200 focus:bg-white transition-all duration-300"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <CustomSelect
              icon={Filter}
              label="Estado del Caso"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Todos los casos' },
                { value: 'open', label: 'Casos abiertos' },
                { value: 'closed', label: 'Casos cerrados' },
                { value: 'resolved', label: 'Casos resueltos' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white/40 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg bg-white/50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedConversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No hay conversaciones</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">
              No se encontraron mensajes que coincidan con los filtros actuales.
            </p>
            <Button onClick={fetchConversations} variant="outline" className="mt-6">Recargar</Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`group flex items-center gap-4 p-4 hover:bg-white/60 transition-all duration-200 cursor-pointer ${conversation.unread_count && conversation.unread_count > 0 ? 'bg-primary/5' : ''
                  }`}
              >
                <Avatar className="h-10 w-10 border border-white shadow-sm">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 font-medium">
                    {getInitials(conversation.user_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                        {conversation.user_name}
                      </span>
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge variant="default" className="h-5 px-1.5 bg-red-500 hover:bg-red-600 border-none">
                          {conversation.unread_count} new
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                      {formatDate(conversation.last_message.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-sm truncate flex-1 ${conversation.unread_count ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}>
                      {conversation.last_message.is_from_admin && <span className="text-primary font-medium">Tú: </span>}
                      {truncateContent(conversation.last_message.content)}
                    </p>

                    <div className="flex items-center gap-2">
                      {conversation.case_status === 'open' ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 rounded-md">
                          <CheckCircle className="h-3 w-3" /> Abierto
                        </Badge>
                      ) : conversation.case_status === 'closed' ? (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 gap-1 rounded-md">
                          <XCircle className="h-3 w-3" /> Cerrado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 rounded-md">
                          Resuelto
                        </Badge>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 group-hover:text-gray-700">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          {conversation.case_status === 'open' ? (
                            <DropdownMenuItem
                              onClick={() => {
                                confirm(
                                  'Cerrar Caso',
                                  `¿Cerrar caso con ${conversation.user_name}? El usuario no podrá responder.`,
                                  () => handleCloseCase(conversation.id, conversation.user_id),
                                  { type: 'danger', confirmText: 'Cerrar Caso' }
                                )
                              }}
                              className="gap-2 text-red-600 focus:text-red-700 cursor-pointer"
                              disabled={actionLoading === conversation.id}
                            >
                              <XCircle className="h-4 w-4" />
                              Cerrar Caso
                            </DropdownMenuItem>
                          ) : conversation.case_status === 'closed' ? (
                            <DropdownMenuItem
                              onClick={() => {
                                confirm(
                                  'Reabrir Caso',
                                  `¿Reabrir caso con ${conversation.user_name}?`,
                                  () => handleReopenCase(conversation.id, conversation.user_id),
                                  { type: 'info', confirmText: 'Reabrir' }
                                )
                              }}
                              className="gap-2 text-green-600 focus:text-green-700 cursor-pointer"
                              disabled={actionLoading === conversation.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Reabrir Caso
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white/30 backdrop-blur-sm border-t border-white/20">
            <p className="text-xs text-gray-500">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialogComponent />
    </div>
  )
}

export default MessagesTable