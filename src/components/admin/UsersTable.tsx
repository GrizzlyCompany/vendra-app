"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Search,
    Trash2,
    AlertTriangle,
    User,
    Mail,
    Calendar,
    Shield,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Users,
    UserX,
    Clock,
    CheckCircle,
    XCircle,
    Heart,
    Building2,
    Filter
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


type UserRecord = {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    inserted_at: string;
    avatar_url: string | null;
    primary_phone: string | null;
    deletion_scheduled_at: string | null;
};

type DeletionRequest = {
    id: string;
    user_id: string;
    user_email: string | null;
    user_name: string | null;
    reason: string | null;
    status: string;
    requested_at: string;
    processed_at: string | null;
    scheduled_completion_at: string | null;
};

export function UsersTable() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
    const [processingRequest, setProcessingRequest] = useState<string | null>(null);
    const [roleFilter, setRoleFilter] = useState("all");
    const [stats, setStats] = useState<Record<string, { properties?: number; favorites?: number }>>({});
    const [verifications, setVerifications] = useState<Record<string, string>>({});
    const pageSize = 10;


    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("users")
                .select("*", { count: "exact", head: true });

            if (roleFilter !== "all") {
                query = query.eq("role", roleFilter);
            }

            const { count } = await query;
            setTotalCount(count || 0);

            let dataQuery = supabase
                .from("users")
                .select("id, name, email, role, inserted_at, avatar_url, primary_phone, deletion_scheduled_at")
                .order("inserted_at", { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (roleFilter !== "all") {
                dataQuery = dataQuery.eq("role", roleFilter);
            }

            const { data, error } = await dataQuery;

            if (error) throw error;
            setUsers(data || []);

            // Fetch stats for these users
            if (data && data.length > 0) {
                const userIds = data.map(u => u.id);

                // Initialize stats object
                const newStats: Record<string, { properties?: number; favorites?: number }> = {};

                // Get property counts for agents/companies
                const { data: propStats } = await supabase
                    .from("properties")
                    .select("owner_id")
                    .in("owner_id", userIds);

                // Get favorite counts for buyers
                const { data: favStats } = await supabase
                    .from("favorites")
                    .select("user_id")
                    .in("user_id", userIds);

                // Check verification status (seller_applications)
                const { data: verificationStats } = await supabase
                    .from("seller_applications")
                    .select("user_id, status")
                    .in("user_id", userIds)
                    .in("status", ["approved", "submitted"]);

                // Map verification status
                const verificationMap: Record<string, string> = {};
                verificationStats?.forEach(v => {
                    verificationMap[v.user_id] = v.status;
                });
                setVerifications(verificationMap);

                // Count properties
                propStats?.forEach(p => {
                    if (!newStats[p.owner_id]) newStats[p.owner_id] = {};
                    newStats[p.owner_id].properties = (newStats[p.owner_id].properties || 0) + 1;
                });

                // Count favorites
                favStats?.forEach(f => {
                    if (!newStats[f.user_id]) newStats[f.user_id] = {};
                    newStats[f.user_id].favorites = (newStats[f.user_id].favorites || 0) + 1;
                });

                setStats(newStats);
            }

            // Fetch pending deletion requests
            const { data: requests, error: reqError } = await supabase
                .from("deletion_requests")
                .select("*")
                .eq("status", "pending")
                .order("requested_at", { ascending: false });

            if (!reqError) {
                setDeletionRequests(requests || []);
            }
        } catch (error: any) {
            console.error("Error fetching users:", error);
            if (error) {
                console.error("Error Details:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            }
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter]);


    const handleApproveRequest = async (request: DeletionRequest) => {
        setProcessingRequest(request.id);
        try {
            const userId = request.user_id;

            // Delete all user data (same as handleDeleteUser)
            await supabase.from("properties").delete().eq("owner_id", userId);
            await supabase.from("projects").delete().eq("owner_id", userId);
            await supabase.from("messages").delete().eq("sender_id", userId);
            await supabase.from("messages").delete().eq("receiver_id", userId);
            await supabase.from("conversations").delete().eq("buyer_id", userId);
            await supabase.from("conversations").delete().eq("seller_id", userId);
            await supabase.from("seller_applications").delete().eq("user_id", userId);
            await supabase.from("push_subscriptions").delete().eq("user_id", userId);
            await supabase.from("reviews").delete().eq("reviewer_id", userId);
            await supabase.from("reviews").delete().eq("reviewed_id", userId);
            await supabase.from("favorites").delete().eq("user_id", userId);

            // Update request status to completed
            await supabase
                .from("deletion_requests")
                .update({ status: "completed", processed_at: new Date().toISOString() })
                .eq("id", request.id);

            // Delete user
            await supabase.from("users").delete().eq("id", userId);

            fetchUsers();
        } catch (error) {
            console.error("Error processing deletion:", error);
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        setProcessingRequest(requestId);
        try {
            await supabase
                .from("deletion_requests")
                .update({ status: "rejected", processed_at: new Date().toISOString() })
                .eq("id", requestId);
            fetchUsers();
        } catch (error) {
            console.error("Error rejecting request:", error);
        } finally {
            setProcessingRequest(null);
        }
    };

    const filteredUsers = users.filter((u) => {
        const term = searchTerm.toLowerCase();
        return (
            u.name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.role?.toLowerCase().includes(term)
        );
    });

    const handleDeleteUser = async () => {
        if (!deleteTarget || deleteConfirmText !== "ELIMINAR") return;

        setDeleting(true);
        try {
            // Delete user data from all related tables
            const userId = deleteTarget.id;

            // Delete from properties
            await supabase.from("properties").delete().eq("owner_id", userId);

            // Delete from projects
            await supabase.from("projects").delete().eq("owner_id", userId);

            // Delete from messages (sent)
            await supabase.from("messages").delete().eq("sender_id", userId);

            // Delete from messages (received) - or you might want to keep these
            await supabase.from("messages").delete().eq("receiver_id", userId);

            // Delete from conversations (where user is participant)
            await supabase.from("conversations").delete().eq("buyer_id", userId);
            await supabase.from("conversations").delete().eq("seller_id", userId);

            // Delete from seller_applications
            await supabase.from("seller_applications").delete().eq("user_id", userId);

            // Delete from push_subscriptions
            await supabase.from("push_subscriptions").delete().eq("user_id", userId);

            // Delete from reviews
            await supabase.from("reviews").delete().eq("reviewer_id", userId);
            await supabase.from("reviews").delete().eq("reviewed_id", userId);

            // Delete from favorites
            await supabase.from("favorites").delete().eq("user_id", userId);

            // Finally, delete the user record
            const { error } = await supabase.from("users").delete().eq("id", userId);

            if (error) throw error;

            // Refresh list
            setDeleteTarget(null);
            setDeleteConfirmText("");
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
        } finally {
            setDeleting(false);
        }
    };

    const getRoleBadge = (user: UserRecord) => {
        const verificationStatus = verifications[user.id];
        const isVerified = verificationStatus === "approved";
        const isSubmitted = verificationStatus === "submitted";

        // Logic: specific roles NEED verification to be true professionals
        const needsVerification = ["agente", "vendedor", "empresa_constructora"].includes(user.role || "");

        if (user.role === "admin") {
            return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Admin</Badge>;
        }

        // Unverified Professional handling
        if (needsVerification && !isVerified) {
            if (isSubmitted) {
                return <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">Solicitud Enviada</Badge>;
            }
            // If they have the role but no application, it's an anomaly or pre-application
            return <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50">No Verificado</Badge>;
        }

        switch (user.role) {
            case "agente":
                return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Agente Pro</Badge>;
            case "vendedor":
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Vendedor</Badge>;
            case "empresa_constructora":
                return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Empresa Constructora</Badge>;
            case "comprador":
            default:
                return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Comprador</Badge>;
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Gestión de Usuarios
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Administra cuentas de usuarios y solicitudes de eliminación
                    </p>
                </div>
                {/* Filters and Search */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <Tabs value={roleFilter} onValueChange={setRoleFilter} className="w-full md:w-auto">
                            <TabsList className="grid grid-cols-2 md:inline-flex md:w-auto h-auto p-1 bg-muted/50">
                                <TabsTrigger value="all" className="px-4 py-2">Todos</TabsTrigger>
                                <TabsTrigger value="vendedor" className="px-4 py-2">Vendedores</TabsTrigger>
                                <TabsTrigger value="agente" className="px-4 py-2">Agentes</TabsTrigger>
                                <TabsTrigger value="empresa_constructora" className="px-4 py-2">Empresas</TabsTrigger>
                                <TabsTrigger value="comprador" className="px-4 py-2">Compradores</TabsTrigger>
                                <TabsTrigger value="admin" className="px-4 py-2">Admins</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar usuarios..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-full md:w-64"
                                />
                            </div>
                            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-md">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalCount}</p>
                            <p className="text-xs text-muted-foreground">Total Usuarios</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{users.filter(u => u.role === "vendedor").length}</p>
                            <p className="text-xs text-muted-foreground">Vendedores</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{users.filter(u => u.role === "agente").length}</p>
                            <p className="text-xs text-muted-foreground">Agentes</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{users.filter(u => u.role === "empresa_constructora").length}</p>
                            <p className="text-xs text-muted-foreground">Empresas</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-500/10 flex items-center justify-center">
                            <UserX className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{users.filter(u => u.role === "comprador").length}</p>
                            <p className="text-xs text-muted-foreground">Compradores</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Deletion Requests */}
            {deletionRequests.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-600" />
                                <CardTitle className="text-lg text-amber-700 dark:text-amber-400">
                                    Solicitudes de Eliminación Pendientes
                                </CardTitle>
                                <Badge className="bg-amber-100 text-amber-700">{deletionRequests.length}</Badge>
                            </div>
                        </div>
                        <CardDescription className="text-amber-600/70">
                            Usuarios que han solicitado eliminar sus cuentas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {deletionRequests.map((request) => (
                            <div
                                key={request.id}
                                className="flex items-center justify-between p-4 bg-white dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                                        <User className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-amber-800 dark:text-amber-300">
                                            {request.user_name || "Sin nombre"}
                                        </p>
                                        <p className="text-sm text-amber-600/70">{request.user_email}</p>
                                        <p className="text-xs text-amber-500/60 mt-1">
                                            Solicitado: {new Date(request.requested_at).toLocaleDateString("es-DO", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRejectRequest(request.id)}
                                        disabled={processingRequest === request.id}
                                        className="text-gray-600 hover:text-gray-700"
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Rechazar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleApproveRequest(request)}
                                        disabled={processingRequest === request.id}
                                    >
                                        {processingRequest === request.id ? (
                                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                        )}
                                        Aprobar y Eliminar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <CardTitle className="text-lg text-red-700 dark:text-red-400">
                                Confirmar Eliminación de Cuenta
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-white dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                    <User className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-red-800 dark:text-red-300">{deleteTarget.name || "Sin nombre"}</p>
                                    <p className="text-sm text-red-600/70">{deleteTarget.email}</p>
                                    <p className="text-xs text-red-500/60 mt-1">ID: {deleteTarget.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-red-600/80 space-y-1">
                            <p><strong>Esta acción eliminará permanentemente:</strong></p>
                            <ul className="list-disc list-inside text-xs space-y-0.5">
                                <li>Todas las propiedades publicadas por el usuario</li>
                                <li>Todos los proyectos (si es empresa constructora)</li>
                                <li>Todos los mensajes y conversaciones</li>
                                <li>Solicitudes de vendedor y documentos KYC</li>
                                <li>Reseñas, favoritos y suscripciones push</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-red-700 dark:text-red-400">
                                Escribe ELIMINAR para confirmar:
                            </label>
                            <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                placeholder="ELIMINAR"
                                className="border-red-300 dark:border-red-800 focus:ring-red-500"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteUser}
                                disabled={deleteConfirmText !== "ELIMINAR" || deleting}
                                className="flex-1"
                            >
                                {deleting ? "Eliminando..." : "Eliminar Usuario"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Users Table */}
            <Card className="border-none shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Rol
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Actividad
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                                    Contacto
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                                    Registrado
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Acciones
                                </th>

                            </tr>
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Cargando usuarios...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-5 w-5 text-primary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{user.name || "Sin nombre"}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    {user.deletion_scheduled_at && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span className="text-[10px] font-bold text-amber-600 uppercase">Eliminación: {new Date(user.deletion_scheduled_at).toLocaleDateString("es-DO")}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getRoleBadge(user)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {(user.role === "vendedor" || user.role === "agente" || user.role === "empresa_constructora") && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                                                        <span>{stats[user.id]?.properties || 0} propiedades</span>
                                                    </div>
                                                )}
                                                {(user.role === "comprador" || !user.role) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Heart className="h-3.5 w-3.5 text-red-500" />
                                                        <span>{stats[user.id]?.favorites || 0} favoritos</span>
                                                    </div>
                                                )}
                                                {user.role === "admin" && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Shield className="h-3.5 w-3.5 text-purple-500" />
                                                        <span>Acceso Total</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">

                                            <div className="text-sm">
                                                {user.primary_phone && (
                                                    <p className="text-muted-foreground">{user.primary_phone}</p>
                                                )}
                                                {!user.primary_phone && (
                                                    <span className="text-muted-foreground/50">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(user.inserted_at).toLocaleDateString("es-DO", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                onClick={() => setDeleteTarget(user)}
                                                disabled={user.role === "admin"}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                            Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-2">
                                {page + 1} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
