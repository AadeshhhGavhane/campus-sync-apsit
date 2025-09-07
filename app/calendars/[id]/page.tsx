"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Calendar, Clock, Edit, User, Home } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LoadingPage } from "@/components/ui/loading-spinner"

interface CalendarEvent {
  date: string
  time?: string
  title: string
  type: string
  description?: string
}

interface User {
  _id: string
  name: string
  email: string
  role: "hod" | "faculty" | "student"
  departmentName: string
}

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTimeToAMPM = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Timezone-safe date formatting
const formatDateLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse date string safely
const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Group consecutive events by title and type
const groupConsecutiveEvents = (events: CalendarEvent[]) => {
  if (!events || events.length === 0) return []
  
  const sortedEvents = events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const grouped: Array<{
    title: string
    type: string
    description?: string
    time?: string
    startDate: string
    endDate: string
    count: number
  }> = []
  
  let currentGroup: any = null
  
  for (const event of sortedEvents) {
    if (!currentGroup) {
      currentGroup = {
        title: event.title,
        type: event.type,
        description: event.description,
        time: event.time,
        startDate: event.date,
        endDate: event.date,
        count: 1
      }
    } else if (
      currentGroup.title === event.title &&
      currentGroup.type === event.type &&
      currentGroup.description === event.description &&
      currentGroup.time === event.time
    ) {
      // Check if dates are consecutive
      const currentEnd = parseDate(currentGroup.endDate)
      const nextDate = parseDate(event.date)
      const diffTime = nextDate.getTime() - currentEnd.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      
      if (diffDays === 1) {
        currentGroup.endDate = event.date
        currentGroup.count++
      } else {
        // Not consecutive, start new group
        grouped.push(currentGroup)
        currentGroup = {
          title: event.title,
          type: event.type,
          description: event.description,
          time: event.time,
          startDate: event.date,
          endDate: event.date,
          count: 1
        }
      }
    } else {
      // Different event, start new group
      grouped.push(currentGroup)
      currentGroup = {
        title: event.title,
        type: event.type,
        description: event.description,
        time: event.time,
        startDate: event.date,
        endDate: event.date,
        count: 1
      }
    }
  }
  
  if (currentGroup) {
    grouped.push(currentGroup)
  }
  
  return grouped
}

// Format date range for display
const formatDateRange = (startDate: string, endDate: string) => {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  
  if (startDate === endDate) {
    return start.toLocaleDateString()
  }
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`
    }
    return `${startMonth} - ${endMonth}`
  }
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endMonth}`
}

export default function CalendarViewPage({ params }: { params: Promise<{ id: string }> }) {
  const [calendar, setCalendar] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get user data
        const userResponse = await fetch('/api/auth/me')
        if (!userResponse.ok) {
          router.push('/auth/login')
          return
        }
        const userData = await userResponse.json()
        setUser(userData.user)

        // Get calendar data
        const { id } = await params
        const calendarResponse = await fetch(`/api/calendars/${id}`)
        if (!calendarResponse.ok) {
          router.push('/calendars')
          return
        }
        const calendarData = await calendarResponse.json()
        setCalendar(calendarData.calendar)
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/calendars')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params, router])

  if (loading) {
    const fallbackUser = {
      _id: '',
      name: '',
      email: '',
      role: 'student' as const,
      departmentName: ''
    }
    
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <LoadingPage text="Loading calendar..." />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!calendar || !user) {
    return null
  }

  // Generate calendar grid for current month
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const calendarDays = []
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    calendarDays.push(new Date(date))
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateLocal(date)
    return calendar.events?.filter((event: CalendarEvent) => event.date === dateStr) || []
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "holiday":
        return "bg-red-100 text-red-800 border-red-200"
      case "exam":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "meeting":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "event":
        return "bg-green-100 text-green-800 border-green-200"
      case "deadline":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowDateModal(true)
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/calendars">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Calendars
                </Link>
              </Button>
            </div>
          </div>


          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/home" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/calendars">Calendars</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{calendar?.name || 'Calendar'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{calendar.name}</h1>
                {calendar.description && <p className="text-gray-600 mt-1">{calendar.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{calendar.events?.length || 0} events</span>
              <span>•</span>
              <span>Created {new Date(calendar.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar Grid */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
                  <CardDescription>Click on any date to see events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((date, index) => {
                      const events = getEventsForDate(date)
                      const isCurrentMonth = date.getMonth() === currentMonth
                      const isToday = date.toDateString() === new Date().toDateString()
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleDateClick(date)}
                          className={`
                            min-h-[80px] p-1 border border-gray-200 rounded-lg text-left transition-all hover:bg-gray-50 hover:shadow-md
                            ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                            ${isToday ? 'border-blue-500 bg-blue-50' : ''}
                          `}
                        >
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {events.slice(0, 2).map((event: CalendarEvent, eventIndex: number) => (
                              <div
                                key={eventIndex}
                                className={`text-xs p-1 rounded border truncate ${getEventTypeColor(event.type)}`}
                                title={`${event.title}${event.time ? ` at ${formatTimeToAMPM(event.time)}` : ""}`}
                              >
                                {event.title}
                              </div>
                            ))}
                            {events.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{events.length - 2} more
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>All events in chronological order</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {calendar.events && calendar.events.length > 0 ? (
                      groupConsecutiveEvents(calendar.events)
                        .map((group: any, index: number) => (
                          <div key={index} className={`p-3 rounded-lg border ${getEventTypeColor(group.type)}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{group.title}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-gray-600">
                                    {formatDateRange(group.startDate, group.endDate)}
                                    {group.count > 1 && (
                                      <span className="ml-1 text-blue-600 font-medium">
                                        ({group.count} days)
                                      </span>
                                    )}
                                  </span>
                                  {group.time && (
                                    <>
                                      <span className="text-xs">•</span>
                                      <span className="text-xs">
                                        {formatTimeToAMPM(group.time)}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {group.description && (
                                  <p className="text-xs mt-1 opacity-75">{group.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No events scheduled</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Date Modal */}
          <Dialog open={showDateModal} onOpenChange={setShowDateModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedDate && (
                    <>
                      Events for {selectedDate.toLocaleDateString("en-US", { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric' 
                      })}
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((event: CalendarEvent, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border ${getEventTypeColor(event.type)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {event.type}
                            </Badge>
                            {event.time && (
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeToAMPM(event.time)}</span>
                              </div>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No events scheduled for this day</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  )
}
