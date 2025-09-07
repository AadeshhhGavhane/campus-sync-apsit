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
  groupId?: string
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
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
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
    setSlots((prev) => {
      const day = DAYS[currentDayIndex]
      const daySlots = prev.filter((s) => s.dayOfWeek === day)
      if (daySlots.length === 0) {
        const first: TimetableSlot = {
          id: Date.now().toString(),
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "10:00",
          type: "lecture",
          title: "",
          subjectId: undefined,
          labId: undefined,
          faculty: "",
          facultyUserId: undefined,
          room: "none",
          batchName: "none",
          batchId: undefined,
          groupId: undefined,
        }
        return [...prev, first]
      }
      const lastOfDay = daySlots[daySlots.length - 1]
      const duplicated: TimetableSlot = { ...lastOfDay, id: Date.now().toString(), dayOfWeek: day }
      return [...prev, duplicated]
    })
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
        // For mini-project, room is mandatory; for break, room is not mandatory
        if (slot.type === "mini-project") {
          if (!slot.room || slot.room === "none" || slot.room.trim() === "") return true
        }
        return false
      }
      // For other slot types, title required
      if (!slot.title) {
        return true
      }
      // Room is mandatory for lecture, lab, honors
      if (["lecture", "lab", "honors"].includes(slot.type)) {
        if (!slot.room || slot.room === "none" || slot.room.trim() === "") return true
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
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentDayIndex((i) => (i + 6) % 7)}>
                    Previous
                  </Button>
                  <div className="text-sm font-medium">Day: {DAYS[currentDayIndex]}</div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentDayIndex((i) => (i + 1) % 7)}>
                    Next
                  </Button>
                </div>

                {slots.filter((s) => s.dayOfWeek === DAYS[currentDayIndex]).length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="text-center py-8">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No time slots for {DAYS[currentDayIndex]} yet</p>
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
                    {slots.filter((s) => s.dayOfWeek === DAYS[currentDayIndex]).map((slot, index) => (
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
                            {/* Day is controlled by the toggle; hidden in slot */}
                            <input type="hidden" value={slot.dayOfWeek} />

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
                              <Select
                                value={slot.type}
                                onValueChange={(value) => {
                                  // Update type and clear fields that shouldn't exist for this type
                                  updateSlot(slot.id, "type", value)
                                  if (value === "break" || value === "mentoring") {
                                    updateSlotMany(slot.id, {
                                      title: "",
                                      subjectId: undefined,
                                      labId: undefined,
                                      faculty: "",
                                      facultyUserId: undefined,
                                      room: "",
                                      batchId: undefined,
                                      batchName: "none",
                                    })
                                  } else if (value === "mini-project") {
                                    updateSlotMany(slot.id, {
                                      title: "",
                                      subjectId: undefined,
                                      labId: undefined,
                                      faculty: "",
                                      facultyUserId: undefined,
                                      batchId: undefined,
                                      batchName: "none",
                                    })
                                  } else if (value !== "lab") {
                                    // Leaving lab clears labId
                                    updateSlotMany(slot.id, { labId: undefined })
                                  }
                                }}
                              >
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

                            {(slot.type !== "break" && slot.type !== "mini-project" && slot.type !== "mentoring") && (
                              <div className="lg:col-span-2 space-y-2">
                                <Label>{slot.type === "lab" ? "Lab" : "Subject"}</Label>
                                {slot.type === "lab" ? (
                                  <Select
                                    value={slot.labId || ""}
                                    onValueChange={(id) => {
                                      const l = labs.find((x: any) => x._id === id)
                                      updateSlotMany(slot.id, { labId: id, title: l ? l.name : "" })
                                    }}
                                  >
                                    <SelectTrigger className="truncate">
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
                                    <SelectTrigger className="truncate">
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
                            )}


                            {(slot.type !== "break" && slot.type !== "mentoring") && (
                              <div className="space-y-2">
                                <Label>Room (Optional)</Label>
                                <Select
                                  value={slot.room || "none"}
                                  onValueChange={(value) => updateSlot(slot.id, "room", value === "none" ? "" : value)}
                                >
                                  <SelectTrigger className="truncate">
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
                            )}

                            {(slot.type !== "break" && slot.type !== "mentoring" && slot.type !== "mini-project") && (
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
                            )}

                            {(slot.type === "lecture" || slot.type === "lab" || slot.type === "honors") && (
                              <div className="space-y-2">
                                <Label>Faculty (link account)</Label>
                                {/* Pick group then member */}
                                <Select
                                  value={slot.groupId || ""}
                                  onValueChange={async (groupId) => {
                                    await loadMembers(groupId)
                                    updateSlot(slot.id, "groupId", groupId)
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
                                  value={slot.facultyUserId || ""}
                                  onValueChange={(memberId) => {
                                    if (!memberId) return
                                    const members = slot.groupId ? (groupIdToMembers[slot.groupId] as any[] | undefined) : undefined
                                    const found = members?.find((m: any) => m._id === memberId)
                                    const selectedName = found ? found.name : (user && user._id === memberId ? user.name : "")
                                    if (!selectedName) return
                                    updateSlotMany(slot.id, { faculty: selectedName, facultyUserId: memberId })
                                  }}
                                  disabled={!slot.groupId && !(user && user.role === 'hod')}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={slot.faculty ? slot.faculty : "Select faculty member"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {slot.groupId && groupIdToMembers[slot.groupId] ? (
                                      <>
                                        {/* Ensure currently selected value is visible even if not in the fetched list */}
                                        {slot.facultyUserId && !(groupIdToMembers[slot.groupId] as any[]).some((m: any) => m._id === slot.facultyUserId) && (
                                          <SelectItem value={slot.facultyUserId}>
                                            {slot.faculty || "Selected faculty"}
                                          </SelectItem>
                                        )}
                                        {(groupIdToMembers[slot.groupId] as any[])
                                          .filter((m) => m.role === "faculty")
                                          .map((m) => (
                                            <SelectItem key={m._id} value={m._id}>
                                              {m.name}
                                            </SelectItem>
                                          ))}
                                        {user && user.role === 'hod' && (
                                          <SelectItem value={user._id}>
                                            Assign myself (HOD)
                                          </SelectItem>
                                        )}
                                      </>
                                    ) : user && user.role === 'hod' ? (
                                      <SelectItem value={user._id}>
                                        Assign myself (HOD)
                                      </SelectItem>
                                    ) : (
                                      <SelectItem value="" disabled>
                                        Select a group first
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
