"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Grid3X3 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";

export function PropertyGallery({ images }: { images: string[] }) {
  const items = useMemo(() => (images && images.length ? images : [
    "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop",
  ]), [images]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsOpen(true);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev + 1) % items.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  // Keyboard navigation for lightbox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
  };

  // Mobile Carousel
  return (
    <>
      <div className="relative z-0 group">
        {/* Mobile / Simple View */}
        <div className="md:hidden relative aspect-[4/3] overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={items[currentIndex]}
            alt="Vista Principal"
            className="h-full w-full object-cover transition-transform duration-500"
            onClick={() => openLightbox(currentIndex)}
          />

          {items.length > 1 && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 pointer-events-none">
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
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => Math.abs((p - 1) % items.length)); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40">
                <ChevronLeft className="size-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p + 1) % items.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* Desktop Masonry / Bento Grid */}
        <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-2xl overflow-hidden">
          {/* Main Image (Half width) */}
          <div className="col-span-2 row-span-2 relative group/item cursor-pointer overflow-hidden" onClick={() => openLightbox(0)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={items[0]} alt="Principal" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors" />
          </div>

          {/* Secondary Images */}
          <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden" onClick={() => openLightbox(1)}>
            {items[1] && <img src={items[1]} alt="Interior 1" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />}
            <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors" />
          </div>
          <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden rounded-tr-xl" onClick={() => openLightbox(2)}>
            {items[2] && <img src={items[2]} alt="Interior 2" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />}
            <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors" />
          </div>
          <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden" onClick={() => openLightbox(3)}>
            {items[3] && <img src={items[3]} alt="Interior 3" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />}
            <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors" />
          </div>
          <div className="col-span-1 row-span-1 relative group/item cursor-pointer overflow-hidden rounded-br-xl bg-gray-100 flex items-center justify-center" onClick={() => openLightbox(4)}>
            {items[4] ? (
              <div className="relative w-full h-full">
                <img src={items[4]} alt="Interior 4" className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors" />
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

        {/* Floating Action Button (View All) */}
        <div className="hidden md:block absolute bottom-4 right-4">
          <button
            onClick={() => openLightbox(0)}
            className="bg-white/90 backdrop-blur-md shadow-lg border border-white/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white flex items-center gap-2 transition-transform active:scale-95"
          >
            <Grid3X3 className="size-4" />
            Ver todas las fotos
          </button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[100vw] w-full h-[100dvh] bg-black/95 border-none p-0 flex items-center justify-center focus:outline-none [&>button]:text-white [&>button]:top-6 [&>button]:right-6 [&>button]:w-12 [&>button]:h-12 [&>button]:bg-white/10 [&>button]:hover:bg-white/20 [&>button]:opacity-100 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center" onKeyDown={handleKeyDown}>
          <DialogTitle className="sr-only">Galería de imágenes</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button is handled by DialogContent default, but we can customize if needed. 
                Shadcn DialogContent usually has a close X. We might want to ensure it's visible on black. */}

            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[lightboxIndex]}
              alt={`Imagen ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none"
            />

            {/* Navigation Buttons */}
            {items.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="size-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="size-8" />
                </button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white font-medium text-sm border border-white/10">
              {lightboxIndex + 1} / {items.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
