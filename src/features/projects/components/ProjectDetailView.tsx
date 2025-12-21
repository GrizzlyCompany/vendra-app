"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    MapPin,
    CheckCircle,
    Calendar,
    Download,
    Building,
    ChevronLeft,
    ChevronRight,
    Share2,
    ArrowRight,
    LayoutGrid
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ShareMenu } from "@/components/ShareMenu";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLanguage } from "@/components/LanguageProvider";

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
    brochure: string[];
    unit_price_range: string;
    payment_methods: string;
    partner_bank: string;
    owner_id: string;
    latitude?: number;
    longitude?: number;
    created_at: string;
}

interface Owner {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string | null;
}

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

export function ProjectDetailView({ id }: { id: string }) {
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
    const isOwner = currentUser?.id === project?.owner_id;
    const trackProjectViewRef = useRef<Promise<void> | null>(null);
    const t = useTranslations("projects");
    const { locale } = useLanguage();

    const formatCurrency = (amount: string | number) => {
        if (!amount) return "";
        const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
        return new Intl.NumberFormat(locale === "es" ? "es-DO" : "en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }).format(num);
    };

    const getStatusLabel = (status: string | null) => {
        const s = status?.toLowerCase() || "";
        if (s.includes("preventa") || s.includes("presale")) return t("status.presale");
        if (s.includes("construcción") || s.includes("construccion") || s.includes("construction")) return t("status.construction");
        if (s.includes("entrega") || s.includes("delivery")) return t("status.delivery");
        if (s.includes("finalizado") || s.includes("finished")) return t("status.finished");
        if (s.includes("agotado") || s.includes("sold")) return t("status.soldOut");
        return status;
    };

    const getAmenityLabel = (amenity: string) => {
        // Try to find an exact match in translations
        // If the key doesn't exist, t() usually returns the key path or just the key if configured differently.
        // But with next-intl, if we pass a key that doesn't exist, it might return the key.
        // A safer way is to check if the input string is one of our known keys or just rely on fallback.
        // However, t() return value for missing keys depends on configuration.
        // Let's assume standard behavior: if it returns the key path 'projects.amenities.X', we show original.
        // Better yet, just try to translate. If the translation equals the key path, fallback.

        // Actually simplest approach:
        // We know what keys we added. Realistically we should strip "projects.amenities." prefix if we can check existence.
        // But useTranslations doesn't expose 'has'.

        // Alternative: Map the specific known strings we see in DB. 
        // "2 Habitaciones" -> split -> translate "Habitaciones" -> reassemble.
        return t.has(`amenities.${amenity}`) ? t(`amenities.${amenity}`) : amenity;
    };

    const getUnitTypeLabel = (type: string) => {
        // Handle "2 Habitaciones", "Local Comercial", etc.
        // We will try to translate the whole string first
        if (t.has(`unitTypes.${type}`)) return t(`unitTypes.${type}`);

        // If not, try to split parsing (e.g. "2 Habitaciones")
        const parts = type.split(" ");
        if (parts.length === 2 && !isNaN(Number(parts[0]))) {
            const count = parts[0];
            const word = parts.slice(1).join(" "); // "Habitaciones"
            if (t.has(`unitTypes.${word}`)) {
                return `${count} ${t(`unitTypes.${word}`)}`;
            }
        }

        return type;
    };

    // Map state
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: ['places']
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);

    const containerStyle = {
        width: '100%',
        height: '100%',
        borderRadius: '1.5rem'
    };

    const defaultCenter = {
        lat: 18.4861,
        lng: -69.9312
    };

    const onLoad = (map: google.maps.Map) => setMap(map);
    const onUnmount = (map: google.maps.Map) => setMap(null);

    useEffect(() => {
        if (isLoaded && project && (project.address || project.city_province)) {
            if (project.latitude && project.longitude) {
                setMarkerPos({ lat: project.latitude, lng: project.longitude });
            } else {
                const geocoder = new google.maps.Geocoder();
                const addressToCode = `${project.address}, ${project.city_province}`;

                geocoder.geocode({ address: addressToCode }, (results, status) => {
                    if (status === "OK" && results && results[0]) {
                        const location = results[0].geometry.location;
                        setMarkerPos({ lat: location.lat(), lng: location.lng() });
                    }
                });
            }
        }
    }, [isLoaded, project]);

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

        if (id) fetchProject();
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
                    <p className="text-destructive font-serif text-xl">{t("details.errorTitle")}</p>
                    <Button onClick={() => router.back()}>{t("details.return")}</Button>
                </div>
            </div>
        );
    }

    const images = project.images ?? [];
    const currentImage = images[activeImageIndex] || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

    const unitsData = (() => {
        let units = [];
        try {
            units = project.unit_types ? JSON.parse(project.unit_types) : [];
            if (!Array.isArray(units)) throw new Error();
        } catch (e) {
            const types = project.unit_types ? project.unit_types.split(",").map(t => t.trim()) : [];
            const qtys = project.quantity_per_type ? project.quantity_per_type.split(",").map(q => q.trim()) : [];

            units = types.map(t => {
                const sizeMatch = t.match(/\((.*?)\s*m²\)/);
                const size = sizeMatch ? sizeMatch[1] : "";
                const cleanType = t.replace(/\s*\(.*?\)/, "").trim();
                const qtyMatch = qtys.find(q => q.includes(cleanType));
                const quantity = qtyMatch ? qtyMatch.replace(new RegExp(cleanType, 'g'), "").trim() : "";
                return { type: cleanType, size, quantity, available: "" };
            });
        }
        return units;
    })();

    return (
        <main className="min-h-screen bg-background pb-20 mobile-bottom-safe">
            <DetailBackButton className="lg:hidden sticky top-0 bg-background/0 z-40 mobile-top-safe transition-all duration-300">
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

            <nav className="hidden lg:flex fixed top-4 left-6 z-50">
                <Button asChild variant="outline" className="rounded-full bg-white/80 hover:bg-white backdrop-blur-md border shadow-sm px-6 gap-2">
                    <Link href="/projects">
                        <ChevronLeft className="w-4 h-4" /> {t("details.backToProjects")}
                    </Link>
                </Button>
            </nav>

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

                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30 pointer-events-none" />

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

                <div className="absolute bottom-0 left-0 p-6 md:p-12 md:pb-16 w-full max-w-5xl">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {project.project_status && (
                                <Badge className="bg-primary/90 hover:bg-primary text-white border-none px-3 py-1 text-xs uppercase tracking-wider shadow-lg backdrop-blur-md">
                                    {getStatusLabel(project.project_status)}
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

            <div className="container max-w-[1600px] mx-auto px-4 md:px-8 -mt-8 md:-mt-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                    <div className="lg:col-span-8 space-y-12 pb-12">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                            <div className="text-center p-2 border-r border-border/50 last:border-0">
                                <span className="block text-2xl font-bold text-primary">{project.units_count || "—"}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("details.units")}</span>
                            </div>
                            <div className="text-center p-2 border-r border-border/50 last:border-0">
                                <span className="block text-2xl font-bold text-primary">{project.floors || "—"}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("details.levels")}</span>
                            </div>
                            <div className="text-center p-2 border-r border-border/50 last:border-0">
                                <span className="block text-2xl font-bold text-primary">{project.land_size ? `${project.land_size}m²` : "—"}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("details.land")}</span>
                            </div>
                            <div className="text-center p-2">
                                <span className="block text-2xl font-bold text-primary">{project.built_areas ? `${project.built_areas}m²` : "—"}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("details.construction")}</span>
                            </div>
                        </div>

                        <section className="prose prose-lg dark:prose-invert max-w-none">
                            <h2 className="font-serif text-3xl font-bold text-foreground mb-4">{project.description_title || t("details.aboutTitle")}</h2>
                            <p className="text-muted-foreground leading-relaxed text-lg font-light">
                                {project.short_description || t("details.aboutDescDefault")}
                            </p>
                        </section>

                        <section>
                            <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary" />
                                {t("details.amenitiesTitle")}
                            </h3>
                            {project.amenities && project.amenities.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {project.amenities.map((amenity, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/5 border border-transparent hover:border-primary/20 transition-all">
                                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                            <span className="text-foreground font-medium">{getAmenityLabel(amenity)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic">{t("details.amenitiesPending")}</p>
                            )}
                        </section>

                        <section>
                            <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5 text-primary" />
                                {t("details.unitsTitle")}
                            </h3>
                            {unitsData.length === 0 ? (
                                <p className="text-muted-foreground italic">{t("details.unitsPending")}</p>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-muted/50 border-b border-border">
                                                <th className="p-4 text-xs uppercase font-bold text-muted-foreground">{t("details.table.type")}</th>
                                                <th className="p-4 text-xs uppercase font-bold text-muted-foreground">{t("details.table.size")}</th>
                                                <th className="p-4 text-xs uppercase font-bold text-muted-foreground text-center">{t("details.table.total")}</th>
                                                <th className="p-4 text-xs uppercase font-bold text-muted-foreground text-right">{t("details.table.available")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {unitsData.map((u: any, i: number) => {
                                                const availUnits = u.available ? parseInt(u.available) : null;
                                                const statusLabel =
                                                    availUnits === 0
                                                        ? t("details.unitStatus.soldOut")
                                                        : availUnits && availUnits <= 3
                                                            ? t("details.unitStatus.lastUnits", { count: availUnits })
                                                            : availUnits
                                                                ? t("details.unitStatus.available", { count: availUnits })
                                                                : t("details.unitStatus.consult");
                                                const statusColor = (availUnits === 0) ? "bg-red-500/10 text-red-600 border-red-200" : (availUnits && availUnits <= 3) ? "bg-amber-500/10 text-amber-600 border-amber-200" : "bg-emerald-500/10 text-emerald-600 border-emerald-200";

                                                return (
                                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                        <td className="p-4 font-semibold text-foreground">{getUnitTypeLabel(u.type)}</td>
                                                        <td className="p-4 text-muted-foreground tracking-wide">{u.size ? `${u.size} m²` : "—"}</td>
                                                        <td className="p-4 text-center font-medium text-muted-foreground">{u.quantity || "—"}</td>
                                                        <td className="p-4 text-right">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                                                {statusLabel}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {project.plans && project.plans.length > 0 && (
                            <section>
                                <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
                                    <Building className="w-5 h-5 text-primary" />
                                    {t("details.plansTitle")}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {project.plans.map((plan, i) => (
                                        <div key={i} className="rounded-2xl overflow-hidden border border-border relative group cursor-pointer" onClick={() => window.open(plan, '_blank')}>
                                            <img src={plan.toLowerCase().endsWith('.pdf') ? 'https://via.placeholder.com/400x300?text=VISTA+PREVIA+PDF' : plan} alt={`Plano ${i + 1}`} className="w-full h-48 object-contain bg-white/50" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button variant="secondary" size="sm" className="gap-2">
                                                    <Download className="w-4 h-4" /> {t("details.viewPlan")}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {project.address && (
                            <section>
                                <h3 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    {t("details.locationTitle")}
                                </h3>
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
                                            {markerPos && <Marker position={markerPos as google.maps.LatLngLiteral} />}
                                        </GoogleMap>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 text-center bg-background/80 backdrop-blur-md p-4 rounded-2xl border border-white/20 inline-block w-full">
                                    <p className="font-medium">{project.address}</p>
                                    <p className="text-sm text-muted-foreground">{project.city_province}</p>
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-background/80 dark:bg-black/40 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[2rem] p-6 md:p-8 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <div className="relative z-10">
                                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("details.investmentFrom")}</p>
                                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-6">
                                        {project.unit_price_range ? formatCurrency(project.unit_price_range) : t("details.consultPrice")}
                                    </h2>

                                    <div className="space-y-3">
                                        {!isOwner && (
                                            <Button asChild className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                                                <Link href={`/messages?to=${project.owner_id}&msg=${encodeURIComponent(t("details.scheduleMessage", { projectName: project.project_name }))}`}>
                                                    <Calendar className="w-5 h-5" /> {t("details.scheduleVisit")}
                                                </Link>
                                            </Button>
                                        )}
                                        <Button variant="outline" className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5 text-primary gap-2"
                                            onClick={() => project.brochure?.[0] && window.open(project.brochure[0], '_blank')}
                                            disabled={!project.brochure?.length}
                                        >
                                            <Download className="w-5 h-5" /> {t("details.downloadBrochure")}
                                        </Button>
                                    </div>

                                    <hr className="my-6 border-border/50" />

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-primary font-bold text-lg">
                                            {owner?.name?.charAt(0) || "C"}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground uppercase">{t("details.developedBy")}</p>
                                            <p className="font-medium truncate">{owner?.name || t("details.constructionCompany")}</p>
                                        </div>
                                        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-secondary/10 text-primary">
                                            <Link href={isOwner ? "/profile" : `/profile/view?id=${owner?.id || project?.owner_id}`}>
                                                <ArrowRight className="w-5 h-5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
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
