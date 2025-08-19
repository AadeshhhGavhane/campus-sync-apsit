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
import { useGroups, useUser, useRooms } from "@/hooks/use-app-data"
import { useSubjects } from "@/hooks/use-app-data"
import { useBatches } from "@/hooks/use-app-data"
import { useLabs } from "@/hooks/use-app-data"

interface TimetableSlot {
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
  groupId?: string // Add groupId to track which group is selected
  batchName?: string
  batchId?: string
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
  const { rooms } = useRooms()
  const { subjects } = useSubjects()
  const { batches } = useBatches()
  const { labs } = useLabs()
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

        // Auto-load members for all accessible groups so faculty can be selected
        for (const group of groups) {
          if (group._id) {
            await loadMembers(group._id)
          }
        }

        // Set initial slots
        setSlots((data.timetable.slots || []).map((s: any) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          type: s.type,
          title: s.title || "",
          subjectId: s.subjectId,
          labId: s.labId,
          faculty: s.faculty || "",
          facultyUserId: s.facultyUserId,
          room: s.room || "none",
          groupId: s.groupId, // Initialize groupId
          batchName: s.batchName || "none",
          batchId: s.batchId,
        })))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch timetable")
      } finally {
        setFetchLoading(false)
      }
    }

    if (timetableId && groups.length > 0) {
      fetchTimetable()
    }
  }, [timetableId, groups])

  // Determine groupId for existing slots after members are loaded
  useEffect(() => {
    if (slots.length > 0 && Object.keys(groupIdToMembers).length > 0) {
      const updatedSlots = [...slots]
      let hasChanges = false
      
      for (let i = 0; i < updatedSlots.length; i++) {
        const slot = updatedSlots[i]
        if (slot.facultyUserId && !slot.groupId) {
          // Find which group this faculty member belongs to
          for (const [groupId, members] of Object.entries(groupIdToMembers)) {
            const member = (members as any[]).find((m: any) => m._id === slot.facultyUserId)
            if (member) {
              updatedSlots[i] = { ...slot, groupId }
              hasChanges = true
              break
            }
          }
        }
      }
      
      if (hasChanges) {
        setSlots(updatedSlots)
      }
    }
  }, [slots, groupIdToMembers])

  const addSlot = () => {
    setSlots((prev) => {
      if (prev.length === 0) {
        return [
          {
            dayOfWeek: "Monday",
            startTime: "09:00",
            endTime: "10:00",
            type: "lecture",
            title: "",
            subjectId: undefined,
            labId: undefined,
            faculty: "",
            facultyUserId: undefined,
            room: "none",
            groupId: undefined,
            batchName: "none",
            batchId: undefined,
          },
        ]
      }
      const last = prev[prev.length - 1]
      const duplicated = { ...last }
      return [...prev, duplicated]
    })
  }

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, field: keyof TimetableSlot, value: string | undefined) => {
    setSlots((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const updateSlotMany = (index: number, patch: Partial<TimetableSlot>) => {
    setSlots((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...patch }
      return updated
    })
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
        body: JSON.stringify({ 
          ...formData, 
          slots: slots.map(slot => ({
            ...slot,
            room: slot.room === "none" ? "" : slot.room,
            batchName: slot.batchName === "none" ? "" : slot.batchName
          }))
        }),
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
                  <div className="flex gap-2">
                    <Button type="button" onClick={addSlot} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Slot
                    </Button>
                  </div>
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
                      <Card key={index} className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Slot {index + 1}</h4>
                          <Button
                            type="button"
                            onClick={() => removeSlot(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                          <div className="lg:col-span-2">
                             <Label>{slot.type === "lab" ? "Lab" : "Subject"}</Label>
                             {slot.type === "lab" ? (
                               <Select
                                 value={slot.labId || ""}
                                 onValueChange={(id) => {
                                   const l = labs.find((x: any) => x._id === id)
                                   updateSlotMany(index, { labId: id, title: l ? l.name : "" })
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
                                   updateSlotMany(index, { subjectId: id, title: s ? s.name : "" })
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

                          <div>
                            <Label>Room (Optional)</Label>
                            <Select
                              value={slot.room || "none"}
                              onValueChange={(value) => updateSlot(index, "room", value === "none" ? "" : value)}
                              disabled={slot.type === "break" || slot.type === "mini-project"}
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

                          <div>
                            <Label>Batch (Optional)</Label>
                            <Select
                              value={slot.batchId || (slot.batchName || "none")}
                              onValueChange={(value) => {
                                if (value === "none") {
                                  updateSlotMany(index, { batchId: undefined, batchName: "none" })
                                } else {
                                  const b = batches.find((x: any) => x._id === value)
                                  updateSlotMany(index, { batchId: value, batchName: b ? b.name : "" })
                                }
                              }}
                              disabled={slot.type === "break" || slot.type === "mini-project"}
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
                            <>
                              <div className="md:col-span-2 lg:col-span-3">
                                <Label>Faculty (link account)</Label>
                                <Select
                                  value={slot.groupId || ""}
                                  onValueChange={async (groupId) => {
                                     await loadMembers(groupId)
                                     updateSlotMany(index, { faculty: "", facultyUserId: undefined, groupId })
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
                                  value={slot.facultyUserId || ""}
                                  onValueChange={(memberId) => {
                                    if (!memberId) return
                                    const members = slot.groupId ? (groupIdToMembers[slot.groupId] as any[] | undefined) : undefined
                                    const found = members?.find((m: any) => m._id === memberId)
                                    const selectedName = found ? found.name : (user && user._id === memberId ? user.name : "")
                                    if (!selectedName) return
                                    updateSlotMany(index, { faculty: selectedName, facultyUserId: memberId })
                                    // If HOD assigns themselves and no group is selected, set a group automatically
                                    if (user && user.role === 'hod' && memberId === user._id && !slot.groupId) {
                                      const hodGroup = groups.find((g: any) => g._id && groupIdToMembers[g._id]?.some((m: any) => m._id === user._id))
                                      if (hodGroup) {
                                        updateSlot(index, "groupId", hodGroup._id)
                                      } else if (groups.length > 0) {
                                        updateSlot(index, "groupId", groups[0]._id)
                                      }
                                    }
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
                                      // HOD can assign themselves even without selecting a group
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