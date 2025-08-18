"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Plus, Trash2, X, Save, Home } from "lucide-react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingPage } from "@/components/ui/loading-spinner"

interface CalendarEvent {
  id: string
  date: string
  time?: string
  title: string
  type: string
  description?: string
}

const EVENT_TYPES = [
  { value: "holiday", label: "Holiday", color: "bg-red-100 text-red-800" },
  { value: "exam", label: "Exam", color: "bg-orange-100 text-orange-800" },
  { value: "meeting", label: "Meeting", color: "bg-blue-100 text-blue-800" },
  { value: "event", label: "Event", color: "bg-green-100 text-green-800" },
  { value: "deadline", label: "Deadline", color: "bg-purple-100 text-purple-800" },
]

export default function EditCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "",
    time: "",
    description: "",
  })
  const [customEventTypes, setCustomEventTypes] = useState<string[]>([])
  const [newEventType, setNewEventType] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const router = useRouter()

  // Load existing calendar data
  useEffect(() => {
    const loadCalendar = async () => {
      try {
        const { id } = await params
        const response = await fetch(`/api/calendars/${id}`)
        if (!response.ok) {
          throw new Error('Failed to load calendar')
        }
        
        const { calendar } = await response.json()
        setFormData({
          name: calendar.name,
          description: calendar.description || "",
        })
        
        // Convert events to include id if not present
        const eventsWithIds = calendar.events?.map((event: any, index: number) => ({
          ...event,
          id: event.id || index.toString()
        })) || []
        
        setEvents(eventsWithIds)
        setCustomEventTypes(calendar.customEventTypes || [])
      } catch (error) {
        console.error('Error loading calendar:', error)
        setError('Failed to load calendar')
        router.push('/calendars')
      } finally {
        setLoadingData(false)
      }
    }

    loadCalendar()
  }, [params, router])

  // Month/Year navigation state
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const currentDate = viewDate
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

  const gotoPrevMonth = () => {
    const d = new Date(viewDate)
    d.setMonth(d.getMonth() - 1)
    setViewDate(d)
  }

  const gotoNextMonth = () => {
    const d = new Date(viewDate)
    d.setMonth(d.getMonth() + 1)
    setViewDate(d)
  }

  const setYear = (year: number) => {
    const d = new Date(viewDate)
    d.setFullYear(year)
    setViewDate(d)
  }

  // Timezone-safe date formatting
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const addCustomEventType = () => {
    if (newEventType.trim() && !customEventTypes.includes(newEventType.trim().toLowerCase())) {
      setCustomEventTypes([...customEventTypes, newEventType.trim().toLowerCase()])
      setNewEventType("")
    }
  }

  const removeCustomEventType = (type: string) => {
    setCustomEventTypes(customEventTypes.filter((t) => t !== type))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(formatDateLocal(date))
    setShowEventDialog(true)
  }

  const addEvent = () => {
    if (!newEvent.title || !newEvent.type) return

    const event: CalendarEvent = {
      id: Date.now().toString(),
      date: selectedDate,
      time: newEvent.time || undefined,
      title: newEvent.title,
      type: newEvent.type,
      description: newEvent.description || undefined,
    }

    setEvents([...events, event])
    setNewEvent({ title: "", type: "", time: "", description: "" })
    setShowEventDialog(false)
  }

  const removeEvent = (id: string) => {
    setEvents(events.filter((event) => event.id !== id))
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateLocal(date)
    return events.filter((event) => event.date === dateStr)
  }

  const getEventTypeColor = (type: string) => {
    const eventType = EVENT_TYPES.find((t) => t.value === type)
    if (eventType) return eventType.color
    return "bg-gray-100 text-gray-800"
  }

  const getAllEventTypes = () => {
    return [
      ...EVENT_TYPES,
      ...customEventTypes.map((type) => ({ value: type, label: type, color: "bg-gray-100 text-gray-800" })),
    ]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { id } = await params
      const response = await fetch(`/api/calendars/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          events,
          customEventTypes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update calendar")
      }

      router.push("/calendars")
    } catch (error) {
      console.error("Error updating calendar:", error)
      setError(error instanceof Error ? error.message : "An error occurred while updating the calendar")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <LoadingPage text="Loading calendar..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/calendars">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calendars
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
                <Link href="/calendars">Calendars</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/calendars">Calendar</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Calendar</h1>
              <p className="text-gray-600 mt-1">Update calendar details and manage events</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Calendar Details</CardTitle>
                <CardDescription>Update the calendar information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Calendar Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Academic Calendar 2024"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the calendar"
                      rows={3}
                    />
                  </div>

                  {/* Custom Event Types */}
                  <div>
                    <Label>Custom Event Types</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value)}
                        placeholder="e.g., workshop"
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomEventType())}
                      />
                      <Button type="button" onClick={addCustomEventType} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customEventTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="flex items-center space-x-1">
                          <span>{type}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomEventType(type)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <Alert>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Updating..." : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Calendar
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={gotoPrevMonth}>&lt;</Button>
                    <Button type="button" variant="outline" size="sm" onClick={gotoNextMonth}>&gt;</Button>
                    <Input
                      type="number"
                      className="w-24"
                      value={currentYear}
                      onChange={(e) => setYear(parseInt(e.target.value || `${currentYear}`))}
                    />
                  </div>
                </div>
                <CardDescription>Click on a date to add events. Current events: {events.length}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth
                    const isToday = date.toDateString() === new Date().toDateString()
                    const dayEvents = getEventsForDate(date)

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(date)}
                        className={`
                          p-2 min-h-[80px] border rounded-lg relative hover:bg-gray-50 transition-colors
                          ${isCurrentMonth ? "bg-white" : "bg-gray-50"}
                          ${isToday ? "ring-2 ring-blue-500" : ""}
                        `}
                      >
                        <div className={`text-sm font-medium ${isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                          {date.getDate()}
                        </div>
                        {dayEvents.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {dayEvents.slice(0, 2).map((event: CalendarEvent, eventIndex: number) => (
                              <div
                                key={eventIndex}
                                className={`text-xs px-1 py-0.5 rounded truncate ${getEventTypeColor(event.type)}`}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-600">+{dayEvents.length - 2} more</div>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Events List */}
            {events.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>All Events ({events.length})</CardTitle>
                  <CardDescription>Manage your calendar events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {events
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge className={getEventTypeColor(event.type)}>{event.type}</Badge>
                              <span className="font-medium text-sm">{event.title}</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(event.date).toLocaleDateString()}
                              {event.time && ` at ${event.time}`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEvent(event.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Event Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Event</DialogTitle>
              <DialogDescription>
                Create a new event for {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title">Event Title</Label>
                <Input
                  id="event-title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., Mid-term Exams"
                />
              </div>

              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={newEvent.type} onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllEventTypes().map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="event-time">Time (Optional)</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="event-description">Description (Optional)</Label>
                <Textarea
                  id="event-description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Additional details about the event"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addEvent} disabled={!newEvent.title || !newEvent.type}>
                Add Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 