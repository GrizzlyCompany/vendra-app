"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { supabase } from "@/lib/supabase/client";

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToastContext();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
  });
  const [loading, setLoading] = useState(false);

  // Handle redirection if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // If no user, component will redirect via useEffect
  if (!user) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get the Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Call the send-report function directly
      const response = await fetch('https://vvuvuibcmvqxtvdadwne.supabase.co/functions/v1/send-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          userEmail: user.email,
          userName: user.user_metadata?.name || user.email,
          userId: user.id
        })
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || JSON.stringify(errorData);
          // If we have more details, include them
          if (errorData.details) {
            errorDetails += ` (Details: ${errorData.details})`;
          }
          if (errorData.stack) {
            errorDetails += ` (Stack: ${errorData.stack})`;
          }
        } catch (parseError) {
          errorDetails = `HTTP error! status: ${response.status}`;
        }
        throw new Error(`Server error: ${errorDetails}`);
      }

      const data = await response.json();
      console.log('Report sent successfully:', data);

      // Show success message
      showSuccess("Reporte enviado correctamente", data.message || "Gracias por tu reporte. Lo revisaremos pronto y te responderemos a través del sistema de mensajes.");

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "general",
      });
    } catch (err: any) {
      console.error("Error sending report:", err);
      // Show a more user-friendly error message
      showError(
        "Error al enviar el reporte",
        "Por favor intenta nuevamente más tarde. Si el problema persiste, contacta al administrador del sistema."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-background font-sans mobile-bottom-safe mobile-horizontal-safe">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Reportes</h1>

          <div className="bg-card rounded-lg border p-6 mb-6">
            <p className="text-muted-foreground text-sm">
              Tu reporte será enviado directamente al administrador del sistema a través del sistema de mensajes.
              Podrás ver la respuesta del administrador en la sección de mensajes de tu cuenta.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Título del reporte
                </label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Describe brevemente el reporte"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  Categoría
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="general">General</option>
                  <option value="bug">Error técnico</option>
                  <option value="feature">Solicitud de funcionalidad</option>
                  <option value="performance">Problema de rendimiento</option>
                  <option value="security">Problema de seguridad</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Descripción detallada
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Proporciona todos los detalles relevantes sobre el reporte..."
                  rows={6}
                  required
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Reporte"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}