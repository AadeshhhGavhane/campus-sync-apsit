"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Plus, Eye, MoreVertical, Home, Pencil, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import TimetableAssignmentClient from "@/components/timetable-assignment-client"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { CardSkeleton } from "@/components/ui/skeleton"
import { useUser, useTimetables, useGroups } from "@/hooks/use-app-data"

interface TimetableSlot {
  dayOfWeek: string
  startTime: string
  endTime: string
  type: string
  title?: string
}

interface Timetable {
  _id: string
  name: string
  description?: string
  slots?: TimetableSlot[]
  assignedGroups?: string[]
}

interface Group {
  _id: string
  name: string
  description: string
  joinCode: string
}

function TimetablesLoading() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function TimetablesPageClient() {
  const { user, isLoading: userLoading } = useUser()
  const { timetables, isLoading: timetablesLoading } = useTimetables()
  const { groups } = useGroups()

  // Show loading if user is not loaded yet
  if (userLoading || !user) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <TimetablesLoading />
        </div>
      </DashboardLayout>
    )
  }

  const formatTimeRange = (start: string, end: string) => `${start} - ${end}`

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-in fade-in-0 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/home" className="flex items-center hover:text-blue-600 transition-colors">
                      <Home className="h-4 w-4 mr-1" />
                      Dashboard
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-blue-600 font-medium">Timetables</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Class Timetables</h1>
            <p className="text-gray-600 mt-1">Manage weekly schedules and class timings</p>
          </div>
          
          {user.role === "hod" && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105">
              <Link href="/timetables/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Timetable
              </Link>
            </Button>
          )}
        </div>

        {/* Content */}
        {timetablesLoading ? (
          <TimetablesLoading />
        ) : timetables.length === 0 ? (
          <Card className="text-center py-12 animate-in fade-in-0 duration-500">
            <CardContent>
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timetables Yet</h3>
              <p className="text-gray-600 mb-6">
                {user.role === "hod" 
                  ? "Create your first timetable to organize class schedules and manage time slots."
                  : "No timetables have been shared with your groups yet. Contact your HOD to get access."}
              </p>
              {user.role === "hod" && (
                <Button asChild>
                  <Link href="/timetables/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Timetable
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timetables.map((timetable: Timetable, index: number) => (
              <Card 
                key={timetable._id} 
                className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group animate-in fade-in-0 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors duration-200">
                        {timetable.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {timetable.description || "Weekly class schedule"}
                      </CardDescription>
                    </div>
                    
                    {(user.role === "hod" || (timetable.assignedGroups || []).some((gid) => groups.some((g: any) => g._id === gid && (g as any).userPermission === 'contributor'))) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/timetables/${timetable._id}/edit`} className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" />
                              Edit Timetable
                            </Link>
                          </DropdownMenuItem>
                          {user.role === 'hod' && (
                            <DropdownMenuItem
                              onSelect={async (e) => {
                                e.preventDefault()
                                if (!confirm('Delete this timetable? This action cannot be undone.')) return
                                const res = await fetch(`/api/timetables/${timetable._id}`, { method: 'DELETE' })
                                if (!res.ok) {
                                  const data = await res.json().catch(() => ({}))
                                  alert(data.error || 'Failed to delete timetable')
                                  return
                                }
                                window.location.reload()
                              }}
                            >
                              <div className="flex items-center gap-2 text-red-600">
                                <Trash2 className="h-4 w-4" />
                                Delete Timetable
                              </div>
                            </DropdownMenuItem>
                          )}
                          {user.role === 'hod' && (
                            <TimetableAssignmentClient 
                              timetable={{
                                _id: timetable._id,
                                name: timetable.name,
                                assignedGroups: (timetable.assignedGroups || []).map(String)
                              }}
                              groups={groups.map((g: Group) => ({
                                _id: g._id,
                                name: g.name,
                                description: g.description,
                                joinCode: g.joinCode
                              }))}
                            />
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Time Slots</span>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        {timetable.slots?.length || 0} slots
                      </Badge>
                    </div>
                    
                    {timetable.slots && timetable.slots.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Weekly Schedule:</p>
                        <div className="space-y-1">
                          {timetable.slots.slice(0, 3).map((slot: TimetableSlot, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 truncate">
                                {slot.dayOfWeek} - {slot.title || slot.type}
                              </span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {formatTimeRange(slot.startTime, slot.endTime)}
                              </Badge>
                            </div>
                          ))}
                          {timetable.slots.length > 3 && (
                            <p className="text-xs text-gray-500">+{timetable.slots.length - 3} more slots</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <Button asChild variant="outline" className="w-full group-hover:bg-blue-50 group-hover:border-blue-300 transition-colors">
                      <Link href={`/timetables/${timetable._id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Timetable
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 