"use client"

import { useEffect } from 'react'
import { useUser, useGroups, useCalendars, useTimetables } from './use-app-data'

/**
 * Hook to preload all essential data for the application
 * This ensures instant navigation and seamless user experience
 */
export function useDataPreloader() {
  // Trigger all data fetching hooks
  const { user, isLoading: userLoading } = useUser()
  const { groups, isLoading: groupsLoading } = useGroups()
  const { calendars, isLoading: calendarsLoading } = useCalendars()
  const { timetables, isLoading: timetablesLoading } = useTimetables()

  // Overall loading state
  const isLoading = userLoading || groupsLoading || calendarsLoading || timetablesLoading

  // Progress calculation
  const loadedItems = [
    !userLoading ? 1 : 0,
    !groupsLoading ? 1 : 0,
    !calendarsLoading ? 1 : 0,
    !timetablesLoading ? 1 : 0,
  ].reduce((sum, item) => sum + item, 0)
  
  const progress = (loadedItems / 4) * 100

  useEffect(() => {
    if (user && !isLoading) {
      console.log('🚀 All data preloaded successfully:', {
        user: user.name,
        groups: groups.length,
        calendars: calendars.length,
        timetables: timetables.length,
      })
    }
  }, [user, isLoading, groups.length, calendars.length, timetables.length])

  return {
    user,
    groups,
    calendars,
    timetables,
    isLoading,
    progress,
    isAuthenticated: !!user,
    hasData: !isLoading && !!user,
  }
} 