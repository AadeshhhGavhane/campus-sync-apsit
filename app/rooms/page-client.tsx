"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit, Trash2, Building2 } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useRooms } from "@/hooks/use-app-data"

interface Room {
  _id: string
  name: string
  type: string
  organizationId: string
  createdBy: string
  createdAt: string
}

interface RoomsPageClientProps {
  rooms: Room[]
}

const ROOM_TYPES = [
  "Classroom",
  "Lab", 
  "Seminar Hall",
  "Cabin",
  "Office"
]

export default function RoomsPageClient({ rooms: initialRooms }: RoomsPageClientProps) {
  const { rooms: cachedRooms } = useRooms()
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: ""
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Hydrate from cache/store for instant navigation
  useEffect(() => {
    if (cachedRooms && cachedRooms.length > 0) {
      setRooms(cachedRooms as any)
    }
  }, [cachedRooms])

  const resetForm = () => {
    setFormData({ name: "", type: "" })
    setError("")
    setEditingRoom(null)
    setShowCreateForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = editingRoom ? `/api/rooms/${editingRoom._id}` : "/api/rooms"
      const method = editingRoom ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save room")
      }

      if (editingRoom) {
        // Update existing room
        setRooms(rooms.map(room => 
          room._id === editingRoom._id 
            ? { ...room, ...formData }
            : room
        ))
      } else {
        // Add new room
        setRooms([...rooms, data.room])
      }

      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setFormData({ name: room.name, type: room.type })
    setShowCreateForm(true)
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete room")
      }

      setRooms(rooms.filter(room => room._id !== roomId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete room")
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/home">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Rooms</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
              <p className="text-gray-600 mt-2">Manage classrooms, labs, and other facilities</p>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </div>

          {showCreateForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>
                  {editingRoom ? "Edit Room" : "Add New Room"}
                </CardTitle>
                <CardDescription>
                  {editingRoom ? "Update room information" : "Create a new room in your organization"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Room Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., C-305, Lab-101"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Room Type</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select room type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <LoadingSpinner className="h-4 w-4" />
                      ) : (
                        editingRoom ? "Update Room" : "Create Room"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(room)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(room._id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    Type: <span className="font-medium">{room.type}</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {rooms.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms yet</h3>
                <p className="text-gray-600 mb-4">
                  Get started by adding your first room to manage facilities and resources.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Room
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 