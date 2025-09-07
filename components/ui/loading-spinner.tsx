import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "page" | "inline"
  text?: string
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12"
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default", 
  text,
  className 
}: LoadingSpinnerProps) {
  const spinner = (
    <Loader2 className={cn(
      "animate-spin text-blue-600",
      sizeClasses[size],
      className
    )} />
  )

  if (variant === "page") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
        {spinner}
        {text && (
          <p className="text-gray-600 text-sm font-medium">{text}</p>
        )}
      </div>
    )
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center space-x-2">
        {spinner}
        {text && (
          <span className="text-gray-600 text-sm">{text}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      {spinner}
    </div>
  )
}

export function LoadingPage({ 
  text = "Loading...",
  className 
}: { 
  text?: string
  className?: string 
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] space-y-6",
      className
    )}>
      <div className="relative">
        <div className="h-16 w-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 bg-white rounded-full"></div>
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-900">{text}</p>
        <p className="text-sm text-gray-500">Please wait while we load your content</p>
      </div>
    </div>
  )
}

export function LoadingCard({ 
  text = "Loading...",
  className 
}: { 
  text?: string
  className?: string 
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 space-y-4",
      className
    )}>
      <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-gray-600 font-medium">{text}</p>
    </div>
  )
} 