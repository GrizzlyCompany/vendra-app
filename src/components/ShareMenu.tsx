"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastContext } from "@/components/ToastProvider";
import type { Property } from "@/types";

interface ShareMenuProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareMenu({ property, isOpen, onClose }: ShareMenuProps) {
  const { success: showSuccess, error: showError, info: showInfo } = useToastContext();

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = property.title;
  const shareText = `¡Mira esta increíble propiedad! ${shareTitle} - ${new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: property.currency || "USD", 
    maximumFractionDigits: 0 
  }).format(property.price)} en ${property.location}`;

  const handleWhatsAppShare = () => {
    const whatsappText = encodeURIComponent(`${shareText}\\n\\n${shareUrl}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
    window.open(whatsappUrl, '_blank');
    showInfo('Compartir en WhatsApp', 'Abriendo WhatsApp para compartir la propiedad');
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('¡Enlace copiado!', 'El enlace de la propiedad se copió al portapapeles');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('¡Enlace copiado!', 'El enlace de la propiedad se copió al portapapeles');
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
        showSuccess('¡Compartido!', 'Propiedad compartida exitosamente');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          showError('Error al compartir', 'No se pudo compartir la propiedad');
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
              <h3 className="text-lg font-semibold text-foreground">Compartir propiedad</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Property Info */}
            <div className="mb-6 p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm text-foreground truncate">{shareTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">{property.location}</p>
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
                  <p className="text-xs text-muted-foreground">Compartir por WhatsApp</p>
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
                  <p className="text-xs text-muted-foreground">Copiar al portapapeles</p>
                </div>
              </Button>

              {/* Native Share (mobile only) */}
              {typeof window !== 'undefined' && 'share' in navigator && (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                >
                  <Share2 className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Más opciones</p>
                    <p className="text-xs text-muted-foreground">Compartir con otras apps</p>
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