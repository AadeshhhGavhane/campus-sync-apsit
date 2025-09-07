import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Users, Calendar, Clock, Settings, UserPlus, Crown, Shield, Home } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import CopyButton from "@/components/copy-button"
import { ObjectId } from "mongodb"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import LeaveGroupButton from "@/components/leave-group-button"

interface GroupMember {
  _id: string
  name: string
  email: string
  role: string
  departmentName: string
  joinedAt: Date
  permission: string
}

export default async function GroupViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { id } = await params
  const db = await getDatabase()
  
  // Get group details
  const group = await db.collection("groups").findOne({ _id: new ObjectId(id) })
  
  if (!group) {
    redirect("/groups")
  }

  // Check access permissions
  let hasAccess = false
  let isOwner = false
  
  if (user.role === "hod") {
    // HOD can access groups in their organization
    if (user.organizationId) {
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId
      hasAccess = group.organizationId.equals(orgId)
      isOwner = group.createdBy.equals(new ObjectId(user._id))
    }
  } else {
    // Students/Faculty can only access groups they're members of
    const membership = await db.collection("memberships").findOne({ 
      userId: new ObjectId(user._id),
      groupId: new ObjectId(id)
    })
    hasAccess = !!membership
  }

  if (!hasAccess) {
    redirect("/groups")
  }

  // Get all members of the group
  const memberships = await db.collection("memberships")
    .find({ groupId: new ObjectId(id) })
    .toArray()

  const memberIds = memberships.map(m => m.userId)
  const members: GroupMember[] = []

  if (memberIds.length > 0) {
    const users = await db.collection("users")
      .find({ _id: { $in: memberIds } })
      .toArray()

    // Combine user data with membership data
    members.push(...users.map(user => {
      const membership = memberships.find(m => m.userId.equals(user._id))
      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        departmentName: user.departmentName,
        joinedAt: membership?.joinedAt || new Date(),
        permission: membership?.permission || 'viewer'
      }
    }))
  }

  // Get group statistics
  const timetablesCount = await db.collection("timetables")
    .countDocuments({ assignedGroups: new ObjectId(id) })
  
  const calendarsCount = await db.collection("calendars")
    .countDocuments({ assignedGroups: new ObjectId(id) })

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/groups">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Groups
                </Link>
              </Button>
            </div>
            {isOwner && (
              <Button asChild>
                <Link href={`/groups/${id}/settings`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Group Settings
                </Link>
              </Button>
            )}
            {!isOwner && (
              <LeaveGroupButton groupId={String(id)} userId={String(user!._id)} />
            )}
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
                  <Link href="/groups">Groups</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{group.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Group Info */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                {group.description && <p className="text-gray-600 mt-1">{group.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{members.length} members</span>
              <span>•</span>
              <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>Default Access: {group.defaultAccess}</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-gray-500 mt-1">Active participants</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Timetables</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timetablesCount}</div>
                <p className="text-xs text-gray-500 mt-1">Assigned schedules</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Calendars</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calendarsCount}</div>
                <p className="text-xs text-gray-500 mt-1">Event calendars</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Members List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Group Members</CardTitle>
                  <CardDescription>All members and their permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.length > 0 ? (
                      members.map((member) => (
                        <div key={member._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-gray-900">{member.name}</p>
                                {member.role === "hod" && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span>{member.email}</span>
                                <span>•</span>
                                <span>{member.departmentName}</span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {member.role}
                                </Badge>
                                <Badge 
                                  variant={member.permission === 'contributor' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {member.permission === 'contributor' ? (
                                    <Shield className="h-3 w-3 mr-1" />
                                  ) : (
                                    <UserPlus className="h-3 w-3 mr-1" />
                                  )}
                                  {member.permission}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No members yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Group Details */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Group Details</CardTitle>
                  <CardDescription>Information and join code</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Join Code */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Join Code</p>
                      <CopyButton text={group.joinCode} />
                    </div>
                    <p className="text-xl font-mono font-bold text-blue-600">{group.joinCode}</p>
                    <p className="text-xs text-gray-500 mt-1">Share this code to invite new members</p>
                  </div>

                  {/* Group Info */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Created By</p>
                      <p className="text-sm text-gray-600">{group.createdBy ? "HOD" : "System"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Default Access</p>
                      <Badge variant="secondary" className="text-xs">
                        {group.defaultAccess}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Created</p>
                      <p className="text-sm text-gray-600">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>


                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 