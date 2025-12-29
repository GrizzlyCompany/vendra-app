"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Trash2, MapPin, Edit, ArrowRight, Heart, BedDouble, Bath, Ruler, User, ShieldCheck } from "lucide-react";
import { Property } from "@/types";
import { memo, useCallback } from "react";
import { usePerformanceMonitor } from "@/hooks/usePerformance";
import { safeString } from "@/lib/safe";
import { MorphCard } from "@/components/transitions/MorphCard";
import { useTranslations } from "next-intl";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * Hook for optimizing image URLs, particularly for Unsplash images
 * @param src - The original image source URL
 * @param options - Optimization options including width, height, and quality
 * @returns Optimized image URL with query parameters for better performance
 */
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
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  href?: string;
}

/**
 * Formats a numeric value as currency with locale support
 * @param value - The numeric price value to format
 * @param locale - The current locale code
 * @param fallback - Fallback message if invalid
 * @returns Formatted price string or fallback message if invalid
 */
function formatPrice(value: number, locale: string, fallback: string): string {
  if (typeof value !== 'number' || !isFinite(value)) {
    return fallback;
  }

  try {
    return new Intl.NumberFormat(locale === "es" ? "es-DO" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `USD $${value.toLocaleString()}`;
  }
}

/**
 * PropertyCard component displays a property listing with image, price, location, and action buttons
 * Features performance optimizations including memoization, lazy loading, and image optimization
 *
 * @param property - The property data to display
 * @param showEdit - Whether to show the edit button (default: false)
 * @param onDelete - Callback function when delete button is clicked
 * @param state - Current state of the card ('idle' | 'deleting' | 'confirm-pending')
 * @param className - Additional CSS classes for styling
 * @returns React component for displaying property information
 */
export const PropertyCard = memo<PropertyCardProps>(function PropertyCard({
  property,
  showEdit = false,
  onDelete,
  state = 'idle',
  className = '',
  isFavorite,
  onToggleFavorite,
  href
}) {
  usePerformanceMonitor('PropertyCard');
  const t = useTranslations("properties");
  const { locale } = useLanguage();

  // Enhanced image handling with optimization
  const fallbackImage = "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop";
  const rawImage = property.images?.[0] ?? fallbackImage;
  const optimizedImage = useOptimizedImage(rawImage, {
    width: 600,
    height: 400,
    quality: 80
  });

  // Memoized event handlers - must be before any early returns
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;

    try {
      console.log("Delete click", property.id);
    } catch (error) {
      console.warn('Error logging delete action:', error);
    }
    onDelete(property);
  }, [onDelete, property]);

  // Defensive checks for required properties
  if (!property?.id || !property?.title) {
    console.warn('PropertyCard: Missing required property data', property);
    return null;
  }

  const isDeleting = state === 'deleting';
  const isConfirmPending = state === 'confirm-pending';

  return (
    <MorphCard
      targetUrl={href || `/properties/view?id=${property.id}`}
      className="group h-full"
      enableMorph={!onDelete && !showEdit}
    >
      <Card
        className={`h-full overflow-hidden rounded-2xl border-white/20 bg-card/60 backdrop-blur-md shadow-lg transition-all duration-300 hover:translate-y-[-4px] hover:shadow-2xl hover:bg-card/80 dark:bg-card/40 dark:hover:bg-card/60 ${className}`}
        role="article"
        aria-labelledby={`property-title-${property.id}`}
        aria-describedby={`property-description-${property.id}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {/* Gradient Overlay on Image Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10" />

          {/* Price badge with glassmorphism */}
          <div
            className="absolute left-3 top-3 z-20 rounded-full bg-black/50 backdrop-blur-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/20"
            aria-label={`${t("filters.priceRange")}: ${formatPrice(property.price, locale, t("priceNotAvailable"))}`}
          >
            {formatPrice(property.price, locale, t("priceNotAvailable"))}
          </div>

          {/* Favorite Button (Top Right) */}
          <button
            className={`absolute right-3 top-3 z-20 h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-sm group/heart ${isFavorite
              ? "bg-red-500 text-white hover:bg-red-600 border-red-500"
              : "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-red-500"
              }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.(property.id);
            }}
            title={isFavorite ? t("removeFromFavorites") : t("addToFavorites")}
          >
            <Heart className={`h-4 w-4 transition-transform group-active/heart:scale-90 ${isFavorite ? "fill-current" : ""}`} />
          </button>

          {/* Type badge */}
          {property.type && (
            <div className="absolute right-3 bottom-14 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <span
                className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-foreground shadow-sm"
                role="status"
                aria-label={`${t("filters.type")}: ${property.type}`}
              >
                {t(`types.${property.type.toLowerCase() as any}`, { fallback: property.type })}
              </span>
            </div>
          )}

          {/* Verified Agent Badge */}
          {(property.role_priority || 0) >= 20 && (
            <div className="absolute left-3 top-12 z-20">
              <div className="flex items-center gap-1 bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20 uppercase tracking-wide">
                <ShieldCheck className="w-3 h-3" />
                <span>Verificado</span>
              </div>
            </div>
          )}

          {/* Agent Avatar (Bottom Left Overlay) */}
          <div className="absolute left-3 bottom-0 translate-y-1/2 z-20">
            <div className="h-10 w-10 rounded-full border-2 border-white bg-muted shadow-md overflow-hidden relative group/avatar">
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                <User className="h-5 w-5 opacity-50" />
              </div>
              {/* Image would go here if available */}
            </div>
          </div>

          <Image
            src={optimizedImage}
            alt={safeString(property.title, t("imageAlt"))}
            fill
            className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyatSEfLz7j0VywfDN1Mw5HlkI5MxOqD0Uvy3H9qEyXTJ4J4I8qNOCRFBJNOKpWHLaFAkKEARqJiP8AWJ8qAi/7CL2EaPjCOk0ILWPdKCR9mOMnkW7jBkJsz5+/a/uCz2GZE4b5aO5DRsUxU68eKjqvDUUJRZA3YMdtqd1ePe0DnRZBPQl7b1nQBKaSpLRBzB1yqGcP9nxp6FLQoEfR6F8qJNlTPj//2Q=="
          />
        </div>

        <CardHeader className="pb-2 pt-6">
          <CardTitle
            id={`property-title-${property.id}`}
            className="font-serif text-xl font-bold text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors duration-200 line-clamp-1"
          >
            {property.title}
          </CardTitle>

          <div
            className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1"
            id={`property-description-${property.id}`}
          >
            <MapPin
              className="h-3.5 w-3.5 text-primary flex-shrink-0"
              aria-hidden="true"
            />
            <span className="truncate font-medium text-xs sm:text-sm text-gray-500 dark:text-gray-400" aria-label={`${t("filters.location")}: ${safeString(property.location, t("locationNotSpecified"))}`}>
              {safeString(property.location, t("locationNotSpecified"))}
            </span>
          </div>
        </CardHeader>

        {/* Feature Icons Row */}
        <div className="px-6 pb-2 flex items-center gap-4 text-sm text-muted-foreground">
          {property.bedrooms && (
            <div className="flex items-center gap-1.5" title={`${property.bedrooms} ${t("details.bedrooms")}`}>
              <BedDouble className="h-4 w-4" />
              <span className="font-medium">{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1.5" title={`${property.bathrooms} ${t("details.bathrooms")}`}>
              <Bath className="h-4 w-4" />
              <span className="font-medium">{property.bathrooms}</span>
            </div>
          )}
          {property.area && (
            <div className="flex items-center gap-1.5" title={`${property.area} ${t("details.sqm")}`}>
              <Ruler className="h-4 w-4" />
              <span className="font-medium">{property.area}<span className="text-[10px]">{t("details.sqm")}</span></span>
            </div>
          )}
        </div>

        <CardContent className="pt-2">
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <Button
              asChild
              className="w-full sm:flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 min-h-[40px] rounded-lg group/btn"
              aria-describedby={`property-title-${property.id} property-description-${property.id}`}
            >
              <Link href={href || `/properties/view?id=${property.id}`}>
                {t("viewDetails")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                <span className="sr-only">de {property.title}</span>
              </Link>
            </Button>

            {showEdit && (
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto min-h-[40px] sm:w-10 sm:h-10 sm:p-0 rounded-lg hover:bg-muted"
                title={t("editProperty")}
                aria-label={`${t("editProperty")}: ${property.title}`}
              >
                <Link href={`/properties/${property.id}/edit`}>
                  <Edit className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:hidden ml-2">{t("edit")}</span>
                </Link>
              </Button>
            )}

            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto min-h-[40px] sm:w-10 sm:h-10 sm:p-0 rounded-lg shadow-sm hover:bg-destructive/90 transition-colors"
                onClick={(e) => {
                  if (isDeleting) return;
                  handleDelete(e);
                }}
                disabled={isDeleting}
                title={isDeleting ? t("deletingProperty") : isConfirmPending ? t("confirmDelete") : t("deleteProperty")}
                aria-label={`${isDeleting ? t("deleting") : isConfirmPending ? t("confirmDelete") : t("deleteProperty")}: ${property.title}`}
                aria-describedby={`property-title-${property.id}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="sm:hidden ml-2">
                  {isDeleting ? t("deleting") : (isConfirmPending ? t("confirm") : t("delete"))}
                </span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </MorphCard>
  );
});
