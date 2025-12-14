'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  cancelText?: string
  loading?: boolean
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  confirmVariant = 'destructive',
  cancelText = 'Cancelar',
  loading = false,
  type = 'danger'
}: ConfirmationDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false)

  const handleConfirm = async () => {
    setInternalLoading(true)
    try {
      await onConfirm()
    } finally {
      setInternalLoading(false)
      onClose()
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'danger': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      case 'info': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-6 w-6 ${getIconColor()}`} />
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-2">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={internalLoading || loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={internalLoading || loading}
          >
            {(internalLoading || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Higher-order component for easier usage
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void | Promise<void>
    confirmText?: string
    confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    cancelText?: string
    loading?: boolean
    type?: 'danger' | 'warning' | 'info'
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  const confirm = (
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string
      confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
      cancelText?: string
      loading?: boolean
      type?: 'danger' | 'warning' | 'info'
    }
  ) => {
    setDialogState({
      isOpen: true,
      title,
      description,
      onConfirm,
      ...options,
    })
  }

  const close = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }))
  }

  const ConfirmationDialogComponent = () => (
    <ConfirmationDialog
      isOpen={dialogState.isOpen}
      onClose={close}
      onConfirm={dialogState.onConfirm}
      title={dialogState.title}
      description={dialogState.description}
      confirmText={dialogState.confirmText}
      confirmVariant={dialogState.confirmVariant}
      cancelText={dialogState.cancelText}
      loading={dialogState.loading}
      type={dialogState.type}
    />
  )

  return { confirm, ConfirmationDialogComponent }
}

export default ConfirmationDialog
