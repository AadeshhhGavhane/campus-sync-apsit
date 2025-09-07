"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Plus, Trash2, X, Home } from "lucide-react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

export default function CreateCalendarPage() {
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
  const router = useRouter()

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
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          events: events.map(({ id, ...event }) => event), // Remove temporary id
          customEventTypes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create calendar")
      }

      router.push("/calendars")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
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
              <BreadcrumbPage>Create Calendar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Create New Calendar</CardTitle>
                    <CardDescription>Set up an event calendar for your groups</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Calendar Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., Academic Year 2024-25"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this calendar..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Custom Event Types */}
                <div className="space-y-4">
                  <div>
                    <Label>Custom Event Types</Label>
                    <p className="text-sm text-gray-600">Add custom event types beyond the defaults</p>
                  </div>

                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter custom event type"
                      value={newEventType}
                      onChange={(e) => setNewEventType(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addCustomEventType()}
                    />
                    <Button type="button" onClick={addCustomEventType} variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {customEventTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Events List */}
            <Card>
              <CardHeader>
                <CardTitle>Added Events ({events.length})</CardTitle>
                <CardDescription>Events you've added to this calendar</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">
                    No events added yet. Click on calendar dates to add events.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {events
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge className={getEventTypeColor(event.type)}>{event.type}</Badge>
                            <div>
                              <div className="font-medium">{event.title}</div>
                              <div className="text-sm text-gray-600">
                                {new Date(event.date).toLocaleDateString()}
                                {event.time && ` at ${event.time}`}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeEvent(event.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendar Section */}
          <div>
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
                <CardDescription>Click on dates to add events</CardDescription>
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
                        type="button"
                        onClick={() => handleDateClick(date)}
                        className={`
                          p-2 min-h-[60px] text-left border rounded-lg transition-colors relative
                          ${isCurrentMonth ? "bg-white hover:bg-blue-50" : "bg-gray-50 text-gray-400"}
                          ${isToday ? "ring-2 ring-blue-500" : ""}
                        `}
                      >
                        <div className="text-sm font-medium">{date.getDate()}</div>
                        {dayEvents.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
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

            {/* Submit Section */}
            <div className="mt-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4">
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Creating Calendar...</span>
                    </div>
                  ) : (
                    "Create Calendar"
                  )}
                </Button>
                <Button asChild variant="outline" type="button">
                  <Link href="/calendars">Cancel</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Event Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Event</DialogTitle>
              <DialogDescription>
                Add an event for {selectedDate && new Date(selectedDate).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Event Title</Label>
                <Input
                  placeholder="Enter event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={newEvent.type} onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllEventTypes().map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <Badge className={type.color}>{type.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time (Optional)</Label>
                <Input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Event description..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={2}
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
