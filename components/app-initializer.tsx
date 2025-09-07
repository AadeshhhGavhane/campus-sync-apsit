"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDataPreloader } from '@/hooks/use-data-preloader'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AppInitializerProps {
  children: React.ReactNode
}

export default function AppInitializer({ children }: AppInitializerProps) {
  const [showContent, setShowContent] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, progress, isAuthenticated, hasData } = useDataPreloader()

  // Skip initialization for auth pages and landing page
  const isPublicRoute = pathname === '/' || pathname.startsWith('/auth/')

  useEffect(() => {
    if (isPublicRoute) {
      setShowContent(true)
      return
    }

    // If not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    // If authenticated and data is loaded, show content
    if (hasData) {
      setShowContent(true)
    }
  }, [isPublicRoute, isLoading, isAuthenticated, hasData, router])

  // Show loading screen for protected routes while data is loading
  if (!isPublicRoute && !showContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <img 
              src="/apsit.png" 
              alt="CampusSync" 
              className="h-16 w-16 mx-auto mb-4 animate-pulse" 
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {!isAuthenticated ? 'Checking authentication...' : 'Loading CampusSync...'}
            </h2>
            <p className="text-gray-600">
              {!isAuthenticated 
                ? 'Verifying your session...' 
                : 'Preparing your dashboard and data...'}
            </p>
          </div>

          {isAuthenticated && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Loading progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <LoadingSpinner size="sm" />
                <span>
                  {progress < 25 ? 'Loading user data...' :
                   progress < 50 ? 'Loading groups...' :
                   progress < 75 ? 'Loading calendars...' :
                   progress < 100 ? 'Loading timetables...' :
                   'Finalizing...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
} 