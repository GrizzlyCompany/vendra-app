"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Grid3X3 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function PropertyGallery({ images }: { images: string[] }) {
  const items = useMemo(() => (images && images.length ? images : [
    "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop",
  ]), [images]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Mobile Carousel
  return (
    <div className="relative z-0 group">
      {/* Mobile / Simple View */}
      <div className="md:hidden relative aspect-[4/3] overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={items[currentIndex]}
          alt="Vista Principal"
          className="h-full w-full object-cover transition-transform duration-500"
        />

        {items.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {items.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full shadow-sm transition-all ${i === currentIndex ? "bg-white w-3" : "bg-white/50"}`}
              />
            ))}
          </div>
        )}

        {items.length > 1 && (
          <>
            <button onClick={() => setCurrentIndex(p => Math.abs((p - 1) % items.length))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => setCurrentIndex(p => (p + 1) % items.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Desktop Masonry / Bento Grid */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-2xl overflow-hidden">
        {/* Main Image (Half width) */}
        <div className="col-span-2 row-span-2 relative group/item cursor-pointer overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={items[0]} alt="Principal" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />
        </div>

        {/* Secondary Images */}
        <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden">
          {items[1] && <img src={items[1]} alt="Interior 1" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />}
        </div>
        <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden rounded-tr-xl">
          {items[2] && <img src={items[2]} alt="Interior 2" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />}
        </div>
        <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden">
          {items[3] && <img src={items[3]} alt="Interior 3" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />}
        </div>
        <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden rounded-br-xl bg-gray-100 flex items-center justify-center">
          {items[4] ? (
            <div className="relative w-full h-full">
              <img src={items[4]} alt="Interior 4" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />
              {items.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover/item:bg-black/60 transition-colors">
                  <span className="text-white font-medium text-lg">+{items.length - 5} fotos</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
              <Grid3X3 className="size-6 opacity-50" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (Optional View All) */}
      <div className="hidden md:block absolute bottom-4 right-4">
        <button className="bg-white/90 backdrop-blur-md shadow-lg border border-white/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white flex items-center gap-2 transition-transform active:scale-95">
          <Grid3X3 className="size-4" />
          Ver todas las fotos
        </button>
      </div>
    </div>
  );
}
