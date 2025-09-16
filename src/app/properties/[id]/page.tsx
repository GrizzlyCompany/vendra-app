import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { PropertyGallery } from "@/components/PropertyGallery";
import { OwnerCard } from "@/components/OwnerCard";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Castle, Ruler, Bath, Bed, Phone, Mail, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

async function getProperty(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id,title,description,price,location,images,type,owner_id,currency,inserted_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as any;
}

export default async function PropertyDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();
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
    <div className="min-h-[calc(100dvh-64px)] bg-background mobile-bottom-safe mobile-horizontal-safe">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
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
          <div className="space-y-4 lg:space-y-6">
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
                  <h2 className="font-serif text-xl lg:text-2xl font-bold text-foreground leading-tight">{toTitleCase(property.title)}</h2>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    <span className="line-clamp-2">{property.location}</span>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl lg:text-2xl font-bold text-foreground">{price}</CardTitle>
                    <CardDescription className="mt-1">Precio de venta</CardDescription>
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
          </div>
        </div>
      </div>
    </div>
  );
}
