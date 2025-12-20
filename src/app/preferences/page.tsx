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
    Fingerprint
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

    useEffect(() => {
        setMounted(true);
        const checkBiometrics = async () => {
            const available = await isBiometricAvailable();
            setIsBiometricSupported(available);
            if (available) {
                const enabled = await shouldShowBiometricLogin();
                setBiometricEnabled(enabled);
            }
        };
        checkBiometrics();
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
                            <span className="text-xs">Versión de la aplicación: 1.0.2 (Build 20241219)</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
