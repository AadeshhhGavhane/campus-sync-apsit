"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, User, ChevronLeft, ChevronRight, Home } from "lucide-react"
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
import { toast } from "sonner"
import { LoadingPage } from "@/components/ui/loading-spinner"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface TimetableSlot {
  dayOfWeek: string
  startTime: string
  endTime: string
  type: string
  title: string
  faculty: string
  room?: string
  batchName?: string
}

interface User {
  _id: string
  name: string
  email: string
  role: "hod" | "faculty" | "student"
  departmentName: string
}

// Helper function to convert time string to minutes for sorting
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTimeToAMPM = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export default function TimetableViewPage({ params }: { params: Promise<{ id: string }> }) {
  const [timetable, setTimetable] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDayIndex, setCurrentDayIndex] = useState(0) // For mobile navigation
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

        // Get timetable data
        const { id } = await params
        const timetableResponse = await fetch(`/api/timetables/${id}`)
        if (!timetableResponse.ok) {
          router.push('/timetables')
          return
        }
        const timetableData = await timetableResponse.json()
        setTimetable(timetableData.timetable)
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/timetables')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params, router])

  // Mobile day navigation functions
  const goToPreviousDay = () => {
    setCurrentDayIndex((prev) => (prev === 0 ? DAYS.length - 1 : prev - 1))
  }

  const goToNextDay = () => {
    setCurrentDayIndex((prev) => (prev === DAYS.length - 1 ? 0 : prev + 1))
  }

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
          <div className="max-w-7xl mx-auto">
            <LoadingPage text="Loading timetable..." />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!timetable || !user) {
    return null
  }

  // Generate time slots - create individual entries for each slot to avoid stacking
  const generateTimeSlots = (slots: TimetableSlot[]) => {
    if (!slots || slots.length === 0) return []
    
    // Group slots by start time and day to handle overlaps
    const slotsByTimeAndDay = new Map<string, Map<string, TimetableSlot[]>>()
    
    slots.forEach(slot => {
      const timeKey = slot.startTime
      const dayKey = slot.dayOfWeek
      
      if (!slotsByTimeAndDay.has(timeKey)) {
        slotsByTimeAndDay.set(timeKey, new Map())
      }
      
      const dayMap = slotsByTimeAndDay.get(timeKey)!
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, [])
      }
      
      dayMap.get(dayKey)!.push(slot)
    })
    
    // Create time slot entries - one for each unique combination
    const timeSlotEntries: { time: string; rowIndex: number; }[] = []
    
    slotsByTimeAndDay.forEach((dayMap, time) => {
      const maxSlotsForThisTime = Math.max(...Array.from(dayMap.values()).map(slots => slots.length))
      
      // Create multiple rows if needed for this time
      for (let i = 0; i < maxSlotsForThisTime; i++) {
        timeSlotEntries.push({ time, rowIndex: i })
      }
    })
    
    // Sort by time
    return timeSlotEntries.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
  }

  const timeSlots = generateTimeSlots(timetable.slots || [])

  const getSlotTypeColor = (type: string) => {
    switch (type) {
      case "lecture": return "bg-blue-100 text-blue-800 border-blue-200"
      case "lab": return "bg-green-100 text-green-800 border-green-200"
      case "honors": return "bg-purple-100 text-purple-800 border-purple-200"
      case "mentoring": return "bg-orange-100 text-orange-800 border-orange-200"
      case "break": return "bg-gray-100 text-gray-800 border-gray-200"
      case "mini-project": return "bg-teal-100 text-teal-800 border-teal-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get slot for specific day, time, and row index
  const getSlotForDayTimeAndRow = (day: string, time: string, rowIndex: number) => {
    const slotsForDayAndTime = timetable.slots?.filter((slot: TimetableSlot) => {
      return slot.dayOfWeek === day && slot.startTime === time
    }) || []
    
    return slotsForDayAndTime[rowIndex] || null
  }

  const handleSlotClick = (slot: TimetableSlot) => {
    const slotTitle = slot.type === "break" ? "Break" :
                     slot.type === "mini-project" ? "Mini Project" :
                     slot.title || slot.type

    toast.info(slotTitle, {
      description: `Faculty: ${slot.faculty || 'N/A'} • ${formatTimeToAMPM(slot.startTime)} - ${formatTimeToAMPM(slot.endTime)} • ${slot.type}${slot.room ? ` • Room ${slot.room}` : ''}`,
      duration: 3000,
    })
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link href="/timetables">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Timetables
              </Link>
            </Button>
          </div>

          {/* Breadcrumbs */}
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
                  <Link href="/timetables">Timetables</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{timetable?.name || 'Timetable'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{timetable.name}</h1>
                {timetable.description && <p className="text-gray-600 mt-1">{timetable.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{timetable.slots?.length || 0} time slots</span>
              <span>•</span>
              <span>Created {new Date(timetable.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Weekly Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>View the complete weekly timetable grid</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile Day Navigation - only visible on mobile */}
              <div className="md:hidden mb-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousDay}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <h3 className="font-semibold text-lg">{DAYS[currentDayIndex]}</h3>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextDay}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Desktop View - All Days */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-full">
                  {/* Header Row */}
                  <div className="grid grid-cols-8 gap-2 mb-4">
                    <div className="p-3 text-center font-semibold text-gray-700 bg-gray-50 rounded-lg">Time</div>
                    {DAYS.map((day) => (
                      <div key={day} className="p-3 text-center font-semibold text-gray-700 bg-gray-50 rounded-lg">
                        {day.substring(0, 3)}
                      </div>
                    ))}
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-2">
                    {timeSlots.map(({ time, rowIndex }) => (
                      <div key={`${time}-${rowIndex}`} className="grid grid-cols-8 gap-2">
                        <div className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded-lg">
                          {formatTimeToAMPM(time)}
                        </div>
                        {DAYS.map((day) => {
                          const slot = getSlotForDayTimeAndRow(day, time, rowIndex)
                          return (
                            <div key={`${day}-${time}-${rowIndex}`} className="min-h-[80px]">
                              {slot ? (
                                <div
                                  className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-105 ${getSlotTypeColor(slot.type)} h-full`}
                                  onClick={() => handleSlotClick(slot)}
                                >
                                  <div className="text-xs font-medium mb-1" title={slot.title}>
                                    {(slot as any).abbreviation || slot.title || slot.type}
                                  </div>
                                  {slot.type !== "break" && slot.type !== "mini-project" && (
                                  <div className="text-xs opacity-75 flex items-center gap-2">
                                    {slot.faculty && (<span className="inline-flex items-center"><User className="h-3 w-3 mr-1" />{slot.faculty}</span>)}
                                    {slot.room && (<span className="inline-flex items-center">Room {slot.room}</span>)}
                                    {slot.batchName && (<span className="inline-flex items-center">{slot.batchName}</span>)}
                                  </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-full border border-gray-200 rounded-lg bg-gray-50/50"></div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile View - Single Day */}
              <div className="md:hidden">
                <div className="space-y-3">
                  {timeSlots.map(({ time, rowIndex }) => {
                    const currentDay = DAYS[currentDayIndex]
                    const slot = getSlotForDayTimeAndRow(currentDay, time, rowIndex)
                    
                    // Only show this time slot if there's a slot for the current day
                    if (!slot) return null
                    
                    return (
                      <div key={`mobile-${time}-${rowIndex}`} className="flex gap-3">
                        {/* Time Column */}
                        <div className="w-20 flex-shrink-0">
                          <div className="p-2 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded-lg h-full flex items-center justify-center">
                            {formatTimeToAMPM(time)}
                          </div>
                        </div>
                        
                        {/* Slot Column */}
                        <div className="flex-1">
                          <div
                            className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-105 ${getSlotTypeColor(slot.type)} h-full`}
                            onClick={() => handleSlotClick(slot)}
                          >
                            <div className="text-sm font-medium mb-2" title={slot.title}>
                              {(slot as any).abbreviation || slot.title || slot.type}
                            </div>
                            {slot.type !== "break" && slot.type !== "mini-project" && (
                              <div className="text-sm opacity-75 flex items-center gap-2">
                                {slot.faculty && (<span className="inline-flex items-center"><User className="h-4 w-4 mr-1" />{slot.faculty}</span>)}
                                {slot.room && (<span className="inline-flex items-center">Room {slot.room}</span>)}
                                {slot.batchName && (<span className="inline-flex items-center">{slot.batchName}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Show message if no slots for current day */}
                  {timeSlots.every(({ time, rowIndex }) => 
                    !getSlotForDayTimeAndRow(DAYS[currentDayIndex], time, rowIndex)
                  ) && (
                    <div className="text-center py-8 text-gray-500">
                      No classes scheduled for {DAYS[currentDayIndex]}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Slots List */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>All Time Slots</CardTitle>
              <CardDescription>Complete list of scheduled activities</CardDescription>
            </CardHeader>
            <CardContent>
              {timetable.slots && timetable.slots.length > 0 ? (
                <div className="space-y-3">
                  {timetable.slots
                    .sort((a: TimetableSlot, b: TimetableSlot) => {
                      const dayOrder = DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek)
                      if (dayOrder !== 0) return dayOrder
                      return a.startTime.localeCompare(b.startTime)
                    })
                    .map((slot: TimetableSlot, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Badge className={getSlotTypeColor(slot.type)}>{slot.type}</Badge>
                          <div>
                            <div className="font-medium" title={slot.title}>{(slot as any).abbreviation || slot.title}</div>
                            <div className="text-sm text-gray-600 flex items-center space-x-4">
                              <span>{slot.dayOfWeek}</span>
                              <span>
                                {formatTimeToAMPM(slot.startTime)} - {formatTimeToAMPM(slot.endTime)}
                              </span>
                              <span className="flex items-center gap-2">
                                  <span className="inline-flex items-center"><User className="h-3 w-3 mr-1" />{slot.faculty}</span>
                                  {slot.room && (<span className="inline-flex items-center">Room {slot.room}</span>)}
                                  {slot.batchName && (<span className="inline-flex items-center">{slot.batchName}</span>)}
                                </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No time slots configured</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}