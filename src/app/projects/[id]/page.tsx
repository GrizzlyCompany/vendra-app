'use client';

import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, use, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  CheckCircle,
  Calendar,
  Download,
  Phone,
  Mail,
  Globe,
  Building,
  ChevronLeft,
  ChevronRight,
  Share2,
  Maximize2,
  ArrowRight
} from "lucide-react";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ShareMenu } from "@/components/ShareMenu";
import { motion, AnimatePresence } from "framer-motion";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

interface Project {
  id: string;
  project_name: string;
  description_title: string;
  short_description: string;
  category: string;
  address: string;
  city_province: string;
  zone_sector: string;
  project_status: string;
  delivery_date: string;
  units_count: number;
  floors: number;
  land_size: number;
  built_areas: number;
  unit_types: string;
  size_range: string;
  price_range: string;
  quantity_per_type: string;
  amenities: string[];
  images: string[];
  promo_video: string;
  plans: string[];
  unit_price_range: string;
  payment_methods: string;
  partner_bank: string;
  owner_id: string;
  created_at: string;
}

interface Owner {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
}

// Add this function to track project views
const trackProjectView = async (projectId: string) => {
  try {
    const { data: session } = await supabase.auth.getSession();
    const viewerId = session.session?.user?.id || null;
    const userAgent = navigator.userAgent;
    const referrer = document.referrer || null;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { error: viewError } = await supabase
      .from("project_views")
      .insert({
        project_id: projectId,
        viewer_id: viewerId,
        user_agent: userAgent,
        referrer: referrer,
        session_id: sessionId,
      });

    if (!viewError) {
      await supabase.rpc('increment_project_views', { project_id: projectId });
    }
  } catch (error) {
    console.error('Error in trackProjectView:', error);
  }
};

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [project, setProject] = useState<Project | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const viewTrackedRef = useRef(false);
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const trackProjectViewRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          setError(error?.message || "Project not found");
          return;
        }

        setProject(data as Project);

        if (!viewTracked && !viewTrackedRef.current) {
          viewTrackedRef.current = true;
          if (!trackProjectViewRef.current) {
            trackProjectViewRef.current = trackProjectView(id);
          }
          await trackProjectViewRef.current;
          setViewTracked(true);
        }

        try {
          const { data: pp } = await supabase
            .from("public_profiles")
            .select("id,name,email,avatar_url,role")
            .eq("id", data.owner_id)
            .maybeSingle();
          setOwner(pp ?? null);
        } catch (err) {
          console.error("Error fetching owner profile:", err);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, viewTracked]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background pb-safe-bottom">
        <Skeleton className="h-[60vh] w-full bg-muted/50" />
        <div className="container max-w-7xl mx-auto px-4 py-12 space-y-8">
          <Skeleton className="h-12 w-2/3 max-w-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-4">
              <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive font-serif text-xl">Error al cargar el proyecto</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  const images = project.images ?? [];
  const currentImage = images[activeImageIndex] || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

  return (
    <main className="min-h-screen bg-background pb-20 mobile-bottom-safe">

      {/* Mobile Sticky Header */}
      <DetailBackButton className="lg:hidden sticky top-0 bg-background/0 z-40 pt-safe-top transition-all duration-300">
        <div className="flex items-center justify-between px-4 py-3">
          <Button asChild variant="secondary" size="icon" className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border-none shadow-lg w-10 h-10">
            <Link href="/projects">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <Button variant="secondary" size="icon" onClick={() => setShowShareMenu(true)} className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border-none shadow-lg w-10 h-10">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </DetailBackButton>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed top-4 left-6 z-50">
        <Button asChild variant="outline" className="rounded-full bg-white/80 hover:bg-white backdrop-blur-md border shadow-sm px-6 gap-2">
          <Link href="/projects">
            <ChevronLeft className="w-4 h-4" /> Volver a Proyectos
          </Link>
        </Button>
      </nav>

      {/* Hero Section - Immersive Gallery */}
      <section className="relative h-[65vh] md:h-[75vh] w-full overflow-hidden bg-black/5 group">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentImage})` }}
          />
        </AnimatePresence>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30 pointer-events-none" />

        {/* Gallery Controls */}
        {images.length > 1 && (
          <div className="absolute bottom-6 right-6 flex gap-2 z-20">
            <Button
              size="icon"
              variant="outline"
              className="rounded-full bg-black/20 text-white border-white/20 hover:bg-white hover:text-black backdrop-blur-md h-12 w-12 transition-all"
              onClick={() => setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full bg-black/20 text-white border-white/20 hover:bg-white hover:text-black backdrop-blur-md h-12 w-12 transition-all"
              onClick={() => setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 p-6 md:p-12 md:pb-16 w-full max-w-5xl">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.project_status && (
                <Badge className="bg-primary/90 hover:bg-primary text-white border-none px-3 py-1 text-xs uppercase tracking-wider shadow-lg backdrop-blur-md">
                  {project.project_status}
                </Badge>
              )}
              {project.category && (
                <Badge variant="outline" className="text-white border-white/40 bg-black/10 backdrop-blur-md px-3 py-1 text-xs uppercase tracking-wider">
                  {project.category}
                </Badge>
              )}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl font-bold text-white text-shadow-lg leading-tight mb-2">
              {project.project_name}
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-light flex items-center gap-2 max-w-2xl text-shadow-sm">
              <MapPin className="w-5 h-5 text-primary-foreground" />
              {project.city_province || project.address}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="container max-w-[1600px] mx-auto px-4 md:px-8 -mt-8 md:-mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

          {/* Detailed Content (Left Col) */}
          <div className="lg:col-span-8 space-y-12 pb-12">

            {/* Intro Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <div className="text-center p-2 border-r border-border/50 last:border-0">
                <span className="block text-2xl font-bold text-primary">{project.units_count || "—"}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Unidades</span>
              </div>
              <div className="text-center p-2 border-r border-border/50 last:border-0">
                <span className="block text-2xl font-bold text-primary">{project.floors || "—"}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Niveles</span>
              </div>
              <div className="text-center p-2 border-r border-border/50 last:border-0">
                <span className="block text-2xl font-bold text-primary">{project.land_size ? `${project.land_size}m²` : "—"}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Terreno</span>
              </div>
              <div className="text-center p-2">
                <span className="block text-2xl font-bold text-primary">{project.built_areas ? `${project.built_areas}m²` : "—"}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Construcción</span>
              </div>
            </div>

            {/* Editorial Description */}
            <section className="prose prose-lg dark:prose-invert max-w-none">
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4">{project.description_title || "Sobre el Proyecto"}</h2>
              <p className="text-muted-foreground leading-relaxed text-lg font-light">
                {project.short_description || "Descubre un nuevo estándar de vida en este exclusivo desarrollo inmobiliario, diseñado pensando en cada detalle para ofrecer el máximo confort y estilo de vida."}
              </p>
            </section>

            {/* Amenities Grid */}
            <section>
              <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Amenidades Exclusivas
              </h3>
              {project.amenities && project.amenities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.amenities.map((amenity, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/5 border border-transparent hover:border-primary/20 transition-all">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="text-foreground font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Información de amenidades pendiente.</p>
              )}
            </section>

            {/* Plans preview */}
            {project.plans && project.plans.length > 0 && (
              <section>
                <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Planos Disponibles
                </h3>
                <div className="rounded-2xl overflow-hidden border border-border relative group cursor-pointer" onClick={() => window.open(project.plans?.[0], '_blank')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.plans[0]} alt="Plano" className="w-full h-64 object-contain bg-white/50" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" className="gap-2">
                      <Download className="w-4 h-4" /> Ver Plano Completo
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* Location Map Placeholder */}
            {project.address && (
              <section>
                <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Ubicación Prestigiosa
                </h3>
                <div className="h-64 w-full bg-muted/50 rounded-3xl border flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Santo+Domingo&zoom=13&size=600x300&sensor=false')] bg-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500" />
                  <div className="relative z-10 text-center bg-background/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
                    <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-medium">{project.address}</p>
                    <p className="text-sm text-muted-foreground">{project.city_province}</p>
                  </div>
                </div>
              </section>
            )}

          </div>

          {/* Sticky Sidebar (Right Col) */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-24 space-y-6">

              {/* Price & Action Card */}
              <div className="bg-background/80 dark:bg-black/40 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[2rem] p-6 md:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="relative z-10">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Inversión desde</p>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-6">
                    {project.unit_price_range ? `$${project.unit_price_range}` : "Consultar Precio"}
                  </h2>

                  <div className="space-y-3">
                    <Button className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                      <Calendar className="w-5 h-5" /> Agendar Visita Privada
                    </Button>
                    <Button variant="outline" className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5 text-primary gap-2"
                      onClick={() => project.plans?.[0] && window.open(project.plans[0], '_blank')}
                      disabled={!project.plans?.length}
                    >
                      <Download className="w-5 h-5" /> Descargar Brochure
                    </Button>
                  </div>

                  <hr className="my-6 border-border/50" />

                  {/* Developer Info Mini */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {owner?.name?.charAt(0) || "C"}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase">Desarrollado por</p>
                      <p className="font-medium truncate">{owner?.name || "Empresa Constructora"}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary/10 text-primary">
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>

                </div>
              </div>

              {/* Contact Quick Links */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-white/20 bg-white/40 hover:bg-white/60 shadow-sm h-full">
                  <Phone className="w-6 h-6 text-primary" />
                  <span className="text-xs font-medium">Llamar</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-white/20 bg-white/40 hover:bg-white/60 shadow-sm h-full">
                  <Mail className="w-6 h-6 text-primary" />
                  <span className="text-xs font-medium">Email</span>
                </Button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {showShareMenu && project && (
        <ShareMenu project={project} isOpen={showShareMenu} onClose={() => setShowShareMenu(false)} />
      )}
    </main>
  );
}