"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ImageSelectorProps {
  onImagesChange: (files: FileList | null) => void;
  existingImages?: string[];
  maxImages?: number;
  label?: string;
  id?: string;
  onRemoveExistingImage?: (index: number) => void;
}

export function ImageSelector({
  onImagesChange,
  existingImages = [],
  maxImages = 5,
  label = "Imágenes",
  id = "images",
  onRemoveExistingImage
}: ImageSelectorProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [typedPreviewUrls, setTypedPreviewUrls] = useState<string[]>([]);
  const [imagesInput, setImagesInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Parse typed URLs
  useEffect(() => {
    const urls = imagesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setTypedPreviewUrls(urls);
  }, [imagesInput]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  // Notify parent when files change
  useEffect(() => {
    onImagesChange(files);
  }, [files, onImagesChange]);

  const openFilePicker = () => fileInputRef.current?.click();

  const onDropFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const dt = new DataTransfer();
    const currentTotal = (files?.length || 0) + typedPreviewUrls.length + existingImages.length;
    const maxToAdd = maxImages - currentTotal;
    
    // Add existing files
    if (files) {
      Array.from(files).forEach((f) => dt.items.add(f));
    }
    
    // Add new files up to limit
    Array.from(newFiles).slice(0, maxToAdd).forEach((f) => dt.items.add(f));
    
    const finalFiles = dt.files;
    setFiles(finalFiles);
    
    // Generate previews
    const previews = Array.from(finalFiles).map((f) => URL.createObjectURL(f));
    setFilePreviews(previews);
  };

  const removeFileAt = (idx: number) => {
    if (!files) return;
    const dt = new DataTransfer();
    Array.from(files).forEach((f, i) => {
      if (i !== idx) dt.items.add(f);
    });
    
    const toRemove = filePreviews[idx];
    if (toRemove) URL.revokeObjectURL(toRemove);
    
    setFiles(dt.files);
    const newPreviews = Array.from(dt.files).map((f) => URL.createObjectURL(f));
    setFilePreviews(newPreviews);
  };

  const removeTypedUrl = (url: string) => {
    const arr = typedPreviewUrls.filter((u) => u !== url);
    setTypedPreviewUrls(arr);
    setImagesInput(arr.join(", "));
  };

  // Function to remove existing images
  const removeExistingImage = (index: number) => {
    if (onRemoveExistingImage) {
      onRemoveExistingImage(index);
    }
  };

  const currentTotal = (files?.length || 0) + typedPreviewUrls.length + existingImages.length;
  const canAddMore = currentTotal < maxImages;

  return (
    <div className="grid gap-2">
      <div className="text-sm text-muted-foreground">
        {label} ({currentTotal}/{maxImages})
      </div>
      <span className="text-xs text-muted-foreground">
        Gestiona las imágenes. Puedes añadir hasta {maxImages} fotos.
      </span>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {/* Existing images with remove option */}
        {existingImages.map((src, i) => (
          <div key={`ep-${i}`} className="relative group aspect-square">
            <img 
              src={src} 
              alt={`existing-${i}`} 
              className="h-full w-full object-cover rounded-md" 
            />
            <button
              type="button"
              onClick={() => removeExistingImage(i)}
              className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Eliminar imagen"
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* File previews */}
        {filePreviews.map((src, i) => (
          <div key={`fp-${i}`} className="relative group aspect-square">
            <img 
              src={src} 
              alt={`preview-${i}`} 
              className="h-full w-full object-cover rounded-md" 
            />
            <button
              type="button"
              onClick={() => removeFileAt(i)}
              className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Eliminar imagen"
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Typed URL previews */}
        {typedPreviewUrls.map((src, i) => (
          <div key={`tp-${i}`} className="relative group aspect-square">
            <img 
              src={src} 
              alt={`url-${i}`} 
              className="h-full w-full object-cover rounded-md" 
            />
            <button
              type="button"
              onClick={() => removeTypedUrl(src)}
              className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Eliminar imagen"
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add new image button */}
        {canAddMore && (
          <div
            className={`group aspect-square rounded-md border-2 border-dashed grid place-items-center text-center cursor-pointer hover:bg-muted transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
              isDragging ? "bg-muted/50" : ""
            }`}
            onClick={openFilePicker}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              onDropFiles(e.dataTransfer.files);
            }}
            role="button"
            aria-label="Añadir fotos"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFilePicker();
              }
            }}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="text-xs text-muted-foreground mt-1">Añadir Fotos</div>
          </div>
        )}
      </div>

      {/* Hidden input for selecting more images */}
      <input
        ref={fileInputRef}
        id={id}
        name={id}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => onDropFiles(e.target.files)}
        className="sr-only"
      />

      {/* URLs input */}
      <div className="grid gap-2">
        <label className="text-sm text-muted-foreground" htmlFor={`${id}-urls`}>
          Imágenes (URLs, separadas por coma)
        </label>
        <Input
          id={`${id}-urls`}
          name={`${id}-urls`}
          placeholder="https://... , https://..."
          value={imagesInput}
          onChange={(e) => setImagesInput(e.target.value)}
        />
      </div>
    </div>
  );
}