import type React from "react"
import Navigation from "@/components/navigation"
import PageTransition from "@/components/ui/page-transition"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation>
        <PageTransition>
          <div className="animate-in fade-in-0 duration-300">
            {children}
          </div>
        </PageTransition>
      </Navigation>
    </div>
  )
}
