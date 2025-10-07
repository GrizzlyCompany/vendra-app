"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { supabase } from "@/lib/supabase/client";

type SellerApplication = {
  id: string;
  user_id: string;
  status: string;
  role_choice: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  submitted_at: string | null;
  review_notes: string | null;
  reviewer_id: string | null;
  user_name: string;
  user_email: string;
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToastContext();
  const router = useRouter();
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle redirection if user is not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || user.email !== 'admin@vendra.com')) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Fetch seller applications
  useEffect(() => {
    if (user && user.email === 'admin@vendra.com') {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      // Get the auth token for the admin function
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Call the admin function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-applications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      const message = err?.message || 'Unknown error occurred';
      showError("Error al cargar solicitudes", message);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (id: string, status: string) => {
    try {
      // Get the auth token for the admin function
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Call the admin update function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-update-application`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: id,
          status: status
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Update failed');
      }

      showSuccess("Estado actualizado", "La solicitud ha sido actualizada correctamente.");
      fetchApplications(); // Refresh the list
    } catch (err: any) {
      console.error('Error updating status:', err);
      const message = err?.message || 'Unknown error occurred';
      showError("Error al actualizar", message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== 'admin@vendra.com') {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: 'secondary',
      submitted: 'default',
      approved: 'default',
      rejected: 'outline',
      needs_more_info: 'outline'
    };

    const labels: Record<string, string> = {
      draft: 'Borrador',
      submitted: 'Enviada',
      approved: '✅ Aprobada',
      rejected: '❌ Rechazada',
      needs_more_info: 'Más información'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-background font-sans mobile-bottom-safe">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>

          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Vendedor/Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay solicitudes pendientes</p>
                ) : (
                  applications.map((app) => (
                    <Card key={app.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{app.user_name}</h3>
                            <span className="text-sm text-muted-foreground">({app.user_email})</span>
                            {getStatusBadge(app.status)}
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            {app.role_choice === 'agente_inmobiliario' ? 'Agente Inmobiliario' : 'Vendedor Particular'}
                          </div>

                          {app.review_notes && (
                            <div className="text-sm">
                              <strong>Notas del revisor:</strong> {app.review_notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          {app.status === 'submitted' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateApplicationStatus(app.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateApplicationStatus(app.id, 'rejected')}
                              >
                                Rechazar
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/profile/${app.user_id}`)}
                          >
                            Ver Perfil
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
