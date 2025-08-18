"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { useEffect } from 'react'

// Query keys for consistent caching
export const queryKeys = {
  user: ['user'],
  groups: ['groups'],
  calendars: ['calendars'],
  timetables: ['timetables'],
}

// Custom hook for user data
export function useUser() {
  const { user, setUser, setAuthenticated } = useAppStore()
  
  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        throw new Error('Not authenticated')
      }
      const data = await response.json()
      return data.user
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  })

  // Sync with Zustand store
  useEffect(() => {
    if (query.data) {
      setUser(query.data)
    } else if (query.error) {
      setUser(null)
      setAuthenticated(false)
    }
  }, [query.data, query.error, setUser, setAuthenticated])

  return {
    user: user || query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Custom hook for groups data
export function useGroups() {
  const { groups, setGroups } = useAppStore()
  const { user } = useUser()
  
  const query = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => {
      const response = await fetch('/api/groups')
      if (!response.ok) {
        throw new Error('Failed to fetch groups')
      }
      const data = await response.json()
      return data.groups || []
    },
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  // Sync with Zustand store
  useEffect(() => {
    if (query.data) {
      setGroups(query.data)
    }
  }, [query.data, setGroups])

  return {
    groups: groups.length > 0 ? groups : query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Custom hook for calendars data
export function useCalendars() {
  const { calendars, setCalendars } = useAppStore()
  const { user } = useUser()
  
  const query = useQuery({
    queryKey: queryKeys.calendars,
    queryFn: async () => {
      const response = await fetch('/api/calendars')
      if (!response.ok) {
        throw new Error('Failed to fetch calendars')
      }
      const data = await response.json()
      return data.calendars || []
    },
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  // Sync with Zustand store
  useEffect(() => {
    if (query.data) {
      setCalendars(query.data)
    }
  }, [query.data, setCalendars])

  return {
    calendars: calendars.length > 0 ? calendars : query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Custom hook for timetables data
export function useTimetables() {
  const { timetables, setTimetables } = useAppStore()
  const { user } = useUser()
  
  const query = useQuery({
    queryKey: queryKeys.timetables,
    queryFn: async () => {
      const response = await fetch('/api/timetables')
      if (!response.ok) {
        throw new Error('Failed to fetch timetables')
      }
      const data = await response.json()
      return data.timetables || []
    },
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  // Sync with Zustand store
  useEffect(() => {
    if (query.data) {
      setTimetables(query.data)
    }
  }, [query.data, setTimetables])

  return {
    timetables: timetables.length > 0 ? timetables : query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Custom hook for logout mutation
export function useLogout() {
  const queryClient = useQueryClient()
  const { logout } = useAppStore()
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Logout failed')
      }
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear()
      // Clear Zustand store
      logout()
    },
  })
}

// Hook to prefetch all data for seamless navigation
export function usePrefetchData() {
  const queryClient = useQueryClient()
  const { user } = useUser()

  const prefetchAll = () => {
    if (!user) return

    // Prefetch all main data
    queryClient.prefetchQuery({
      queryKey: queryKeys.groups,
      queryFn: async () => {
        const response = await fetch('/api/groups')
        const data = await response.json()
        return data.groups || []
      },
      staleTime: Infinity,
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.calendars,
      queryFn: async () => {
        const response = await fetch('/api/calendars')
        const data = await response.json()
        return data.calendars || []
      },
      staleTime: Infinity,
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.timetables,
      queryFn: async () => {
        const response = await fetch('/api/timetables')
        const data = await response.json()
        return data.timetables || []
      },
      staleTime: Infinity,
    })
  }

  useEffect(() => {
    if (user) {
      // Prefetch data on user login/load
      prefetchAll()
    }
  }, [user])

  return { prefetchAll }
} 