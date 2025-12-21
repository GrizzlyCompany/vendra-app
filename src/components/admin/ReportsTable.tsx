'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Search,
    Filter,
    Flag,
    Clock,
    MoreHorizontal,
    AlertCircle,
    Eye,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    User,
    ShieldAlert,
    MessageSquare,
    Ban,
    RefreshCw,
    X,
    Loader2
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
import { CustomSelect } from '@/components/ui/custom-select'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useUserBlocks } from '@/features/messaging/hooks/useUserBlocks'

interface Report {
    id: string
    reporter: {
        id: string
        name: string
        email: string
    }
    reported_user: {
        id: string
        name: string
        email: string
    }
    reason: string
    description: string | null
    status: string
    assigned_admin_id: string | null
    resolution_notes: string | null
    created_at: string
    updated_at: string
    resolved_at: string | null
    last_message_preview?: string
}

interface ReportCounts {
    pending_count: number
    reviewing_count: number
    resolved_count: number
    dismissed_count: number
    total_count: number
}

// Reason labels in Spanish
const REASON_LABELS: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
    harassment: { label: 'Acoso', icon: ShieldAlert, color: 'text-red-600 bg-red-50 border-red-200' },
    spam: { label: 'Spam', icon: Ban, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    fraud: { label: 'Fraude', icon: AlertTriangle, color: 'text-red-700 bg-red-100 border-red-300' },
    fake_listing: { label: 'Propiedad Falsa', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    inappropriate: { label: 'Inapropiado', icon: XCircle, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    impersonation: { label: 'Suplantación', icon: User, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    other: { label: 'Otro', icon: Flag, color: 'text-gray-600 bg-gray-50 border-gray-200' }
}

interface ReportsTableProps {
    onRefreshStats?: () => void
}

export function ReportsTable({ onRefreshStats }: ReportsTableProps) {
    const router = useRouter()
    const [reports, setReports] = useState<Report[]>([])
    const [counts, setCounts] = useState<ReportCounts>({ pending_count: 0, reviewing_count: 0, resolved_count: 0, dismissed_count: 0, total_count: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('pending')
    const [currentPage, setCurrentPage] = useState(1)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const { error: showError, success: showSuccess } = useToastContext()
    const { confirm, ConfirmationDialogComponent } = useConfirmationDialog()

    // Conversation modal state
    const [viewingConversation, setViewingConversation] = useState<{
        reporterId: string;
        reportedUserId: string;
        reporterName: string;
        reportedUserName: string;
    } | null>(null)
    const [conversationMessages, setConversationMessages] = useState<any[]>([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Block user functionality
    const { blockUser, loading: blockLoading } = useUserBlocks()

    const itemsPerPage = 20

    const fetchReports = async () => {
        try {
            setLoading(true)
            setError(null)

            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-get-reported-conversations?status=${statusFilter}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                    }
                }
            )

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            setReports(data.reports || [])
            setCounts(data.counts || { pending_count: 0, reviewing_count: 0, resolved_count: 0, dismissed_count: 0, total_count: 0 })
        } catch (err) {
            console.error('Error fetching reports:', err)
            setError('Error al cargar los reportes')
            showError('Error al cargar los reportes')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateReport = async (reportId: string, updates: { status?: string; resolution_notes?: string; assign_to_me?: boolean }) => {
        try {
            setActionLoading(reportId)
            const { data: { session } } = await supabase.auth.getSession()

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-update-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ report_id: reportId, ...updates })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
            }

            const statusLabels: Record<string, string> = {
                reviewing: 'Reporte en revisión',
                resolved: 'Reporte resuelto',
                dismissed: 'Reporte descartado'
            }

            showSuccess(statusLabels[updates.status || ''] || 'Reporte actualizado')
            await fetchReports()
            onRefreshStats?.()
        } catch (err: any) {
            console.error('Error updating report:', err)
            showError(err.message || 'Error al actualizar el reporte')
        } finally {
            setActionLoading(null)
        }
    }

    // Fetch messages between two users using Edge Function (bypasses RLS)
    const fetchConversationMessages = async (user1Id: string, user2Id: string) => {
        setLoadingMessages(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-get-conversation`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                    },
                    body: JSON.stringify({
                        user1_id: user1Id,
                        user2_id: user2Id
                    })
                }
            )

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            setConversationMessages(data.messages || [])

            // Scroll to bottom after messages load
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        } catch (err) {
            console.error('Error fetching conversation:', err)
            showError('Error al cargar la conversación')
        } finally {
            setLoadingMessages(false)
        }
    }

    // Handle viewing a conversation
    const handleViewConversation = (report: Report) => {
        setViewingConversation({
            reporterId: report.reporter.id,
            reportedUserId: report.reported_user.id,
            reporterName: report.reporter.name,
            reportedUserName: report.reported_user.name
        })
        fetchConversationMessages(report.reporter.id, report.reported_user.id)
    }

    // Handle blocking a user
    const handleBlockUser = async (userId: string, userName: string) => {
        try {
            setActionLoading(userId)
            const success = await blockUser(userId)
            if (success) {
                showSuccess(`Usuario ${userName} bloqueado exitosamente`)
            } else {
                showError('Error al bloquear el usuario')
            }
        } catch (err) {
            console.error('Error blocking user:', err)
            showError('Error al bloquear el usuario')
        } finally {
            setActionLoading(null)
        }
    }

    const filteredReports = useMemo(() => {
        return reports.filter(report => {
            const matchesSearch =
                report.reporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.reporter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.reported_user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.reported_user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (report.description || '').toLowerCase().includes(searchTerm.toLowerCase())
            return matchesSearch
        })
    }, [reports, searchTerm])

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
    const paginatedReports = filteredReports.slice(
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

    useEffect(() => {
        fetchReports()
    }, [statusFilter])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter])

    return (
        <div className="space-y-6">
            {/* Header with Counts */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-gray-900">Reportes de Usuarios</h2>
                    <p className="text-sm text-gray-500 mt-1">Gestiona reportes de conversaciones entre usuarios</p>
                </div>
                <Button onClick={fetchReports} variant="outline" className="bg-white/50 hover:bg-white shadow-sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Status Queue Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => setStatusFilter('pending')}
                    className={`p-4 rounded-xl border transition-all ${statusFilter === 'pending'
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                        : 'bg-white/50 border-white/20 hover:bg-white/70'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusFilter === 'pending' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                            <Clock className={`h-5 w-5 ${statusFilter === 'pending' ? 'text-amber-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{counts.pending_count}</p>
                            <p className="text-xs text-gray-500">Pendientes</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setStatusFilter('reviewing')}
                    className={`p-4 rounded-xl border transition-all ${statusFilter === 'reviewing'
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                        : 'bg-white/50 border-white/20 hover:bg-white/70'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusFilter === 'reviewing' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Eye className={`h-5 w-5 ${statusFilter === 'reviewing' ? 'text-blue-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{counts.reviewing_count}</p>
                            <p className="text-xs text-gray-500">En Revisión</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setStatusFilter('resolved')}
                    className={`p-4 rounded-xl border transition-all ${statusFilter === 'resolved'
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                        : 'bg-white/50 border-white/20 hover:bg-white/70'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusFilter === 'resolved' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            <CheckCircle className={`h-5 w-5 ${statusFilter === 'resolved' ? 'text-emerald-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{counts.resolved_count}</p>
                            <p className="text-xs text-gray-500">Resueltos</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setStatusFilter('dismissed')}
                    className={`p-4 rounded-xl border transition-all ${statusFilter === 'dismissed'
                        ? 'bg-gray-100 border-gray-300 ring-2 ring-gray-200'
                        : 'bg-white/50 border-white/20 hover:bg-white/70'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusFilter === 'dismissed' ? 'bg-gray-200' : 'bg-gray-100'}`}>
                            <XCircle className={`h-5 w-5 ${statusFilter === 'dismissed' ? 'text-gray-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{counts.dismissed_count}</p>
                            <p className="text-xs text-gray-500">Descartados</p>
                        </div>
                    </div>
                </button>
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
                            <Button onClick={fetchReports} variant="outline" size="sm" className="border-red-300">
                                Reintentar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="bg-white/70 backdrop-blur-xl p-4 rounded-xl border border-white/40 shadow-sm">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por usuario reportado, reportador o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/50 border-gray-200 focus:bg-white transition-all duration-300"
                    />
                </div>
            </div>

            {/* Reports List */}
            <div className="bg-white/40 backdrop-blur-md border border-white/20 rounded-xl shadow-sm">
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
                ) : paginatedReports.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No hay reportes</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2">
                            {statusFilter === 'pending'
                                ? 'No hay reportes pendientes de revisión.'
                                : `No hay reportes con estado "${statusFilter}".`}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {paginatedReports.map((report) => {
                            const reasonInfo = REASON_LABELS[report.reason] || REASON_LABELS.other
                            const ReasonIcon = reasonInfo.icon

                            return (
                                <div
                                    key={report.id}
                                    className="group flex items-start gap-4 p-4 hover:bg-white/60 transition-all duration-200"
                                >
                                    {/* Reported User Avatar */}
                                    <Avatar className="h-10 w-10 border border-white shadow-sm">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="bg-gradient-to-br from-red-100 to-red-50 text-red-600 font-medium">
                                            {getInitials(report.reported_user.name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        {/* Header Row */}
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-900">
                                                    {report.reported_user.name}
                                                </span>
                                                <span className="text-gray-400 text-sm">reportado por</span>
                                                <span className="text-gray-700 text-sm font-medium">
                                                    {report.reporter.name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                                {formatDate(report.created_at)}
                                            </span>
                                        </div>

                                        {/* Reason Badge */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className={`gap-1 ${reasonInfo.color}`}>
                                                <ReasonIcon className="h-3 w-3" />
                                                {reasonInfo.label}
                                            </Badge>
                                        </div>

                                        {/* Description */}
                                        {report.description && (
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                {report.description}
                                            </p>
                                        )}

                                        {/* Message Preview */}
                                        {report.last_message_preview && (
                                            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">
                                                <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                                <span className="line-clamp-1">{report.last_message_preview}</span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2">
                                                {report.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => handleUpdateReport(report.id, { assign_to_me: true })}
                                                            disabled={actionLoading === report.id}
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            Revisar
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-xs gap-1 text-gray-500"
                                                            onClick={() => confirm(
                                                                'Descartar Reporte',
                                                                '¿Estás seguro de descartar este reporte? Esta acción indicará que no se requiere ninguna acción.',
                                                                () => handleUpdateReport(report.id, { status: 'dismissed' }),
                                                                { type: 'warning', confirmText: 'Descartar' }
                                                            )}
                                                            disabled={actionLoading === report.id}
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            Descartar
                                                        </Button>
                                                    </>
                                                )}

                                                {report.status === 'reviewing' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                                                            onClick={() => confirm(
                                                                'Resolver Reporte',
                                                                '¿Marcar este reporte como resuelto? Indica que se tomó una acción apropiada.',
                                                                () => handleUpdateReport(report.id, { status: 'resolved' }),
                                                                { type: 'info', confirmText: 'Resolver' }
                                                            )}
                                                            disabled={actionLoading === report.id}
                                                        >
                                                            <CheckCircle className="h-3 w-3" />
                                                            Resolver
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-xs gap-1 text-gray-500"
                                                            onClick={() => confirm(
                                                                'Descartar Reporte',
                                                                '¿Estás seguro de descartar este reporte?',
                                                                () => handleUpdateReport(report.id, { status: 'dismissed' }),
                                                                { type: 'warning', confirmText: 'Descartar' }
                                                            )}
                                                            disabled={actionLoading === report.id}
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            Descartar
                                                        </Button>
                                                    </>
                                                )}

                                                {(report.status === 'resolved' || report.status === 'dismissed') && (
                                                    <span className="text-xs text-gray-400">
                                                        {report.status === 'resolved' ? 'Resuelto' : 'Descartado'} {report.resolved_at && formatDate(report.resolved_at)}
                                                    </span>
                                                )}
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 group-hover:text-gray-700">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="gap-2 cursor-pointer"
                                                        onClick={() => handleViewConversation(report)}
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                        Ver Conversación
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-2 cursor-pointer"
                                                        onClick={() => {
                                                            window.open(`/profile/view?id=${report.reported_user.id}`, '_blank')
                                                        }}
                                                    >
                                                        <User className="h-4 w-4" />
                                                        Ver Perfil Reportado
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="gap-2 text-red-600 focus:text-red-700 cursor-pointer"
                                                        onClick={() => {
                                                            confirm(
                                                                'Bloquear Usuario',
                                                                `¿Estás seguro de bloquear a ${report.reported_user.name}? El usuario no podrá enviarte mensajes ni interactuar contigo.`,
                                                                () => handleBlockUser(report.reported_user.id, report.reported_user.name),
                                                                { type: 'danger', confirmText: 'Bloquear' }
                                                            )
                                                        }}
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                        Bloquear Usuario
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
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

            {/* Conversation Modal */}
            {viewingConversation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Conversación</h3>
                                <p className="text-sm text-gray-500">
                                    Entre <span className="font-medium text-gray-700">{viewingConversation.reporterName}</span> y{' '}
                                    <span className="font-medium text-gray-700">{viewingConversation.reportedUserName}</span>
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setViewingConversation(null)
                                    setConversationMessages([])
                                }}
                                className="rounded-full"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Cargando mensajes...</p>
                                    </div>
                                </div>
                            ) : conversationMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No hay mensajes entre estos usuarios</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {conversationMessages.map((msg) => {
                                        const isFromReporter = msg.sender_id === viewingConversation.reporterId
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isFromReporter ? 'justify-start' : 'justify-end'}`}
                                            >
                                                <div
                                                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isFromReporter
                                                        ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
                                                        : 'bg-blue-500 text-white rounded-br-sm'
                                                        }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                    <p className={`text-[10px] mt-1 ${isFromReporter ? 'text-gray-500' : 'text-blue-100'}`}>
                                                        {new Date(msg.created_at).toLocaleString('es-DO', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                        {' • '}
                                                        {isFromReporter ? viewingConversation.reporterName : viewingConversation.reportedUserName}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setViewingConversation(null)
                                    setConversationMessages([])
                                }}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            <ConfirmationDialogComponent />
        </div>
    )
}

export default ReportsTable
