"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { PropertyGallery } from "@/components/PropertyGallery";
import { OwnerCard } from "@/components/OwnerCard";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Castle, Ruler, Bath, Bed, Phone, Mail, MessageSquare, Heart, ArrowLeft, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import type { Property } from "@/types";
import { DetailPageTransition, DetailSection, DetailHero, DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { useToastContext } from "@/components/ToastProvider";
import { ShareMenu } from "@/components/ShareMenu";

export default function PropertyDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);
  const { success: showSuccess, error: showError, info: showInfo } = useToastContext();
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const { id } = resolvedParams;
        setPropertyId(id);

        const { data, error } = await supabase
          .from("properties")
          .select("id,title,description,price,location,address,images,type,owner_id,currency,inserted_at")
          .eq("id", id)
          .single();

        if (error || !data) {
          notFound();
          return;
        }

        setProperty(data as Property);

        // Track property view
        await trackPropertyView(id);
      } catch (error) {
        console.error('Error loading property:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [resolvedParams]);

  const trackPropertyView = async (propertyId: string) => {
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
        .from("property_views")
        .insert({
          property_id: propertyId,
          viewer_id: viewerId,
          user_agent: userAgent,
          referrer: referrer,
          session_id: sessionId,
        });

      if (viewError) {
        console.error('Error tracking view:', viewError);
      } else {
        // Increment view count using the database function
        const { error: incrementError } = await supabase.rpc('increment_property_views', {
          property_id: propertyId
        });

        if (incrementError) {
          console.error('Error incrementing view count:', incrementError);
        }
      }
    } catch (error) {
      console.error('Error in trackPropertyView:', error);
    }
  };

  const handleFavoriteClick = async () => {
    if (!propertyId || isToggling) return;

    // Check if user is authenticated
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      router.push('/login');
      return;
    }

    setIsToggling(true);
    try {
      await toggleFavorite(propertyId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleShare = () => {
    setShowShareMenu(true);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-background mobile-bottom-safe mobile-horizontal-safe flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!property) {
    notFound();
    return null;
  }

  const images: string[] = property.images ?? [];
  const currencyCode: string = property.currency ?? "USD";
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(property.price);

  // Function to convert string to title case
  const toTitleCase = (str: string): string => {
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };
  
  // Owner info now fetched client-side in OwnerCard to avoid RLS/SSR issues
  
  // Características principales (mock si no existen campos reales)
  const features = [
    { icon: <Bed className="w-6 h-6" />, label: '3 Habitaciones' },
    { icon: <Bath className="w-6 h-6" />, label: '2 Baños' },
    { icon: <Ruler className="w-6 h-6" />, label: '120 m²' },
    { icon: (property.type === 'Villa' ? <Castle className="w-6 h-6" /> : <Home className="w-6 h-6" />), label: property.type ?? 'Tipo' },
  ];

  return (
    <DetailPageTransition className="min-h-[calc(100dvh-64px)] bg-background mobile-bottom-safe mobile-horizontal-safe">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        
        {/* Mobile Header - visible only on mobile/tablet */}
        <DetailBackButton className="lg:hidden mb-6">
          <div className="flex items-center justify-between w-full">
            {/* Back Button */}
            <Button 
              asChild 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-10 h-10 border border-border/30 hover:border-border/50 transition-all duration-200"
            >
              <Link href="/main">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            
            {/* Center Title */}
            <h1 className="text-lg font-medium text-foreground truncate mx-4">
              Propiedad
            </h1>
            
            {/* Share Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleShare}
              className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-10 h-10 border border-border/30 hover:border-border/50 transition-all duration-200"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </DetailBackButton>
        
        {/* Desktop Back Button - visible only on desktop */}
        <DetailBackButton className="hidden lg:block mb-6">
          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-10 h-10 border border-border/30 hover:border-border/50 transition-all duration-200"
          >
            <Link href="/main">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </DetailBackButton>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Image Gallery */}
            <div className="rounded-xl overflow-hidden shadow-lg">
              <PropertyGallery images={images} />
            </div>

            {/* Property Details - matches provided picture */}
            <Card className="border border-border rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-xl lg:text-2xl text-foreground/90">Detalles de la Propiedad</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Top: 4 feature cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
                  {features.map((feature, index) => (
                    <Card key={index} className="border-0 bg-card/70 rounded-xl shadow-sm">
                      <CardContent className="py-4 md:py-6 lg:py-8 flex flex-col items-center justify-center">
                        <div className="text-primary mb-2 md:mb-3">
                          {feature.icon}
                        </div>
                        <p className="text-xs sm:text-sm md:text-base font-medium text-primary/90 text-center leading-tight">
                          {feature.label}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-primary/60 mb-6" />

                {/* Bottom: Description and Characteristics */}
                <div className="grid grid-cols-1 gap-6 lg:gap-8">
                  <div>
                    <h3 className="font-serif text-lg lg:text-xl text-foreground/90 mb-3">Descripción</h3>
                    <p className="text-sm md:text-base leading-7 text-foreground/80 whitespace-pre-wrap">
                      {property.description || "No hay descripción disponible para esta propiedad."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg lg:text-xl text-foreground/90 mb-3">Características</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Piscina",
                        "Garaje",
                        "Cine en casa",
                        "Vista a la ciudad",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-card/80 text-primary px-3 py-1.5 text-sm shadow-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <DetailSection delay={0.2} className="space-y-4 lg:space-y-6">
            {/* Price Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                {property.type && (
                  <div className="mb-2">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 text-xs font-medium">
                      {property.type}
                    </Badge>
                  </div>
                )}
                <div className="space-y-2">
                  <h2 className="font-serif text-xl lg:text-2xl font-bold text-green-900 leading-tight">{toTitleCase(property.title)}</h2>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    <span className="line-clamp-2">{property.address || property.location}</span>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl lg:text-2xl font-bold text-foreground">{price}</CardTitle>
                    </div>
                    <button 
                      onClick={handleFavoriteClick}
                      disabled={isToggling}
                      className="ml-3 p-2 rounded-full hover:bg-green-50 transition-colors group disabled:opacity-50" 
                      aria-label={isFavorite(propertyId || '') ? "Quitar de favoritos" : "Agregar a favoritos"}
                    >
                      <Heart 
                        className={`w-6 h-6 transition-all ${
                          isFavorite(propertyId || '') 
                            ? 'text-green-600 fill-green-600' 
                            : 'text-green-600 hover:text-green-700 group-hover:fill-green-600'
                        }`} 
                      />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground text-center">
                  <p>Publicado el {new Date(property.inserted_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </CardContent>
            </Card>

            {/* Agent Card */}
            <Card className="border-0 shadow-sm">
              <CardContent>
                <OwnerCard ownerId={property.owner_id} />
              </CardContent>
            </Card>
          </DetailSection>
        </div>
      </div>
      
      {/* Share Menu */}
      {property && (
        <ShareMenu 
          property={property} 
          isOpen={showShareMenu} 
          onClose={() => setShowShareMenu(false)} 
        />
      )}
    </DetailPageTransition>
  );
}
