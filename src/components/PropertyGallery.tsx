"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PropertyGallery({ images }: { images: string[] }) {
  const items = useMemo(() => (images && images.length ? images : [
    "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop",
  ]), [images]);

  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  return (
    <div className="space-y-3 relative z-0">
      {/* Main image with hover zoom */}
      <div className="group relative overflow-hidden rounded-md border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={items[index]}
          src={items[index]}
          alt={`property-${index}`}
          className="h-[380px] w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 shadow hover:bg-background"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 shadow hover:bg-background"
              aria-label="Siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((src, i) => (
          <button
            type="button"
            key={src + i}
            onClick={() => setIndex(i)}
            className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border ${i === index ? "ring-2 ring-[hsl(var(--ring))]" : ""}`}
            aria-label={`Ver imagen ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`thumb-${i}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
