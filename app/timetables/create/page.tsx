"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Plus, Trash2, Home } from "lucide-react"
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
import { useGroups, useUser, useRooms } from "@/hooks/use-app-data"
import { useSubjects } from "@/hooks/use-app-data"
import { useBatches } from "@/hooks/use-app-data"
import { useLabs } from "@/hooks/use-app-data"

interface TimetableSlot {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
  type: string
  title: string
  subjectId?: string
  labId?: string
  faculty: string
  facultyUserId?: string
  room?: string
  batchName?: string
  batchId?: string
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const SLOT_TYPES = [
  { value: "lecture", label: "Lecture", color: "bg-blue-100 text-blue-800" },
  { value: "lab", label: "Lab", color: "bg-green-100 text-green-800" },
  { value: "honors", label: "Honors", color: "bg-purple-100 text-purple-800" },
  { value: "mentoring", label: "Mentoring", color: "bg-orange-100 text-orange-800" },
  { value: "break", label: "Break", color: "bg-gray-100 text-gray-800" },
  { value: "mini-project", label: "Mini Project", color: "bg-teal-100 text-teal-800" },
]

export default function CreateTimetablePage() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { groups } = useGroups()
  const { user } = useUser()
  const { rooms } = useRooms()
  const { subjects } = useSubjects()
  const { batches } = useBatches()
  const { labs } = useLabs()

  const [groupIdToMembers, setGroupIdToMembers] = useState<Record<string, any[]>>({})
  const facultyGroups = useMemo(() => groups, [groups])

  const addSlot = () => {
    const newSlot: TimetableSlot = {
      id: Date.now().toString(),
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      type: "",
      title: "",
      subjectId: undefined,
      labId: undefined,
      faculty: "",
      facultyUserId: undefined,
      room: "none",
      batchName: "none",
      batchId: undefined,
    }
    setSlots([...slots, newSlot])
  }

  const updateSlot = (id: string, field: keyof TimetableSlot, value: string | undefined) => {
    setSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)))
  }

  const updateSlotMany = (id: string, patch: Partial<TimetableSlot>) => {
    setSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)))
  }

  const removeSlot = (id: string) => {
    setSlots(slots.filter((slot) => slot.id !== id))
  }

  const loadMembers = async (groupId: string) => {
    if (!groupId || groupIdToMembers[groupId]) return
    try {
      const res = await fetch(`/api/groups/${groupId}/members`)
      if (!res.ok) return
      const data = await res.json()
      setGroupIdToMembers((prev) => ({ ...prev, [groupId]: data.members || [] }))
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (slots.length === 0) {
      setError("Please add at least one time slot")
      setLoading(false)
      return
    }

    // Validate all slots are complete
    const incompleteSlots = slots.filter((slot) => {
      // Basic required fields for all slot types
      if (!slot.dayOfWeek || !slot.startTime || !slot.endTime || !slot.type) {
        return true
      }
      // For break and mini-project slots, title/faculty are optional
      if (slot.type === "break" || slot.type === "mini-project") {
        return false
      }
      // For other slot types, title required
      if (!slot.title) {
        return true
      }
      return false
    })

    if (incompleteSlots.length > 0) {
      setError("Please complete all time slot fields")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slots: slots.map(({ id, ...slot }) => ({
            ...slot,
            room: slot.room === "none" ? "" : slot.room,
            batchName: slot.batchName === "none" ? "" : slot.batchName
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create timetable")
      }

      router.push("/timetables")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getSlotTypeColor = (type: string) => {
    return SLOT_TYPES.find((t) => t.value === type)?.color || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
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
              <BreadcrumbPage>Create Timetable</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Create New Timetable</CardTitle>
                <CardDescription>Build a structured weekly schedule with time slots</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Timetable Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., TE-IT-C1 Weekly Schedule"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Time Slots</h3>
                    <p className="text-sm text-gray-600">Add weekly recurring time slots</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={addSlot} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Slot
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => {
                        // Add batch slots for Lab type
                        const newSlots = DAYS.map((day, index) => ({
                          id: (Date.now() + index).toString(),
                          dayOfWeek: day,
                          startTime: "09:00",
                          endTime: "10:00",
                          type: "lab",
                          title: "",
                          faculty: "",
                          facultyUserId: undefined,
                          room: "none",
                          batchName: "none",
                        }))
                        setSlots([...slots, ...newSlots])
                      }}
                      variant="outline" 
                      size="sm"
                      className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lab Batch
                    </Button>
                  </div>
                </div>

                {slots.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="text-center py-8">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No time slots added yet</p>
                      <Button
                        type="button"
                        onClick={addSlot}
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-transparent"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Slot
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {slots.map((slot, index) => (
                      <Card key={slot.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Slot {index + 1}</h4>
                            <Button
                              type="button"
                              onClick={() => removeSlot(slot.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label>Day of Week</Label>
                              <Select
                                value={slot.dayOfWeek}
                                onValueChange={(value) => updateSlot(slot.id, "dayOfWeek", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DAYS.map((day) => (
                                    <SelectItem key={day} value={day}>
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Start Time</Label>
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateSlot(slot.id, "startTime", e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>End Time</Label>
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateSlot(slot.id, "endTime", e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Type</Label>
                              <Select value={slot.type} onValueChange={(value) => updateSlot(slot.id, "type", value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SLOT_TYPES.map((type) => (
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
                              <Label>{slot.type === "lab" ? "Lab" : "Subject"}</Label>
                              {slot.type === "lab" ? (
                                <Select
                                  value={slot.labId || ""}
                                  onValueChange={(id) => {
                                     const l = labs.find((x: any) => x._id === id)
                                     updateSlotMany(slot.id, { labId: id, title: l ? l.name : "" })
                                   }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select lab" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {labs.map((l: any) => (
                                      <SelectItem key={l._id} value={l._id}>
                                        {l.name}{l.abbreviation ? ` (${l.abbreviation})` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select
                                  value={slot.subjectId || ""}
                                  onValueChange={(id) => {
                                     const s = subjects.find((x: any) => x._id === id)
                                     updateSlotMany(slot.id, { subjectId: id, title: s ? s.name : "" })
                                   }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select subject" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {subjects.map((s: any) => (
                                      <SelectItem key={s._id} value={s._id}>
                                        {s.name}{s.abbreviation ? ` (${s.abbreviation})` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Room (Optional)</Label>
                              <Select
                                value={slot.room || "none"}
                                onValueChange={(value) => updateSlot(slot.id, "room", value === "none" ? "" : value)}
                                disabled={slot.type === "break" || slot.type === "mini-project"}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a room" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No room assigned</SelectItem>
                                  {rooms.map((room: any) => (
                                    <SelectItem key={room._id} value={room.name}>
                                      {room.name} ({room.type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Batch (Optional)</Label>
                              <Select
                                value={slot.batchId || (slot.batchName || "none")}
                                onValueChange={(value) => {
                                   if (value === "none") {
                                     updateSlotMany(slot.id, { batchId: undefined, batchName: "none" })
                                   } else {
                                     const b = batches.find((x: any) => x._id === value)
                                     updateSlotMany(slot.id, { batchId: value, batchName: b ? b.name : "" })
                                   }
                                 }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select batch" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No batch</SelectItem>
                                  {batches.map((b: any) => (
                                    <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {slot.type !== "break" && slot.type !== "mini-project" && (
                              <div className="space-y-2">
                                <Label>Faculty (link account)</Label>
                                {/* Pick group then member */}
                                <Select
                                  onValueChange={async (groupId) => {
                                    await loadMembers(groupId)
                                    // reset selection
                                    updateSlot(slot.id, "faculty", "")
                                    updateSlot(slot.id, "facultyUserId", undefined)
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select group" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {facultyGroups.map((g: any) => (
                                      <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {/* Members dropdown shows when group selected and loaded */}
                                <Select
                                  onValueChange={(memberJson) => {
                                    const member = JSON.parse(memberJson)
                                    updateSlot(slot.id, "faculty", member.name)
                                    updateSlot(slot.id, "facultyUserId", member._id)
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={slot.faculty ? slot.faculty : "Select faculty member"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(groupIdToMembers).flatMap(([gid, members]) =>
                                      (members as any[])
                                        .filter((m) => m.role === "faculty")
                                        .map((m) => (
                                          <SelectItem key={`${gid}-${m._id}`} value={JSON.stringify({ _id: m._id, name: m.name })}>
                                            {m.name}
                                          </SelectItem>
                                        ))
                                    )}
                                    {user && user.role === 'hod' && (
                                      <SelectItem value={JSON.stringify({ _id: user._id, name: user.name })}>
                                        Assign myself (HOD)
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Removed duplicate type badge for cleaner UI */}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Creating Timetable...</span>
                    </div>
                  ) : (
                    "Create Timetable"
                  )}
                </Button>
                <Button asChild variant="outline" type="button">
                  <Link href="/timetables">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
