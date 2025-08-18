import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface User {
  _id: string
  name: string
  email: string
  role: "hod" | "faculty" | "student"
  departmentName: string
  organizationId?: string
}

interface Group {
  _id: string
  name: string
  description: string
  joinCode: string
  organizationId: string
  createdBy: string
  members?: any[]
  assignedTimetables?: string[]
  assignedCalendars?: string[]
}

interface Calendar {
  _id: string
  name: string
  description?: string
  organizationId: string
  createdBy: string
  events?: any[]
  assignedGroups?: string[]
}

interface Timetable {
  _id: string
  name: string
  description?: string
  organizationId: string
  createdBy: string
  schedule?: any[]
  assignedGroups?: string[]
}

interface AppState {
  // User state
  user: User | null
  isAuthenticated: boolean
  
  // Data state
  groups: Group[]
  calendars: Calendar[]
  timetables: Timetable[]
  
  // Loading states
  loading: {
    user: boolean
    groups: boolean
    calendars: boolean
    timetables: boolean
  }
  
  // Error states
  errors: {
    user: string | null
    groups: string | null
    calendars: string | null
    timetables: string | null
  }
  
  // Actions
  setUser: (user: User | null) => void
  setAuthenticated: (isAuthenticated: boolean) => void
  
  setGroups: (groups: Group[]) => void
  setCalendars: (calendars: Calendar[]) => void
  setTimetables: (timetables: Timetable[]) => void
  
  setLoading: (key: keyof AppState['loading'], value: boolean) => void
  setError: (key: keyof AppState['errors'], value: string | null) => void
  
  // Data fetching actions
  fetchUserData: () => Promise<void>
  fetchGroups: () => Promise<void>
  fetchCalendars: () => Promise<void>
  fetchTimetables: () => Promise<void>
  
  // Utility actions
  logout: () => void
  clearData: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        groups: [],
        calendars: [],
        timetables: [],
        
        loading: {
          user: false,
          groups: false,
          calendars: false,
          timetables: false,
        },
        
        errors: {
          user: null,
          groups: null,
          calendars: null,
          timetables: null,
        },
        
        // Actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
        
        setGroups: (groups) => set({ groups }),
        setCalendars: (calendars) => set({ calendars }),
        setTimetables: (timetables) => set({ timetables }),
        
        setLoading: (key, value) => 
          set((state) => ({ 
            loading: { ...state.loading, [key]: value } 
          })),
          
        setError: (key, value) => 
          set((state) => ({ 
            errors: { ...state.errors, [key]: value } 
          })),
        
        // Data fetching actions
        fetchUserData: async () => {
          const { setLoading, setError, setUser } = get()
          
          setLoading('user', true)
          setError('user', null)
          
          try {
            const response = await fetch('/api/auth/me')
            if (!response.ok) {
              throw new Error('Failed to fetch user data')
            }
            
            const data = await response.json()
            setUser(data.user)
          } catch (error) {
            setError('user', error instanceof Error ? error.message : 'Unknown error')
            setUser(null)
          } finally {
            setLoading('user', false)
          }
        },
        
        fetchGroups: async () => {
          const { setLoading, setError, setGroups, user } = get()
          
          if (!user) return
          
          setLoading('groups', true)
          setError('groups', null)
          
          try {
            const response = await fetch('/api/groups')
            if (!response.ok) {
              throw new Error('Failed to fetch groups')
            }
            
            const data = await response.json()
            setGroups(data.groups || [])
          } catch (error) {
            setError('groups', error instanceof Error ? error.message : 'Unknown error')
            setGroups([])
          } finally {
            setLoading('groups', false)
          }
        },
        
        fetchCalendars: async () => {
          const { setLoading, setError, setCalendars, user } = get()
          
          if (!user) return
          
          setLoading('calendars', true)
          setError('calendars', null)
          
          try {
            const response = await fetch('/api/calendars')
            if (!response.ok) {
              throw new Error('Failed to fetch calendars')
            }
            
            const data = await response.json()
            setCalendars(data.calendars || [])
          } catch (error) {
            setError('calendars', error instanceof Error ? error.message : 'Unknown error')
            setCalendars([])
          } finally {
            setLoading('calendars', false)
          }
        },
        
        fetchTimetables: async () => {
          const { setLoading, setError, setTimetables, user } = get()
          
          if (!user) return
          
          setLoading('timetables', true)
          setError('timetables', null)
          
          try {
            const response = await fetch('/api/timetables')
            if (!response.ok) {
              throw new Error('Failed to fetch timetables')
            }
            
            const data = await response.json()
            setTimetables(data.timetables || [])
          } catch (error) {
            setError('timetables', error instanceof Error ? error.message : 'Unknown error')
            setTimetables([])
          } finally {
            setLoading('timetables', false)
          }
        },
        
        // Utility actions
        logout: () => {
          set({
            user: null,
            isAuthenticated: false,
            groups: [],
            calendars: [],
            timetables: [],
            loading: {
              user: false,
              groups: false,
              calendars: false,
              timetables: false,
            },
            errors: {
              user: null,
              groups: null,
              calendars: null,
              timetables: null,
            },
          })
        },
        
        clearData: () => {
          set({
            groups: [],
            calendars: [],
            timetables: [],
            errors: {
              user: null,
              groups: null,
              calendars: null,
              timetables: null,
            },
          })
        },
      }),
      {
        name: 'campussync-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          // Don't persist data arrays to keep them fresh
        }),
      }
    ),
    {
      name: 'campussync-store',
    }
  )
) 