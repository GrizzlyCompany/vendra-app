"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin, Building2, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
    id: string;
    project_name: string;
    city_province: string | null;
    address: string | null;
    images: string[] | string | null;
    unit_price_range: string | null;
    created_at: string;
    project_status: string | null;
}

interface ProjectCardProps {
    project: Project;
    index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
    const images = Array.isArray(project.images)
        ? project.images
        : project.images
            ? [String(project.images)]
            : [];

    const coverImage = images[0] || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

    const getStatusColor = (status: string | null) => {
        const s = status?.toLowerCase() || "";
        if (s.includes("preventa")) return "bg-blue-500/90 text-white border-blue-400/20";
        if (s.includes("construcción") || s.includes("construccion")) return "bg-amber-500/90 text-white border-amber-400/20";
        if (s.includes("entrega") || s.includes("finalizado")) return "bg-emerald-500/90 text-white border-emerald-400/20";
        return "bg-primary/90 text-white border-primary/20";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -8 }}
            className="group relative h-[420px] w-full rounded-[2rem] overflow-hidden bg-background shadow-lg transition-all duration-300 hover:shadow-2xl"
        >
            {/* Background Image with Zoom Effect */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="h-full w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                    style={{ backgroundImage: `url(${coverImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-60" />
            </div>

            {/* Floating Status Badge */}
            {project.project_status && (
                <div className="absolute top-4 left-4 z-10">
                    <Badge className={`px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border ${getStatusColor(project.project_status)} uppercase tracking-wide text-[10px] font-bold`}>
                        {project.project_status}
                    </Badge>
                </div>
            )}

            {/* Content Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end h-full bg-gradient-to-t from-black/90 via-black/40 to-transparent">

                {/* Animated Info Container */}
                <div className="transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">

                    <h3 className="font-serif text-2xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                        {project.project_name}
                    </h3>

                    <div className="flex items-center text-white/80 text-sm mb-3">
                        <MapPin className="w-4 h-4 mr-1.5 shrink-0 text-primary-foreground/80" />
                        <span className="truncate">{project.city_province || project.address || "Ubicación Privilegiada"}</span>
                    </div>

                    <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 overflow-hidden transition-all duration-300 ease-in-out pb-1">
                        <p className="text-white/70 text-sm line-clamp-2 mb-3">
                            Descubre un estilo de vida exclusivo en este desarrollo único. Diseño arquitectónico de vanguardia y amenidades de lujo.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Precio desde</span>
                            <span className="text-lg font-bold text-emerald-400 shadow-black drop-shadow-sm">
                                {project.unit_price_range ? `$${project.unit_price_range}` : "Consultar"}
                            </span>
                        </div>

                        <Link href={`/projects/view?id=${project.id}`}>
                            <button className="h-10 w-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg group-active:scale-95">
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </Link>
                    </div>

                </div>
            </div>
        </motion.div>
    );
}
