"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Trash2, MapPin, Edit } from "lucide-react";
import { Property } from "@/types";
import { memo, useCallback } from "react";
import { usePerformanceMonitor } from "@/hooks/usePerformance";
import { safeString, safeNumber } from "@/lib/safe";

// Local optimized image hook for this component
function useOptimizedImage(src: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
}) {
  if (!src) return src;
  
  // For Unsplash images, add optimization parameters
  if (src.includes('unsplash.com')) {
    const url = new URL(src);
    if (options?.width) url.searchParams.set('w', options.width.toString());
    if (options?.height) url.searchParams.set('h', options.height.toString());
    if (options?.quality) url.searchParams.set('q', options.quality.toString());
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    return url.toString();
  }
  
  return src;
}

// Enhanced prop types for better type safety and clarity
type PropertyCardState = 'idle' | 'deleting' | 'confirm-pending';

interface PropertyCardProps {
  property: Property;
  showEdit?: boolean;
  onDelete?: (property: Property) => void;
  state?: PropertyCardState;
  className?: string;
}

function formatPriceUSD(value: number): string {
  if (typeof value !== 'number' || !isFinite(value)) {
    return 'Price not available';
  }
  
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `USD $${value.toLocaleString()}`;
  }
}

// Memoized PropertyCard component for better performance
export const PropertyCard = memo<PropertyCardProps>(function PropertyCard({ 
  property, 
  showEdit = false, 
  onDelete, 
  state = 'idle',
  className = '' 
}) {
  usePerformanceMonitor('PropertyCard');
  
  // Enhanced image handling with optimization
  const fallbackImage = "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop";
  const rawImage = property.images?.[0] ?? fallbackImage;
  const optimizedImage = useOptimizedImage(rawImage, {
    width: 600,
    height: 400,
    quality: 80
  });
  
  // Defensive checks for required properties
  if (!property?.id || !property?.title) {
    console.warn('PropertyCard: Missing required property data', property);
    return null;
  }
  
  const isDeleting = state === 'deleting';
  const isConfirmPending = state === 'confirm-pending';
  
  // Memoized event handlers
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDeleting || !onDelete) return;
    
    try { 
      console.log("Delete click", property.id); 
    } catch (error) {
      console.warn('Error logging delete action:', error);
    }
    onDelete(property);
  }, [isDeleting, onDelete, property]);

  return (
    <Card className={`group overflow-hidden rounded-2xl shadow-lg border transition-transform transition-shadow duration-200 hover:shadow-xl hover:-translate-y-0.5 ${className}`}>
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {/* Price badge */}
        <div className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow">
          {formatPriceUSD(property.price)}
        </div>
        <Image
          src={optimizedImage}
          alt={safeString(property.title, 'Property image')}
          fill
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyatSEfLz7j0VywfDN1Mw5HlkI5MxOqD0Uvy3H9qEyXTJ4J4I8qNOCRFBJNOKpWHLaFAkKEARqJiP8AWJ8qAi/7CL2EaPjCOk0ILWPdKCR9mOMnkW7jBkJsz5+/a/uCz2GZE4b5aO5DRsUxU68eKjqvDUUJRZA3YMdtqd1ePe0DnRZBPQl7b1nQBKaSpLRBzB1yqGcP9nxp6FLQoEfR6F8qJNlTPj//2Q=="
        />
        {property.type && (
          <div className="absolute bottom-3 left-3 z-10 rounded-md bg-background/90 px-2 py-1.5 text-sm font-medium text-foreground shadow">
            {property.type}
          </div>
        )}
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-xl text-foreground leading-tight group-hover:text-lime-500 transition-colors duration-200">
          {property.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
          <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="truncate">{safeString(property.location, 'Location not specified')}</span>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Button asChild className="w-full sm:flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]">
            <Link href={`/properties/${property.id}`}>Ver detalles</Link>
          </Button>
          {showEdit && (
            <Button asChild variant="outline" className="w-full sm:w-auto min-h-[44px] sm:w-12 sm:h-12 sm:p-0" title="Editar propiedad">
              <Link href={`/properties/${property.id}/edit`}>
                <Edit className="h-4 w-4" />
                <span className="sm:hidden ml-2">Editar</span>
              </Link>
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto min-h-[44px] sm:w-12 sm:h-12 sm:p-0"
              onClick={handleDelete}
              disabled={isDeleting}
              title={isDeleting ? "Eliminando propiedad" : isConfirmPending ? "Confirmar eliminación" : "Eliminar propiedad"}
              aria-label={isDeleting ? "Eliminando propiedad" : isConfirmPending ? "Confirmar eliminación" : "Eliminar propiedad"}
            >
              <Trash2 className="h-4 w-4" /> 
              <span className="sm:hidden ml-2">
                {isDeleting ? "Eliminando…" : (isConfirmPending ? "Confirmar" : "Eliminar")}
              </span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
