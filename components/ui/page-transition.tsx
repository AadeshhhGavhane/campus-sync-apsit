"use client"

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  // Just provide smooth fade-in animation without loading states
  // Client-side navigation should be instant
  return (
    <div className="w-full">
      <div className="animate-in fade-in-0 duration-200">
        {children}
      </div>
    </div>
  )
} 