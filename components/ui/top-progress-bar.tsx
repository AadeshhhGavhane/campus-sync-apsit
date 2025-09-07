"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function TopProgressBar() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Use a longer delay before showing loading indicator
    // This prevents showing it for fast client-side navigation
    const showLoadingTimer = setTimeout(() => {
      setIsLoading(true)
      setProgress(20)
      
      // Gradual progress only if we're actually loading
      const progressTimers = [
        setTimeout(() => setProgress(40), 200),
        setTimeout(() => setProgress(60), 400),
        setTimeout(() => setProgress(80), 600),
        setTimeout(() => {
          setProgress(100)
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
          }, 200)
        }, 800)
      ]

      return () => {
        progressTimers.forEach(clearTimeout)
      }
    }, 300) // Only show after 300ms delay

    // Cleanup function
    return () => {
      clearTimeout(showLoadingTimer)
      setIsLoading(false)
      setProgress(0)
    }
  }, [pathname])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 6px rgba(59, 130, 246, 0.3)'
        }}
      />
    </div>
  )
} 