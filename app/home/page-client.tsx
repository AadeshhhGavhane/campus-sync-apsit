"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Users, 
  Calendar, 
  Clock, 
  CalendarDays,
  BookOpen,
  MapPin,
  User,
  TrendingUp,
  ChevronRight,
  Star,
  Zap,
  Home,
  Building2
} from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { CardSkeleton } from "@/components/ui/skeleton"
import { useUser, useGroups, useCalendars, useTimetables } from "@/hooks/use-app-data"

// Helper functions
const getDayName = (date: Date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[date.getDay()]
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  })
}

const formatTimeToAMPM = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function HomePageClient() {
  const { user, isLoading: userLoading } = useUser()
  const { groups, isLoading: groupsLoading } = useGroups()
  const { calendars, isLoading: calendarsLoading } = useCalendars()
  const { timetables, isLoading: timetablesLoading } = useTimetables()

  // Get current date info
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const todayDay = getDayName(today)
  const tomorrowDay = getDayName(tomorrow)

  // Show loading if user is not loaded yet
  if (userLoading || !user) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <DashboardLoading />
        </div>
      </DashboardLayout>
    )
  }

  // Calculate stats
  const groupsCount = groups.length
  const timetablesCount = timetables.length
  const calendarsCount = calendars.length
  
  // Calculate total events across all calendars
  const totalEventsCount = calendars.reduce((total: number, calendar: any) => {
    return total + (calendar.events?.length || 0)
  }, 0)

  // Helpers for activities
  const toYMD = (d: Date) => d.toISOString().slice(0, 10)
  const todayKey = toYMD(today)
  const tomorrowKey = toYMD(tomorrow)

  const dayNameFromIndex = (idx: number) => ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][idx]
  const dayIndex = today.getDay() // 0-6
  const tomorrowIndex = (dayIndex + 1) % 7

  // Build set of groups the user is in
  const membershipGroupIds = new Set<string>(groups.map((g: any) => String(g._id)))

  // Summarize timetables for a given day: timetable name + lecture titles (no times), restricted to user's groups
  const summarizeTimetablesForDay = (idx: number) => {
    const targetDay = dayNameFromIndex(idx).toLowerCase()
    return timetables
      .filter((t: any) => (t.assignedGroups || []).some((gid: any) => membershipGroupIds.has(String(gid))))
      .map((t: any) => {
        const titles = (t.slots || [])
          .filter((s: any) => (s.dayOfWeek || '').toLowerCase() === targetDay)
          .filter((s: any) => s.type !== 'break' && s.type !== 'mini-project')
          .map((s: any) => s.title || s.type)
        return { timetableName: t.name, lectureTitles: titles }
      })
      .filter((x: any) => x.lectureTitles.length > 0)
  }

  const todayTimetableSummaries = summarizeTimetablesForDay(dayIndex)
  const tomorrowTimetableSummaries = summarizeTimetablesForDay(tomorrowIndex)

  // Calendar events for today/tomorrow (title + calendar name)
  const todayCalendarEvents = calendars.flatMap((c: any) =>
    (c.events || []).filter((e: any) => e.date === todayKey).map((e: any) => ({
      title: e.title,
      calendar: c.name,
    }))
  )
  const tomorrowCalendarEvents = calendars.flatMap((c: any) =>
    (c.events || []).filter((e: any) => e.date === tomorrowKey).map((e: any) => ({
      title: e.title,
      calendar: c.name,
    }))
  )

  // Faculty-specific schedule (slots where this user is the faculty)
  const formatRange = (s: any) => `${formatTimeToAMPM(s.startTime)} - ${formatTimeToAMPM(s.endTime)}`
  const mySlotsForDay = (idx: number) =>
    timetables.flatMap((t: any) =>
      (t.slots || [])
        .filter((s: any) => (s.dayOfWeek || '').toLowerCase() === dayNameFromIndex(idx).toLowerCase())
        .filter((s: any) => s.facultyUserId === user._id && s.type !== 'break' && s.type !== 'mini-project')
        .map((s: any) => ({ timetableName: t.name, title: s.title || s.type, time: formatRange(s), room: s.room || '' }))
    )
  const myTodaySlots = mySlotsForDay(dayIndex)
  const myTomorrowSlots = mySlotsForDay(tomorrowIndex)

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-in fade-in-0 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back,<br className="sm:hidden" /> {user.name}
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                {user.role.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {user.departmentName}
              </Badge>
              <span className="text-gray-500 text-sm">•</span>
              <span className="text-gray-600 text-sm">{formatDate(today)}</span>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-blue-600 font-medium flex items-center">
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in-0 duration-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Groups</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{groupsLoading ? '...' : groupsCount}</div>
              <p className="text-xs text-gray-600 mt-1">
                {user.role === "hod" ? "Groups you manage" : "You're part of"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in-0 duration-500" style={{animationDelay: '100ms'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Timetables</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{timetablesLoading ? '...' : timetablesCount}</div>
              <p className="text-xs text-gray-600 mt-1">Available schedules</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in-0 duration-500" style={{animationDelay: '200ms'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Calendars</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{calendarsLoading ? '...' : calendarsCount}</div>
              <p className="text-xs text-gray-600 mt-1">Accessible calendars</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in-0 duration-500" style={{animationDelay: '300ms'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{calendarsLoading ? '...' : totalEventsCount}</div>
              <p className="text-xs text-gray-600 mt-1">Across all calendars</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's and Tomorrow's Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Schedule */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 animate-in fade-in-0 duration-500" style={{animationDelay: '400ms'}}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-blue-900">
                <CalendarDays className="h-5 w-5 mr-2" />
                Today's Schedule
              </CardTitle>
              <CardDescription className="text-blue-700">
                {formatDate(today)} • {todayDay}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayTimetableSummaries.length === 0 && todayCalendarEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-blue-700 font-medium">No activities scheduled for today</p>
                  <p className="text-blue-600 text-sm">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Timetable group summaries */}
                  {todayTimetableSummaries.map((item: any, idx: number) => (
                    <div key={`tt-today-${idx}`} className="p-3 bg-white/70 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{item.timetableName}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {item.lectureTitles.slice(0, 6).join(', ')}
                            {item.lectureTitles.length > 6 ? `, +${item.lectureTitles.length - 6} more` : ''}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Timetable</Badge>
                      </div>
                    </div>
                  ))}

                  {/* Calendar events */}
                  {todayCalendarEvents.map((ev: any, idx: number) => (
                    <div key={`cal-today-${idx}`} className="p-3 bg-white/70 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{ev.title}</div>
                          <div className="text-xs text-gray-600 mt-1">{ev.calendar}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Calendar</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tomorrow's Schedule */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 animate-in fade-in-0 duration-500" style={{animationDelay: '500ms'}}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-green-900">
                <Star className="h-5 w-5 mr-2" />
                Tomorrow's Schedule
              </CardTitle>
              <CardDescription className="text-green-700">
                {formatDate(tomorrow)} • {tomorrowDay}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tomorrowTimetableSummaries.length === 0 && tomorrowCalendarEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-green-300 mx-auto mb-3" />
                  <p className="text-green-700 font-medium">No activities scheduled for tomorrow</p>
                  <p className="text-green-600 text-sm">Plan ahead for a productive day!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Timetable group summaries */}
                  {tomorrowTimetableSummaries.map((item: any, idx: number) => (
                    <div key={`tt-tom-${idx}`} className="p-3 bg-white/70 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{item.timetableName}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {item.lectureTitles.slice(0, 6).join(', ')}
                            {item.lectureTitles.length > 6 ? `, +${item.lectureTitles.length - 6} more` : ''}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Timetable</Badge>
                      </div>
                    </div>
                  ))}

                  {/* Calendar events */}
                  {tomorrowCalendarEvents.map((ev: any, idx: number) => (
                    <div key={`cal-tom-${idx}`} className="p-3 bg-white/70 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{ev.title}</div>
                          <div className="text-xs text-gray-600 mt-1">{ev.calendar}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Calendar</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Teaching Schedule (Faculty + HOD) */}
        {(user.role === 'faculty' || user.role === 'hod') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 animate-in fade-in-0 duration-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-indigo-900">
                  <CalendarDays className="h-5 w-5 mr-2" />
                  My Teaching Today
                </CardTitle>
                <CardDescription className="text-indigo-700">
                  {formatDate(today)} • {todayDay}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myTodaySlots.length === 0 ? (
                  <div className="text-center py-6 text-indigo-700">No lectures scheduled for today</div>
                ) : (
                  <div className="space-y-3">
                    {myTodaySlots.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white/70 border rounded-lg">
                        <div className="font-medium text-sm text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-600">{item.timetableName} • {item.time}{item.room ? ` • Room ${item.room}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 animate-in fade-in-0 duration-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-emerald-900">
                  <Star className="h-5 w-5 mr-2" />
                  My Teaching Tomorrow
                </CardTitle>
                <CardDescription className="text-emerald-700">
                  {formatDate(tomorrow)} • {tomorrowDay}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myTomorrowSlots.length === 0 ? (
                  <div className="text-center py-6 text-emerald-700">No lectures scheduled for tomorrow</div>
                ) : (
                  <div className="space-y-3">
                    {myTomorrowSlots.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white/70 border rounded-lg">
                        <div className="font-medium text-sm text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-600">{item.timetableName} • {item.time}{item.room ? ` • Room ${item.room}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200 animate-in fade-in-0 duration-500" style={{animationDelay: '600ms'}}>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Access frequently used features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2 hover:scale-105 transition-all duration-200">
                <Link href="/timetables">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm">Timetables</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2 hover:scale-105 transition-all duration-200">
                <Link href="/calendars">
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm">Calendars</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2 hover:scale-105 transition-all duration-200">
                <Link href="/groups">
                  <Users className="h-5 w-5" />
                  <span className="text-sm">Groups</span>
                </Link>
              </Button>
              {user.role === "hod" && (
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2 hover:scale-105 transition-all duration-200">
                  <Link href="/rooms">
                    <Building2 className="h-5 w-5" />
                    <span className="text-sm">Rooms</span>
                  </Link>
                </Button>
              )}
              {user.role !== "hod" && (
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2 hover:scale-105 transition-all duration-200">
                  <Link href="/join">
                    <MapPin className="h-5 w-5" />
                    <span className="text-sm">Join Group</span>
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 