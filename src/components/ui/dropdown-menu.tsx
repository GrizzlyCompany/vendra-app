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
  align?: string
  children: React.ReactNode
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

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  return <div className="relative inline-block text-left">{children}</div>
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ children }) => {
  return <>{children}</>
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  align = "end",
  children
}) => {
  return (
    <div
      className={cn(
        "absolute z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
        align === "end" ? "right-0" : align === "start" ? "left-0" : ""
      )}
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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
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
