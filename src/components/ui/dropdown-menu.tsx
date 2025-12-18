import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

interface DropdownMenuContentProps {
  align?: "start" | "end" | "center"
  side?: "top" | "bottom"
  children: React.ReactNode
  className?: string
}

interface DropdownMenuItemProps {
  onClick?: () => void
  className?: string
  disabled?: boolean
  children: React.ReactNode
}

interface DropdownMenuLabelProps {
  children: React.ReactNode
}

interface DropdownMenuSeparatorProps {
  className?: string
}

// Create context for dropdown state
const DropdownContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
} | null>(null)

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = () => {
      setIsOpen(false)
    }

    // Use setTimeout to delay adding the listener
    // This ensures the current click event finishes before we start listening
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("click", handleClickOutside)
    }
  }, [isOpen])

  const contextValue = {
    isOpen,
    setIsOpen,
  }

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
  asChild
}) => {
  const context = React.useContext(DropdownContext)

  if (!context) {
    throw new Error("DropdownMenuTrigger must be used within DropdownMenu")
  }

  const { setIsOpen, isOpen } = context

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  // If asChild is true, clone the child element and add the onClick handler
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props || {};
    return React.cloneElement(children, {
      ...childProps,
      onClick: handleClick
    } as React.Attributes & { onClick?: (e: React.MouseEvent) => void })
  }

  // Otherwise, wrap in a button
  return (
    <button onClick={handleClick} type="button">
      {children}
    </button>
  )
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  align = "end",
  side = "bottom",
  children,
  className
}) => {
  const context = React.useContext(DropdownContext)

  if (!context) {
    throw new Error("DropdownMenuContent must be used within DropdownMenu")
  }

  const { isOpen } = context

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "absolute z-50 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
        side === "bottom" ? "mt-2 origin-top-right" : "bottom-full mb-2 origin-bottom-right",
        align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2",
        className
      )}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  )
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  onClick,
  className,
  disabled,
  children
}) => {
  const context = React.useContext(DropdownContext)

  if (!context) {
    throw new Error("DropdownMenuItem must be used within DropdownMenu")
  }

  const { setIsOpen } = context

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
    // Close the dropdown after clicking an item
    setIsOpen(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      type="button"
    >
      {children}
    </button>
  )
}

export const DropdownMenuLabel: React.FC<DropdownMenuLabelProps> = ({ children }) => {
  return <div className="px-4 py-2 text-sm font-medium text-gray-900">{children}</div>
}

export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps> = ({
  className
}) => {
  return <div className={cn("border-t border-gray-200", className)} />
}