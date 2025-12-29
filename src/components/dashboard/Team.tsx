"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Mail, Shield, User as UserIcon } from "lucide-react";
import { useToastContext } from "@/components/ToastProvider";
import { Team, TeamMember } from "@/types";

export function TeamSection() {
    const t = useTranslations("dashboard.team"); // You might need to add these translations
    const { success: showSuccess, error: showError } = useToastContext();
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        loadTeamData();
    }, []);

    const loadTeamData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            console.log("Fetching team for user:", user.id);
            // 1. Fetch Team owned by user
            const { data: teams, error: teamErr } = await supabase
                .from("teams")
                .select("*")
                .eq("owner_id", user.id)
                .maybeSingle();

            if (teamErr) {
                console.error("Error fetching team:", teamErr);
                throw teamErr;
            }

            let currentTeam = teams;

            // If no team exists for this 'empresa_constructora', create one automatically?
            if (!currentTeam) {
                console.log("No team found, creating new team...");
                // Auto-create
                const { data: newTeam, error: createErr } = await supabase
                    .from("teams")
                    .insert({
                        owner_id: user.id,
                        name: user.user_metadata?.name || "Mi Organización",
                    })
                    .select()
                    .single();

                if (createErr) {
                    console.error("Error creating team:", createErr);
                    throw createErr;
                }
                currentTeam = newTeam;
            }

            setTeam(currentTeam as Team);

            // 2. Fetch Members
            if (currentTeam) {
                const { data: mems, error: memErr } = await supabase
                    .from("team_members")
                    .select(`
            *,
            user:users (
              id, name, email, avatar_url, role
            )
          `)
                    .eq("team_id", currentTeam.id);

                if (memErr) {
                    console.error("Error fetching members:", memErr);
                    throw memErr;
                }
                setMembers(mems as any[] || []);
            }

        } catch (e: any) {
            console.error("Error loading team (Full):", JSON.stringify(e, null, 2));
            showError("Error al cargar el equipo: " + (e.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || !team) return;

        try {
            setInviting(true);

            // MVP Logic: Check if user exists. If yes, add to team_members.
            // If no, show error (For MVP we don't handle inviting non-existant users via email yet)

            const { data: foundUser, error: searchErr } = await supabase
                .from("users")
                .select("id, email")
                .eq("email", inviteEmail)
                .maybeSingle();

            if (searchErr) throw searchErr;

            if (!foundUser) {
                showError("Usuario no encontrado", "El correo debe estar registrado en Vendra.");
                return;
            }

            // Add to team_members
            const { error: addErr } = await supabase
                .from("team_members")
                .insert({
                    team_id: team.id,
                    user_id: foundUser.id,
                    role: 'agent'
                });

            if (addErr) {
                if (addErr.code === '23505') { // Unique violation
                    showError("El usuario ya es miembro del equipo.");
                } else {
                    throw addErr;
                }
                return;
            }

            showSuccess("Miembro añadido exitosamente");
            setInviteEmail("");
            loadTeamData(); // Reload list

        } catch (e: any) {
            showError("Error al invitar", e.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!window.confirm("¿Estás seguro de eliminar a este miembro?")) return;

        try {
            const { error } = await supabase
                .from("team_members")
                .delete()
                .eq("id", memberId);

            if (error) throw error;

            setMembers(prev => prev.filter(m => m.id !== memberId));
            showSuccess("Miembro eliminado");
        } catch (e: any) {
            showError("Error al eliminar", e.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando equipo...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold font-serif text-primary">Gestión de Equipo</h2>
                <p className="text-muted-foreground">Administra los miembros de tu organización.</p>
            </div>

            {/* Invite Card */}
            <Card className="border-emerald-100 bg-emerald-50/30">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-emerald-600" />
                        Invitar Miembro
                    </CardTitle>
                    <CardDescription>
                        Agrega agentes a tu equipo para que puedan gestionar propiedades.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleInvite} className="flex gap-4">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="correo@ejemplo.com"
                                className="pl-9 bg-white"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={inviting || !inviteEmail}>
                            {inviting ? "Enviando..." : "Invitar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Members List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UsersIcon className="w-5 h-5" />
                        Miembros ({members.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {members.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground italic">
                            No hay miembros en el equipo aún.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 border">
                                            {/* Using member.user data if joined, otherwise fallback */}
                                            <div className="bg-primary/10 w-full h-full flex items-center justify-center text-primary font-bold">
                                                {(member.user?.name || "U").charAt(0).toUpperCase()}
                                            </div>
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold text-sm">{member.user?.name || "Usuario Desconocido"}</div>
                                            <div className="text-xs text-muted-foreground">{member.user?.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Badge variant="secondary" className="capitalize">
                                            {member.role === 'admin' ? 'Administrador' : 'Agente'}
                                        </Badge>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            onClick={() => handleRemoveMember(member.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}
