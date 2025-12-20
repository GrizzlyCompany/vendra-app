"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Moon,
    Sun,
    Bell,
    ShieldCheck,
    ChevronLeft,
    Smartphone,
    Eye,
    Lock,
    Fingerprint,
    Trash2,
    AlertTriangle,
    Clock
} from "lucide-react";
import { usePushNotifications } from "@/features/messaging/hooks/usePushNotifications";
import { PUSH_CONFIG } from "@/features/messaging/config/push";
import {
    isBiometricAvailable,
    shouldShowBiometricLogin,
    enableBiometricLogin,
    disableBiometricLogin
} from "@/lib/capacitor/biometrics";

export default function PreferencesPage() {
    const router = useRouter();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const { permission, subscribe } = usePushNotifications();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Biometric state
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    // Privacy toggles (mock state for now, would be in DB in a real app)
    const [isPublic, setIsPublic] = useState(true);
    const [showEmail, setShowEmail] = useState(false);

    // Delete account state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        const loadInitialData = async () => {
            // Check biometrics
            const available = await isBiometricAvailable();
            setIsBiometricSupported(available);
            if (available) {
                const enabled = await shouldShowBiometricLogin();
                setBiometricEnabled(enabled);
            }

            // Load user profile for deletion status
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data: profile } = await supabase
                    .from("users")
                    .select("deletion_scheduled_at")
                    .eq("id", session.user.id)
                    .maybeSingle();
                if (profile?.deletion_scheduled_at) {
                    setDeletionScheduledAt(profile.deletion_scheduled_at);
                }
            }
        };
        loadInitialData();
    }, []);

    if (!mounted) return null;

    const handlePushToggle = async () => {
        if (permission === 'granted') return;
        setLoading(true);
        try {
            await subscribe(PUSH_CONFIG.vapidPublicKey);
        } catch (e) {
            console.error("Error subscribing:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricToggle = (checked: boolean) => {
        setBiometricEnabled(checked);
        if (checked) {
            enableBiometricLogin();
        } else {
            disableBiometricLogin();
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "ELIMINAR") return;

        setDeleteLoading(true);
        try {
            // Get current user info
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            const userEmail = session?.user?.email;
            const userName = (session?.user?.user_metadata as Record<string, unknown>)?.name as string || null;

            if (!userId) {
                throw new Error("No authenticated user");
            }

            const scheduledAt = new Date();
            scheduledAt.setDate(scheduledAt.getDate() + 30); // 30 days grace period

            // 1. Create deletion request
            const { error: requestError } = await supabase
                .from("deletion_requests")
                .insert({
                    user_id: userId,
                    user_email: userEmail,
                    user_name: userName,
                    reason: "Solicitado por el usuario desde preferencias (Periodo de gracia 30 días)",
                    status: "pending",
                    scheduled_completion_at: scheduledAt.toISOString()
                });

            if (requestError) console.error("Error creating deletion request:", requestError);

            // 2. Update user table with scheduled date
            const { error: userError } = await supabase
                .from("users")
                .update({ deletion_scheduled_at: scheduledAt.toISOString() })
                .eq("id", userId);

            if (userError) throw userError;

            // 3. Sign out
            await supabase.auth.signOut();
            router.replace("/login?message=account-deletion-scheduled");
        } catch (error) {
            console.error("Error scheduling deletion:", error);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleCancelDeletion = async () => {
        setDeleteLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) return;

            // 1. Clear deletion_scheduled_at in users
            await supabase
                .from("users")
                .update({ deletion_scheduled_at: null })
                .eq("id", userId);

            // 2. Update status in deletion_requests
            await supabase
                .from("deletion_requests")
                .update({ status: "rejected", notes: "Cancelado por el usuario" })
                .eq("user_id", userId)
                .eq("status", "pending");

            setDeletionScheduledAt(null);
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error("Error canceling deletion:", error);
        } finally {
            setDeleteLoading(false);
        }
    };

    const isDarkMode = resolvedTheme === "dark";

    return (
        <main className="min-h-screen bg-background px-4 sm:px-6 py-8 sm:py-12 mobile-bottom-safe mobile-top-safe">
            <div className="max-w-2xl mx-auto">
                {/* Header with Back Button */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full h-10 w-10 text-foreground hover:bg-secondary/20 transition-all"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-primary">Preferencias</h1>
                        <p className="text-muted-foreground text-sm">Personaliza tu experiencia en Vendra</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Appearance Section */}
                    <Card className="border-none shadow-xl bg-background/50 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Sun className="h-4 w-4 text-primary" />
                                <CardTitle className="text-lg">Apariencia</CardTitle>
                            </div>
                            <CardDescription>Personaliza visualmente la aplicación</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Modo Oscuro</Label>
                                    <p className="text-xs text-muted-foreground">Cambia entre tema claro y oscuro</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Sun className={`h-4 w-4 ${!isDarkMode ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                    <Switch
                                        checked={isDarkMode}
                                        onCheckedChange={(checked: boolean) => setTheme(checked ? "dark" : "light")}
                                    />
                                    <Moon className={`h-4 w-4 ${isDarkMode ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Section (Biometrics) */}
                    {isBiometricSupported && (
                        <Card className="border-none shadow-xl bg-background/50 backdrop-blur-xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Fingerprint className="h-4 w-4 text-primary" />
                                    <CardTitle className="text-lg">Seguridad</CardTitle>
                                </div>
                                <CardDescription>Protege tu acceso con biometría</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5 flex-1 pr-4">
                                        <Label className="text-base">Inicio de sesión biométrico</Label>
                                        <p className="text-xs text-muted-foreground">Usa tu huella digital o FaceID para entrar rápidamente</p>
                                    </div>
                                    <Switch
                                        checked={biometricEnabled}
                                        onCheckedChange={handleBiometricToggle}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notifications Section */}
                    <Card className="border-none shadow-xl bg-background/50 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Bell className="h-4 w-4 text-primary" />
                                <CardTitle className="text-lg">Notificaciones</CardTitle>
                            </div>
                            <CardDescription>Controla cómo recibes avisos de la app</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-base flex items-center gap-2">
                                        Notificaciones Push
                                        {permission === 'granted' && (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Activo</span>
                                        )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Recibe alertas al instante sobre nuevos mensajes o actividad</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant={permission === 'granted' ? "outline" : "default"}
                                    disabled={permission === 'granted' || loading}
                                    onClick={handlePushToggle}
                                    className="rounded-full px-5"
                                >
                                    {permission === 'granted' ? 'Configurado' : loading ? 'Configurando...' : 'Activar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Privacy Section */}
                    <Card className="border-none shadow-xl bg-background/50 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <CardTitle className="text-lg">Privacidad</CardTitle>
                            </div>
                            <CardDescription>Gestiona quién puede ver tu información</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Perfil Público</Label>
                                    <p className="text-xs text-muted-foreground">Permitir que otros vean tu perfil y propiedades</p>
                                </div>
                                <Switch
                                    checked={isPublic}
                                    onCheckedChange={setIsPublic}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Mostrar Email</Label>
                                    <p className="text-xs text-muted-foreground">Mostrar tu correo en tu perfil público</p>
                                </div>
                                <Switch
                                    checked={showEmail}
                                    onCheckedChange={setShowEmail}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Device & Security Info */}
                    <div className="pt-4 px-2 space-y-4">
                        <div className="flex items-center gap-3 text-muted-foreground/60">
                            <Smartphone className="h-4 w-4" />
                            <span className="text-xs">Versión de la aplicación: 1.0.2 (Build 20251220)</span>
                        </div>
                    </div>

                    {/* Danger Zone - Delete Account */}
                    <Card className="border-red-200 dark:border-red-900/50 shadow-xl bg-red-50/50 dark:bg-red-950/20 backdrop-blur-xl mt-8">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Trash2 className="h-4 w-4 text-red-600" />
                                <CardTitle className="text-lg text-red-700 dark:text-red-400">Zona de Peligro</CardTitle>
                            </div>
                            <CardDescription className="text-red-600/70">Acciones irreversibles para tu cuenta</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {deletionScheduledAt ? (
                                <div className="space-y-4 p-4 bg-amber-100/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900">
                                    <div className="flex items-start gap-3">
                                        <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Eliminación programada</p>
                                            <p className="text-xs text-amber-600/80 mt-1">
                                                Tu cuenta se eliminará permanentemente el <strong>{new Date(deletionScheduledAt).toLocaleDateString("es-DO", { day: '2-digit', month: 'long', year: 'numeric' })}</strong>.
                                                Puedes cancelar este proceso en cualquier momento antes de esa fecha.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelDeletion}
                                        disabled={deleteLoading}
                                        className="w-full rounded-full border-amber-300 text-amber-700 hover:bg-amber-100"
                                    >
                                        {deleteLoading ? "Cancelando..." : "Cancelar eliminación y reactivar cuenta"}
                                    </Button>
                                </div>
                            ) : !showDeleteConfirm ? (
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5 flex-1 pr-4">
                                        <Label className="text-base text-red-700 dark:text-red-400">Eliminar mi cuenta</Label>
                                        <p className="text-xs text-red-600/70">Esta acción programará la eliminación permanente de tu cuenta en 30 días</p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="rounded-full px-5"
                                    >
                                        Eliminar Cuenta
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4 p-4 bg-red-100/50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-red-700 dark:text-red-400">¿Estás seguro?</p>
                                            <p className="text-xs text-red-600/80 mt-1">
                                                Tu cuenta será desactivada inmediatamente y eliminada permanentemente en 30 días.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-red-700 dark:text-red-400">Escribe ELIMINAR para confirmar:</Label>
                                        <input
                                            type="text"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                            placeholder="ELIMINAR"
                                            className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-800 rounded-lg bg-white dark:bg-red-950/50 text-red-700 dark:text-red-300 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                                            className="flex-1 rounded-full"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleDeleteAccount}
                                            disabled={deleteConfirmText !== "ELIMINAR" || deleteLoading}
                                            className="flex-1 rounded-full"
                                        >
                                            {deleteLoading ? "Programando..." : "Confirmar Eliminación"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
