"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastContext } from "@/components/ToastProvider";
import type { Property, Project } from "@/types";

interface ShareMenuProps {
  property?: Property;
  project?: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareMenu({ property, project, isOpen, onClose }: ShareMenuProps) {
  const { success: showSuccess, error: showError, info: showInfo } = useToastContext();
  const [isClient, setIsClient] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Initialize client-side only values after mount
  useEffect(() => {
    setIsClient(true);
    setCanShare('share' in navigator);
  }, []);

  // Determine if we're sharing a property or project
  const isProperty = !!property;
  const isProject = !!project;
  
  // Get share data based on type
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = isProperty ? property!.title : project!.project_name;
  const shareLocation = isProperty ? property!.location : (project!.city_province || project!.address || '');
  
  const shareText = isProperty 
    ? `¡Mira esta increíble propiedad! ${shareTitle} - ${new Intl.NumberFormat("en-US", { 
        style: "currency", 
        currency: property!.currency || "USD", 
        maximumFractionDigits: 0 
      }).format(property!.price)} en ${property!.location}`
    : `¡Mira este increíble proyecto! ${shareTitle} en ${shareLocation}`;

  const handleWhatsAppShare = () => {
    // Add a space before the URL to ensure proper separation
    const whatsappText = encodeURIComponent(`${shareText}\n\n ${shareUrl}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
    window.open(whatsappUrl, '_blank');
    showInfo(
      isProperty ? 'Compartir en WhatsApp' : 'Compartir en WhatsApp',
      isProperty 
        ? 'Abriendo WhatsApp para compartir la propiedad' 
        : 'Abriendo WhatsApp para compartir el proyecto'
    );
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess(
        isProperty ? '¡Enlace copiado!' : '¡Enlace copiado!',
        isProperty 
          ? 'El enlace de la propiedad se copió al portapapeles' 
          : 'El enlace del proyecto se copió al portapapeles'
      );
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess(
        isProperty ? '¡Enlace copiado!' : '¡Enlace copiado!',
        isProperty 
          ? 'El enlace de la propiedad se copió al portapapeles' 
          : 'El enlace del proyecto se copió al portapapeles'
      );
    }
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        showSuccess(
          isProperty ? '¡Compartido!' : '¡Compartido!',
          isProperty 
            ? 'Propiedad compartida exitosamente' 
            : 'Proyecto compartido exitosamente'
        );
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          showError(
            isProperty ? 'Error al compartir' : 'Error al compartir',
            isProperty 
              ? 'No se pudo compartir la propiedad' 
              : 'No se pudo compartir el proyecto'
          );
        }
      }
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 55
            }}
          />
          
          {/* Share Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-background rounded-2xl shadow-xl border z-[60] p-6 w-[90vw] max-w-sm max-h-[80vh] overflow-y-auto"
            style={{
              position: 'fixed',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 60
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {isProperty ? 'Compartir propiedad' : 'Compartir proyecto'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Item Info */}
            <div className="mb-6 p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm text-foreground truncate">{shareTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">{shareLocation}</p>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              {/* WhatsApp */}
              <Button
                onClick={handleWhatsAppShare}
                variant="outline"
                className="w-full justify-start gap-3 h-12"
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    {isProperty ? 'Compartir por WhatsApp' : 'Compartir por WhatsApp'}
                  </p>
                </div>
              </Button>

              {/* Copy Link */}
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full justify-start gap-3 h-12"
              >
                <Copy className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">Copiar enlace</p>
                  <p className="text-xs text-muted-foreground">
                    {isProperty ? 'Copiar al portapapeles' : 'Copiar al portapapeles'}
                  </p>
                </div>
              </Button>

              {/* Native Share (mobile only) - only render on client */}
              {isClient && canShare && (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                >
                  <Share2 className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Más opciones</p>
                    <p className="text-xs text-muted-foreground">
                      {isProperty ? 'Compartir con otras apps' : 'Compartir con otras apps'}
                    </p>
                  </div>
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}