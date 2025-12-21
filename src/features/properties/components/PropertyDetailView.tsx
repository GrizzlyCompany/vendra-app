"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { PropertyGallery } from "@/features/properties/components/PropertyGallery";
import { OwnerCard } from "@/features/properties/components/OwnerCard";
import { Button } from "@/components/ui/button";
import { MapPin, Castle, Ruler, Bath, Bed, Heart, ArrowLeft, Share2, ShieldCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/features/properties/hooks/useFavorites";
import type { Property } from "@/types";
import { timeAgo } from "@/lib/utils";
import { DetailPageTransition } from "@/components/transitions/DetailPageTransition";
import { ShareMenu } from "@/components/ShareMenu";
import { useTranslations } from "next-intl";
import { useLanguage } from "@/components/LanguageProvider";

import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '1rem'
};

const defaultCenter = {
    lat: 18.4861,
    lng: -69.9312
};

export function PropertyDetailView({ id }: { id: string }) {
    const t = useTranslations("properties");
    const { locale } = useLanguage();
    const router = useRouter();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [propertyId, setPropertyId] = useState<string | null>(null);
    const { toggleFavorite, isFavorite } = useFavorites();
    const [isToggling, setIsToggling] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Map state
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: ['places']
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    // Effect to geocode address when property loads
    useEffect(() => {
        if (isLoaded && property && (property.address || property.location)) {
            if (property.latitude && property.longitude) {
                setMarkerPos({ lat: property.latitude, lng: property.longitude });
            } else {
                const geocoder = new google.maps.Geocoder();
                const addressToCode = property.address || property.location;

                geocoder.geocode({ address: addressToCode }, (results, status) => {
                    if (status === "OK" && results && results[0]) {
                        const location = results[0].geometry.location;
                        setMarkerPos({ lat: location.lat(), lng: location.lng() });
                    }
                });
            }
        }
    }, [isLoaded, property]);

    useEffect(() => {
        async function loadProperty() {
            try {
                setLoading(true);
                setPropertyId(id);

                // Fetch user
                const { data: authData } = await supabase.auth.getUser();
                setCurrentUserId(authData.user?.id ?? null);

                const { data, error } = await supabase
                    .from("properties")
                    .select("id,title,description,price,location,address,images,type,owner_id,currency,inserted_at,bedrooms,bathrooms,area,latitude,longitude")
                    .eq("id", id)
                    .single();

                if (error || !data) {
                    // For client-side fetch fail, we can show error state instead of notFound() which depends on server
                    // But standard approach is to redirect or show 404 UI
                    // notFound() might not work in Client Component exactly as expected in all contexts but usually throws
                    console.error("Property not found");
                    setLoading(false);
                    return;
                }

                setProperty(data as Property);
                await trackPropertyView(id);
            } catch (error) {
                console.error('Error loading property:', error);
            } finally {
                setLoading(false);
            }
        }

        loadProperty();
    }, [id]);

    const trackPropertyView = async (propertyId: string) => {
        try {
            const { data: session } = await supabase.auth.getSession();
            const viewerId = session.session?.user?.id || null;
            const userAgent = navigator.userAgent;
            const referrer = document.referrer || null;
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const { error: viewError } = await supabase
                .from("property_views")
                .insert({
                    property_id: propertyId,
                    viewer_id: viewerId,
                    user_agent: userAgent,
                    referrer: referrer,
                    session_id: sessionId,
                });

            if (!viewError) {
                await supabase.rpc('increment_property_views', { property_id: propertyId });
            }
        } catch (error) {
            // Silent fail for analytics
        }
    };

    const handleFavoriteClick = async () => {
        if (!propertyId || isToggling) return;
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) {
            router.push('/login');
            return;
        }
        setIsToggling(true);
        try {
            await toggleFavorite(propertyId);
        } finally {
            setIsToggling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground font-serif text-lg">{t("loadingExperience")}</p>
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-serif mb-4">{t("notFound")}</h1>
                <Button onClick={() => router.push('/main')}>{t("backToHome")}</Button>
            </div>
        );
    }

    const images: string[] = property.images ?? [];
    const currencyCode: string = property.currency ?? "USD";
    const price = new Intl.NumberFormat(locale === "es" ? "es-DO" : "en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0
    }).format(property.price);

    const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    // Features logic
    const features = [
        { icon: <Bed className="size-5" />, label: `${property.bedrooms || '-'} ${t("details.bedrooms")}`, sub: t("bedroomsSub") },
        { icon: <Bath className="size-5" />, label: `${property.bathrooms || '-'} ${t("details.bathrooms")}`, sub: t("bathroomsSub") },
        { icon: <Ruler className="size-5" />, label: `${property.area || '-'} ${t("details.sqm")}`, sub: t("areaSub") },
        { icon: <Castle className="size-5" />, label: property.type ? t(`types.${property.type.toLowerCase() as any}`, { fallback: property.type }) : t("typeSub"), sub: t("typeSub") },
    ];

    return (
        <>
            {/* 1. Immersive Header (Breadcrumbs & Actions) WITH SAFE AREA PADDING */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 mobile-top-safe">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
                    <Link href="/main" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                        <div className="p-2 rounded-full bg-secondary/20 group-hover:bg-primary/10 transition-colors">
                            <ArrowLeft className="size-4" />
                        </div>
                        <span className="font-medium">{t("backToList")}</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setShowShareMenu(true)} className="rounded-full hover:bg-secondary/20 hover:text-primary">
                            <Share2 className="size-5" />
                        </Button>
                        <Button
                            variant={isFavorite(propertyId || '') ? "default" : "outline"}
                            size="sm"
                            onClick={handleFavoriteClick}
                            disabled={isToggling}
                            className={`rounded-full gap-2 ${isFavorite(propertyId || '') ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "hover:text-red-500 border-border"}`}
                        >
                            <Heart className={`size-4 ${isFavorite(propertyId || '') ? "fill-current" : ""}`} />
                            <span className="font-medium">{isFavorite(propertyId || '') ? t("saved") : t("save")}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <DetailPageTransition className="min-h-screen bg-background pb-20">
                <div className="container mx-auto px-4 py-6 max-w-7xl space-y-8">

                    {/* 2. Gallery Section */}
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <PropertyGallery images={images} />
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                        {/* 3. Main Content (Left Column) */}
                        <div className="lg:col-span-8 space-y-10">

                            {/* Header Info */}
                            <div className="space-y-4 border-b border-border/40 pb-8">
                                <div className="flex flex-wrap gap-2 items-center text-sm text-primary font-medium tracking-wide uppercase">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 rounded-full px-3">
                                        {property.type ? t(`types.${property.type.toLowerCase() as any}`, { fallback: property.type }) : t("typeSub")}
                                    </Badge>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><MapPin className="size-4" /> {property.location}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Clock className="size-4" /> {timeAgo(property.inserted_at, locale)}</span>
                                </div>
                                <h1 className="font-serif text-4xl md:text-5xl text-foreground font-medium leading-tight">{toTitleCase(property.title)}</h1>
                                <p className="text-xl text-muted-foreground font-light">{property.address || property.location}</p>
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {features.map((f, i) => (
                                    <div key={i} className="bg-secondary/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 border border-secondary/20 hover:border-primary/20 transition-colors cursor-default group">
                                        <div className="text-primary/70 group-hover:text-primary transition-colors p-2 bg-white rounded-full shadow-sm">
                                            {f.icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-lg">{f.label}</p>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{f.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Full Description */}
                            <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed font-light">
                                <h3 className="text-foreground font-serif text-2xl mb-4">{t("aboutThisProperty")}</h3>
                                <p className="whitespace-pre-line">{property.description || t("noDescription")}</p>
                            </div>

                            {/* Amenities List */}
                            <div>
                                <h3 className="text-foreground font-serif text-2xl mb-6">{t("amenitiesTitle")}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                    {[
                                        { key: 'pool', label: t("amenities.pool") },
                                        { key: 'security', label: t("amenities.security") },
                                        { key: 'garden', label: t("amenities.garden") },
                                        { key: 'garage', label: t("amenities.garage") },
                                        { key: 'terrace', label: t("amenities.terrace") },
                                        { key: 'kitchen', label: t("amenities.kitchen") }
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center gap-3 text-muted-foreground">
                                            <div className="text-primary"><ShieldCheck className="size-5" /></div>
                                            <span>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Location Section */}
                            <div className="pt-8">
                                <h3 className="text-foreground font-serif text-2xl mb-6">{t("location")}</h3>
                                <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-border shadow-sm bg-muted/20">
                                    {isLoaded ? (
                                        <GoogleMap
                                            mapContainerStyle={containerStyle}
                                            center={markerPos || defaultCenter}
                                            zoom={15}
                                            onLoad={onLoad}
                                            onUnmount={onUnmount}
                                            options={{
                                                disableDefaultUI: false,
                                                streetViewControl: true,
                                                mapTypeControl: false,
                                            }}
                                        >
                                            {markerPos && <Marker position={markerPos} />}
                                        </GoogleMap>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                                        </div>
                                    )}
                                </div>
                                <p className="mt-4 text-muted-foreground flex items-center gap-2">
                                    <MapPin className="size-4 shrink-0 text-primary" />
                                    <span className="text-sm font-medium">{property.address || property.location}</span>
                                </p>
                            </div>

                        </div>

                        {/* 4. Sticky Sidebar (Right Column) */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="sticky top-24 space-y-6">
                                {/* Price & Contact Card */}
                                <Card className="rounded-3xl border border-border shadow-xl overflow-hidden bg-white/80 dark:bg-card/40 backdrop-blur-xl">
                                    <div className="p-6 md:p-8 space-y-6">
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">{t("salePriceLabel")}</p>
                                            <p className="font-serif text-4xl font-bold text-primary">{price}</p>
                                        </div>

                                        <div className="h-px bg-border/50" />

                                        <div className="space-y-4">
                                            {currentUserId !== property.owner_id ? (
                                                <>
                                                    <Button asChild className="w-full h-12 rounded-xl text-lg font-medium shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                                                        <Link href={`/messages?to=${property.owner_id}`}>
                                                            {t("contactAgent")}
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="outline" className="w-full h-12 rounded-xl text-lg border-2 hover:bg-secondary/20 hover:text-foreground hover:border-primary/30">
                                                        <Link href={`/messages?to=${property.owner_id}&msg=${encodeURIComponent(`Hola, me gustaría agendar una visita para la propiedad: ${property.title}`)}`}>
                                                            {t("bookVisit")}
                                                        </Link>
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-center">
                                                    <p className="text-primary font-medium mb-2">{t("isOwnerBadge")}</p>
                                                    <Button variant="outline" asChild className="w-full">
                                                        <Link href={`/properties/${property.id}/edit`}>
                                                            {t("editPropertyBtn")}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-center text-xs text-muted-foreground pt-2">
                                            {t("buyerProtection")}
                                        </div>
                                    </div>
                                </Card>

                                {/* Agent Mini Profile */}
                                <div className="bg-secondary/10 rounded-3xl p-6 border border-secondary/20">
                                    <OwnerCard ownerId={property.owner_id} />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </DetailPageTransition>

            {property && (
                <ShareMenu
                    property={property}
                    isOpen={showShareMenu}
                    onClose={() => setShowShareMenu(false)}
                />
            )}
        </>
    );
}
