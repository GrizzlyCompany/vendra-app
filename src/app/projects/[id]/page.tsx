'use client';

import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, use, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  Share2
} from "lucide-react";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { ShareMenu } from "@/components/ShareMenu";

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
    // Get current user session
    const { data: session } = await supabase.auth.getSession();
    const viewerId = session.session?.user?.id || null;

    // Get client information
    const userAgent = navigator.userAgent;
    const referrer = document.referrer || null;

    // Generate session ID (simple implementation)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert view record
    const { error: viewError } = await supabase
      .from("project_views")
      .insert({
        project_id: projectId,
        viewer_id: viewerId,
        user_agent: userAgent,
        referrer: referrer,
        session_id: sessionId,
      });

    if (viewError) {
      console.error('Error tracking project view:', viewError);
    } else {
      // Increment view count using the database function
      const { error: incrementError } = await supabase.rpc('increment_project_views', {
        project_id: projectId
      });

      if (incrementError) {
        console.error('Error incrementing project view count:', incrementError);
      }
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
  const [activeTab, setActiveTab] = useState('descripcion');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const viewTrackedRef = useRef(false);
  const router = useRouter();
  const descriptionRef = useRef<HTMLDivElement>(null);
  const specificationsRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();
  // Add a ref to ensure the function is only called once
  const trackProjectViewRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        
        // Fetch project data
        const { data, error } = await supabase
          .from("projects")
          .select("id,project_name,description_title,short_description,category,address,city_province,zone_sector,project_status,delivery_date,units_count,floors,land_size,built_areas,unit_types,size_range,price_range,quantity_per_type,amenities,images,promo_video,plans,unit_price_range,payment_methods,partner_bank,owner_id,created_at")
          .eq("id", id)
          .single();
          
        if (error || !data) {
          setError(error?.message || "Project not found");
          return;
        }
        
        setProject(data as Project);
        
        // Track project view only once, using multiple safeguards
        if (!viewTracked && !viewTrackedRef.current) {
          viewTrackedRef.current = true;
          // Use the ref to ensure the function is only called once even if there are rapid re-renders
          if (!trackProjectViewRef.current) {
            trackProjectViewRef.current = trackProjectView(id);
          }
          await trackProjectViewRef.current;
          setViewTracked(true);
        }
        
        // Load constructor public profile
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

  const scrollToSection = (section: string) => {
    setActiveTab(section);
    let ref;
    switch (section) {
      case 'descripcion':
        ref = descriptionRef;
        break;
      case 'especificaciones':
        ref = specificationsRef;
        break;
      case 'planos':
        ref = plansRef;
        break;
      case 'ubicacion':
        ref = locationRef;
        break;
      default:
        return;
    }
    
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleShare = () => {
    setShowShareMenu(true);
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="aspect-video w-full" />
            </div>
            <div className="md:col-span-1 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe">
        <div className="container mx-auto max-w-6xl">
          <Card className="rounded-2xl border shadow-md">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-red-500">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{error}</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!project) {
    notFound();
    return null;
  }

  const images: string[] = project.images ?? [];
  const title: string = project.project_name;
  const location: string = project.city_province || project.address || "";
  
  // Format price range with commas
  const formatPrice = (price: string | null): string => {
    if (!price) return "Consultar";
    
    // Extract numbers from price string and format with commas
    const numberMatch = price.match(/[\d,]+/);
    if (numberMatch) {
      const numberString = numberMatch[0].replace(/,/g, '');
      const number = parseInt(numberString, 10);
      if (!isNaN(number)) {
        return price.replace(numberMatch[0], number.toLocaleString('en-US'));
      }
    }
    return price;
  };
  
  const priceRange: string | null = project.unit_price_range ?? project.price_range ?? null;
  const formattedPriceRange = formatPrice(priceRange);

  // Image gallery component
  const ImageGallery = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const nextImage = () => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    };
    
    const prevImage = () => {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };
    
    if (images.length === 0) {
      return (
        <div className="bg-muted rounded-lg h-[300px] sm:h-[500px] flex items-center justify-center">
          <span className="text-muted-foreground">No images available</span>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 sm:mb-12 h-[300px] sm:h-[500px]">
        {/* Main image */}
        <div className="col-span-2 row-span-2 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={images[currentIndex]} 
            alt={"Main view of " + title} 
            className="w-full h-full object-cover rounded-lg shadow-lg"
          />
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background rounded-full p-1.5 sm:p-2 shadow-md"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6 text-foreground" />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background rounded-full p-1.5 sm:p-2 shadow-md"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6 text-foreground" />
              </button>
            </>
          )}
        </div>
        
        {/* Thumbnails - hidden on mobile, shown on sm and up */}
        <div className="hidden sm:grid sm:col-span-2 sm:grid-cols-2 sm:gap-2">
          {images.slice(1, 5).map((img, index) => (
            <div key={index} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={img} 
                alt={"View " + (index + 2) + " of " + title} 
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-4 sm:py-6 mobile-bottom-safe">
      {/* Mobile Header - visible only on mobile/tablet */}
      <DetailBackButton className="lg:hidden mb-4">
        <div className="flex items-center justify-between w-full">
          {/* Back Button */}
          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 border border-border/30 hover:border-border/50 transition-all duration-200"
          >
            <Link href="/projects">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
          
          {/* Center Title */}
          <h1 className="text-base font-medium text-foreground truncate mx-2">
            Proyecto
          </h1>
          
          {/* Share Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleShare}
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 border border-border/30 hover:border-border/50 transition-all duration-200"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </DetailBackButton>
      
      {/* Desktop Back Button - visible only on desktop */}
      <DetailBackButton className="hidden lg:block mb-4">
        <Button 
          asChild 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 border border-border/30 hover:border-border/50 transition-all duration-200"
        >
          <Link href="/projects">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
      </DetailBackButton>

      <div className="container mx-auto max-w-6xl">
        {/* Project header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 flex items-center">
            <MapPin className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {location}
          </p>
        </div>

        {/* Image gallery */}
        <div className="relative z-0">
          <ImageGallery />
        </div>

        {/* Add more spacing to ensure tabs are visible and not covered by gallery */}
        <div className="pt-6"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Tabs navigation - improved for mobile */}
            <div className="border-b border-border mb-4 sm:mb-6 mt-3 sm:mt-4 overflow-x-auto">
              <nav aria-label="Tabs" className="flex space-x-3 sm:space-x-6 min-w-max">
                <button
                  onClick={() => scrollToSection('descripcion')}
                  className={"whitespace-nowrap py-1.5 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm " + (activeTab === 'descripcion' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
                >
                  Descripción
                </button>
                <button
                  onClick={() => scrollToSection('especificaciones')}
                  className={"whitespace-nowrap py-1.5 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm " + (activeTab === 'especificaciones' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
                >
                  Especificaciones
                </button>
                <button
                  onClick={() => scrollToSection('planos')}
                  className={"whitespace-nowrap py-1.5 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm " + (activeTab === 'planos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
                >
                  Planos
                </button>
                <button
                  onClick={() => scrollToSection('ubicacion')}
                  className={"whitespace-nowrap py-1.5 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm " + (activeTab === 'ubicacion' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
                >
                  Ubicación
                </button>
              </nav>
            </div>

            {/* Description section */}
            <div ref={descriptionRef} className="space-y-4 sm:space-y-6" id="descripcion">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{project.description_title || "Descripción del Proyecto"}</h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {project.short_description || "Sin descripción."}
              </p>
            </div>

            {/* Specifications section */}
            <div ref={specificationsRef} className="space-y-4 sm:space-y-6 mt-6 sm:mt-8" id="especificaciones">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Especificaciones del Proyecto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {project.amenities && project.amenities.length > 0 ? (
                  project.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-start space-x-2 sm:space-x-3">
                      <CheckCircle className="text-primary h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-sm sm:text-base">{amenity}</h3>
                        <p className="text-xs text-muted-foreground">Característica premium del proyecto</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No hay especificaciones disponibles.</p>
                )}
              </div>
            </div>

            {/* Plans section */}
            <div ref={plansRef} className="space-y-4 sm:space-y-6 mt-6 sm:mt-8" id="planos">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Planos Interactivos</h2>
              <div className="relative w-full h-48 sm:h-64 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {project.plans && project.plans.length > 0 ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={project.plans[0]} 
                      alt="Plano del proyecto" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <Button 
                        className="bg-primary text-primary-foreground px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-medium text-sm sm:text-base flex items-center space-x-1 hover:bg-primary/90"
                        onClick={() => window.open(project.plans[0], '_blank')}
                      >
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Explorar plano interactivo</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">No hay planos disponibles.</div>
                )}
              </div>
            </div>

            {/* Location section */}
            <div ref={locationRef} className="space-y-4 sm:space-y-6 mt-6 sm:mt-8" id="ubicacion">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Ubicación del Proyecto</h2>
              {/* Full location details */}
              <div className="space-y-2">
                {project.address && (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Dirección:</span> {project.address}
                  </p>
                )}
                {project.zone_sector && (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Sector/Zona:</span> {project.zone_sector}
                  </p>
                )}
                {project.city_province && (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Ciudad/Provincia:</span> {project.city_province}
                  </p>
                )}
              </div>
              <div className="w-full h-48 sm:h-64 bg-muted rounded-lg overflow-hidden">
                {/* Map placeholder - in a real app, you would integrate with Google Maps or similar */}
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-1 sm:mb-2" />
                    <p className="text-muted-foreground text-xs sm:text-sm">Mapa de ubicación</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.address || project.zone_sector || project.city_province || "Ubicación no especificada"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - adjusted for mobile */}
          <div className="lg:col-span-1">
            <div className="space-y-4 sm:space-y-6 z-10 relative">
              {/* Pricing card */}
              <Card className="p-4 sm:p-6 rounded-lg shadow-md border">
                <div className="mb-3 sm:mb-4">
                  <p className="text-muted-foreground text-xs sm:text-sm">Precios desde</p>
                  <p className="text-lg sm:text-2xl font-bold text-primary">{formattedPriceRange}</p>
                  <span className="text-xs bg-primary/20 text-primary font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full mt-1.5 inline-block">
                    En Venta
                  </span>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <Button className="w-full bg-primary text-primary-foreground py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base flex items-center justify-center space-x-1.5 hover:bg-primary/90">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Programar Visita</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-primary text-primary py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base flex items-center justify-center space-x-1.5 hover:bg-primary/10"
                    onClick={() => project.plans && project.plans.length > 0 && window.open(project.plans[0], '_blank')}
                    disabled={!project.plans || project.plans.length === 0}
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Descargar Folleto</span>
                  </Button>
                </div>
              </Card>

              {/* Developer card */}
              <Card className="p-4 sm:p-6 rounded-lg shadow-md border">
                <h3 className="text-base sm:text-lg font-bold mb-3">Desarrollado por</h3>
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-full flex items-center justify-center">
                    <Building className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-foreground">
                      {owner?.name || "Constructora"}
                    </p>
                    {owner?.role === 'empresa_constructora' ? (
                      currentUser && owner.id === currentUser.id ? (
                        <Link href="/dashboard" className="text-primary hover:underline text-xs sm:text-sm">
                          Ver mi perfil de empresa
                        </Link>
                      ) : (
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Empresa constructora
                        </span>
                      )
                    ) : (
                      <Link href={owner ? `/profile/${owner.id}` : '#'} className="text-primary hover:underline text-xs sm:text-sm">
                        Ver perfil de la empresa
                      </Link>
                    )}
                  </div>
                </div>
                <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                  <p className="flex items-center text-muted-foreground text-xs sm:text-sm">
                    <Phone className="mr-1.5 sm:mr-2 text-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    (809) 555-1234
                  </p>
                  <p className="flex items-center text-muted-foreground text-xs sm:text-sm">
                    <Mail className="mr-1.5 sm:mr-2 text-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {owner?.email || "info@constructora.com"}
                  </p>
                  <p className="flex items-center text-muted-foreground text-xs sm:text-sm">
                    <Globe className="mr-1.5 sm:mr-2 text-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    www.constructora.com
                  </p>
                </div>
              </Card>

              {/* Financial information card */}
              <Card className="p-4 sm:p-6 rounded-lg shadow-md border">
                <h3 className="text-base sm:text-lg font-bold mb-3">Información Financiera</h3>
                <div className="space-y-3 sm:space-y-4">
                  {project.payment_methods ? (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Formas de Pago</p>
                      <p className="text-sm sm:text-base text-foreground">{project.payment_methods}</p>
                    </div>
                  ) : null}
                  {project.partner_bank ? (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Banco Aliado</p>
                      <p className="text-sm sm:text-base text-foreground">{project.partner_bank}</p>
                    </div>
                  ) : null}
                  {!project.payment_methods && !project.partner_bank && (
                    <p className="text-sm text-muted-foreground">No hay información financiera disponible.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Menu */}
      {project && (
        <ShareMenu 
          project={project} 
          isOpen={showShareMenu} 
          onClose={() => setShowShareMenu(false)} 
        />
      )}
    </main>
  );
}