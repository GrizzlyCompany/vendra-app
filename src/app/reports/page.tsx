"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { supabase } from "@/lib/supabase/client";
import {
  Send,
  Type,
  FileText,
  Tag,
  MessageSquare,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  Zap,
  Lightbulb
} from "lucide-react";
import Image from "next/image";

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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Cargando...</p>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (val: string) => {
    setFormData(prev => ({ ...prev, category: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      showSuccess("Reporte enviado", "Tu caso ha sido creado exitosamente.");

      setFormData({
        title: "",
        description: "",
        category: "general",
      });

      // Redirect to messages to see the new case
      setTimeout(() => router.push('/messages'), 1500);

    } catch (err: any) {
      console.error("Error sending report:", err);
      showError("Error al enviar", "Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: "general", label: "General" },
    { value: "bug", label: "Error Técnico" },
    { value: "feature", label: "Solicitud de Funcionalidad" },
    { value: "performance", label: "Rendimiento" },
    { value: "security", label: "Seguridad" },
  ];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'bug': return AlertCircle;
      case 'feature': return Lightbulb;
      case 'performance': return Zap;
      case 'security': return ShieldAlert;
      default: return MessageSquare;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 relative overflow-hidden flex flex-col md:flex-row">

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[100px] rounded-full translate-y-1/3 pointer-events-none" />

      {/* LEFT SIDE: Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 backdrop-blur-md border border-primary/10"
            >
              <Sparkles className="w-6 h-6 text-primary" />
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Crear Reporte
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              ¿Encontraste un problema o tienes una sugerencia?
              Tu reporte creará un nuevo caso de soporte.
            </p>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="group relative"
          >
            {/* Glassmorphism Card */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 rounded-3xl blur-[1px]" />
            <div className="relative bg-background/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/5 rounded-3xl p-6 md:p-8">

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                    Título
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-3 top-3 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                      <Type className="w-5 h-5" />
                    </div>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Ej: Error al subir imagen..."
                      className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Category Select */}
                <div className="space-y-2">
                  <CustomSelect
                    icon={Tag}
                    label="Categoría"
                    value={formData.category}
                    onChange={handleCategoryChange}
                    options={categoryOptions}
                  />
                </div>

                {/* Description Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                    Descripción
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-3 top-3 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange} // Correct type now
                      placeholder="Describe los detalles..."
                      rows={5}
                      required
                      className="w-full pl-10 pt-3 pr-3 text-sm rounded-xl border border-border/50 bg-white/50 dark:bg-black/20 focus:bg-background focus:ring-2 focus:ring-ring focus:border-input transition-all duration-300 resize-none outline-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 text-base font-medium"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Enviar Reporte</span>
                      <Send className="w-4 h-4" />
                    </div>
                  )}
                </Button>

              </form>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT SIDE: Image */}
      <div className="hidden md:block w-1/2 relative">
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <Image
            src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/report_image.png"
            alt="Report Illustration"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay gradient for text readability if needed, or just aesthetic */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/10 to-background" />
        </motion.div>
      </div>

    </div>
  );
}