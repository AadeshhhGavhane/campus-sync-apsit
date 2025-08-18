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
import { LoadingPage } from "@/components/ui/loading-spinner"
import { useGroups, useUser } from "@/hooks/use-app-data"

interface TimetableSlot {
  dayOfWeek: string
  startTime: string
  endTime: string
  type: string
  title: string
  faculty: string
  facultyUserId?: string
  room?: string
}

interface Timetable {
  _id: string
  name: string
  description: string
  slots: TimetableSlot[]
}

export default function EditTimetablePage() {
  const router = useRouter()
  const params = (require("next/navigation") as any).useParams()
  const timetableId = params.id as string

  const [timetable, setTimetable] = useState<Timetable | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const { groups } = useGroups()
  const { user } = useUser()
  const [groupIdToMembers, setGroupIdToMembers] = useState<Record<string, any[]>>({})

  // Fetch existing timetable data
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await fetch(`/api/timetables/${timetableId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch timetable")
        }
        const data = await response.json()
        setTimetable(data.timetable)
        setFormData({
          name: data.timetable.name,
          description: data.timetable.description || "",
        })
        setSlots((data.timetable.slots || []).map((s: any) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          type: s.type,
          title: s.title || "",
          faculty: s.faculty || "",
          facultyUserId: s.facultyUserId,
          room: s.room,
        })))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch timetable")
      } finally {
        setFetchLoading(false)
      }
    }

    if (timetableId) {
      fetchTimetable()
    }
  }, [timetableId])

  const addSlot = () => {
    setSlots([
      ...slots,
      {
        dayOfWeek: "Monday",
        startTime: "09:00",
        endTime: "10:00",
        type: "lecture",
        title: "",
        faculty: "",
        facultyUserId: undefined,
        room: "",
      },
    ])
  }

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, field: keyof TimetableSlot, value: string | undefined) => {
    const updatedSlots = [...slots]
    updatedSlots[index] = { ...updatedSlots[index], [field]: value }
    setSlots(updatedSlots)
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

    try {
      const response = await fetch(`/api/timetables/${timetableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, slots }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update timetable")
      }

      router.push("/timetables")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <LoadingPage text="Loading timetable..." />
        </div>
      </div>
    )
  }

  if (!timetable) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Timetable not found</h1>
            <Link href="/timetables">
              <Button className="mt-4">Back to Timetables</Button>
            </Link>
          </div>
        </div>
      </div>
    )
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
              <BreadcrumbLink asChild>
                <Link href="/timetables">Timetable</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
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
                <CardTitle className="text-2xl">Edit Timetable</CardTitle>
                <CardDescription>Update the timetable information and slots</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the timetable..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Time Slots */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Time Slots</h3>
                  <Button type="button" onClick={addSlot} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slot
                  </Button>
                </div>

                {slots.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No time slots added yet</p>
                    <Button type="button" onClick={addSlot} variant="outline" size="sm" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Slot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {slots.map((slot, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div>
                            <Label>Day</Label>
                            <Select
                              value={slot.dayOfWeek}
                              onValueChange={(value) => updateSlot(index, "dayOfWeek", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(
                                  (day) => (
                                    <SelectItem key={day} value={day}>
                                      {day}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Type</Label>
                            <Select value={slot.type} onValueChange={(value) => updateSlot(index, "type", value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lecture">Lecture</SelectItem>
                                <SelectItem value="lab">Lab</SelectItem>
                                <SelectItem value="honors">Honors</SelectItem>
                                <SelectItem value="mentoring">Mentoring</SelectItem>
                                <SelectItem value="break">Break</SelectItem>
                                <SelectItem value="mini-project">Mini Project</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Subject/Title</Label>
                            <Input
                              placeholder={
                                slot.type === "break" 
                                  ? "Break (optional)" 
                                  : slot.type === "mini-project"
                                  ? "Mini Project (optional)"
                                  : "e.g., Data Structures"
                              }
                              value={slot.title}
                              onChange={(e) => updateSlot(index, "title", e.target.value)}
                              disabled={slot.type === "break" || slot.type === "mini-project"}
                            />
                          </div>

                          <div>
                            <Label>Room (Optional)</Label>
                            <Input
                              placeholder="e.g., C-305"
                              value={slot.room || ""}
                              onChange={(e) => updateSlot(index, "room", e.target.value)}
                              disabled={slot.type === "break" || slot.type === "mini-project"}
                            />
                          </div>

                          {slot.type !== "break" && slot.type !== "mini-project" && (
                            <>
                              <div className="md:col-span-3">
                                <Label>Faculty (link account)</Label>
                                <Select
                                  onValueChange={async (groupId) => {
                                    await loadMembers(groupId)
                                    updateSlot(index, "faculty", "")
                                    updateSlot(index, "facultyUserId", undefined)
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select group" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {groups.map((g: any) => (
                                      <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Select
                                  onValueChange={(memberJson) => {
                                    const member = JSON.parse(memberJson)
                                    updateSlot(index, "faculty", member.name)
                                    updateSlot(index, "facultyUserId", member._id)
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
                            </>
                          )}
                        </div>
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
                  {loading ? "Updating Timetable..." : "Update Timetable"}
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