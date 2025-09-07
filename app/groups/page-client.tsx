"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Settings, Eye, Home } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import CopyButton from "@/components/copy-button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { CardSkeleton } from "@/components/ui/skeleton"
import { useUser, useGroups, useCalendars, useTimetables } from "@/hooks/use-app-data"

interface Group {
  _id: string
  name: string
  description?: string
  joinCode: string
  members?: any[]
  assignedTimetables?: string[]
  assignedCalendars?: string[]
  membersCount?: number
}

function GroupsLoading() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function GroupsPageClient() {
  const { user, isLoading: userLoading } = useUser()
  const { groups, isLoading: groupsLoading } = useGroups()
  const { timetables } = useTimetables()
  const { calendars } = useCalendars()

  // Show loading if user is not loaded yet
  if (userLoading || !user) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <GroupsLoading />
        </div>
      </DashboardLayout>
    )
  }

  const countTimetablesForGroup = (groupId: string) =>
    timetables.filter((t: any) => (t.assignedGroups || []).map(String).includes(String(groupId))).length

  const countCalendarsForGroup = (groupId: string) =>
    calendars.filter((c: any) => (c.assignedGroups || []).map(String).includes(String(groupId))).length

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
                  <BreadcrumbPage className="text-blue-600 font-medium">Groups</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">
              {user.role === "hod" ? "Manage Groups" : "My Groups"}
            </h1>
            <p className="text-gray-600 mt-1">
              {user.role === "hod"
                ? "Create and manage groups for your department"
                : "Groups you're part of and their activities"}
            </p>
          </div>
          
          {user.role === "hod" && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105">
              <Link href="/groups/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Link>
            </Button>
          )}
        </div>

        {/* Content */}
        {groupsLoading ? (
          <GroupsLoading />
        ) : groups.length === 0 ? (
          <Card className="text-center py-12 animate-in fade-in-0 duration-500">
            <CardContent>
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {user.role === "hod" ? "No Groups Created" : "No Groups Joined"}
              </h3>
              <p className="text-gray-600 mb-6">
                {user.role === "hod"
                  ? "Create your first group to organize students and manage activities."
                  : "You haven't joined any groups yet. Use a join code to get started."}
              </p>
              {user.role === "hod" ? (
                <Button asChild>
                  <Link href="/groups/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Group
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/join">
                    <Plus className="h-4 w-4 mr-2" />
                    Join a Group
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group: Group, index: number) => (
              <Card 
                key={group._id} 
                className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group animate-in fade-in-0 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors duration-200">
                        {group.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {group.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {(typeof group.membersCount === 'number' ? group.membersCount : (group.members?.length || 0))} members
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Join Code */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Join Code</p>
                          <p className="text-lg font-mono font-bold text-blue-600">
                            {group.joinCode}
                          </p>
                        </div>
                        <CopyButton text={group.joinCode} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="font-semibold text-green-700">
                          {countTimetablesForGroup(group._id)}
                        </p>
                        <p className="text-green-600">Timetables</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded-lg">
                        <p className="font-semibold text-purple-700">
                          {countCalendarsForGroup(group._id)}
                        </p>
                        <p className="text-purple-600">Calendars</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button asChild variant="outline" size="sm" className="flex-1 group-hover:bg-blue-50 group-hover:border-blue-300 transition-colors">
                        <Link href={`/groups/${group._id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                      {user.role === "hod" && (
                        <Button asChild variant="outline" size="sm" className="group-hover:bg-gray-50 transition-colors">
                          <Link href={`/groups/${group._id}/settings`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Join Group CTA for students/faculty */}
        {user.role !== "hod" && groups.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 animate-in fade-in-0 duration-500">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Want to join more groups?</h3>
                <p className="text-blue-700">Get a join code from your instructor to access more groups.</p>
              </div>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/join">
                  <Plus className="h-4 w-4 mr-2" />
                  Join Group
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
} 