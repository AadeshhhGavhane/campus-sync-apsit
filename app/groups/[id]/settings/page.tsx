"use client"

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Users, Settings, Save, RefreshCw, Trash2, Shield, UserPlus, Crown, Home } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toast } from "sonner"
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner"

interface GroupMember {
  _id: string
  name: string
  email: string
  role: string
  departmentName: string
  joinedAt: Date
  permission: string
}

interface User {
  _id: string
  name: string
  email: string
  role: "hod" | "faculty" | "student"
  departmentName: string
}

export default function GroupSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const [group, setGroup] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultAccess: "viewer"
  })
  const [members, setMembers] = useState<GroupMember[]>([])
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get user data
        const userResponse = await fetch('/api/auth/me')
        if (!userResponse.ok) {
          router.push('/auth/login')
          return
        }
        const userData = await userResponse.json()
        setUser(userData.user)

        // Get group data
        const { id } = await params
        const groupResponse = await fetch(`/api/groups/${id}`)
        if (!groupResponse.ok) {
          router.push('/groups')
          return
        }
        const groupData = await groupResponse.json()
        setGroup(groupData.group)
        setFormData({
          name: groupData.group.name,
          description: groupData.group.description || "",
          defaultAccess: groupData.group.defaultAccess || "viewer"
        })

        // Get members data
        const membersResponse = await fetch(`/api/groups/${id}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setMembers(membersData.members)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/groups')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params, router])

  if (loading) {
    const fallbackUser = {
      _id: '',
      name: '',
      email: '',
      role: 'student' as const,
      departmentName: ''
    }
    
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <LoadingPage text="Loading group settings..." />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!group || !user || user.role !== "hod") {
    return null
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)

    try {
      const { id } = await params
      const response = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          defaultAccess: formData.defaultAccess,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update group")
      }

      toast.success("Group updated successfully!")
      
      // Update local state
      setGroup({
        ...group,
        name: formData.name,
        description: formData.description,
        defaultAccess: formData.defaultAccess
      })
    } catch (error) {
      console.error("Error updating group:", error)
      setError(error instanceof Error ? error.message : "An error occurred while updating the group")
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateCode = async () => {
    try {
      const { id } = await params
      const response = await fetch(`/api/groups/${id}/regenerate-code`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to regenerate code")
      }

      const { newCode } = await response.json()
      
      // Update local state
      setGroup({
        ...group,
        joinCode: newCode
      })
      
      toast.success("Join code regenerated successfully!")
      setShowRegenerateDialog(false)
    } catch (error) {
      console.error("Error regenerating code:", error)
      toast.error("Failed to regenerate join code")
    }
  }

  const handleUpdatePermission = async (memberId: string, newPermission: string) => {
    try {
      const { id } = await params
      const response = await fetch(`/api/groups/${id}/members/${memberId}/permission`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permission: newPermission }),
      })

      if (!response.ok) {
        throw new Error("Failed to update permission")
      }

      // Update local state
      setMembers(members.map(member => 
        member._id === memberId 
          ? { ...member, permission: newPermission }
          : member
      ))
      
      toast.success("Permission updated successfully!")
    } catch (error) {
      console.error("Error updating permission:", error)
      toast.error("Failed to update permission")
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { id } = await params
      const response = await fetch(`/api/groups/${id}/members/${memberId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove member")
      }

      // Update local state
      setMembers(members.filter(member => member._id !== memberId))
      
      toast.success("Member removed successfully!")
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error("Failed to remove member")
    }
  }

  const handleDeleteGroup = async () => {
    if (!confirm('Delete this group? This will remove memberships and unassign it from calendars/timetables.')) return
    try {
      const { id } = await params
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete group')
      }
      toast.success('Group deleted successfully')
      router.push('/groups')
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Failed to delete group')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/groups/${group._id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Group
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
                  <Link href="/groups">Groups</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/groups/${group._id}`}>{group.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Settings className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Group Settings</h1>
                <p className="text-gray-600 mt-1">Manage {group.name} settings and permissions</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Group Information */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Group Information</CardTitle>
                  <CardDescription>Update group details and settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter group name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the purpose of this group"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="defaultAccess">Default Member Access</Label>
                    <Select 
                      value={formData.defaultAccess} 
                      onValueChange={(value) => setFormData({ ...formData, defaultAccess: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center space-x-2">
                            <UserPlus className="h-4 w-4" />
                            <span>Viewer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="contributor">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span>Contributor</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      New members will get this permission level by default
                    </p>
                  </div>

                  {error && (
                    <Alert>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button onClick={handleDeleteGroup} variant="outline" className="w-full text-red-600 hover:text-red-700">
                    Delete Group
                  </Button>
                </CardContent>
              </Card>

              {/* Join Code Management */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Join Code</CardTitle>
                  <CardDescription>Manage the group invitation code</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Current Code</p>
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    </div>
                    <p className="text-xl font-mono font-bold text-blue-600">{group.joinCode}</p>
                    <p className="text-xs text-gray-500 mt-1">Share this code to invite new members</p>
                  </div>

                  <Button 
                    onClick={() => setShowRegenerateDialog(true)} 
                    variant="outline" 
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Code
                  </Button>

                  <div className="text-xs text-gray-500 text-center">
                    ⚠️ Regenerating will invalidate the old code. Make sure to share the new code with existing members.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Member Management */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Member Management</CardTitle>
                  <CardDescription>Manage member permissions and access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.length > 0 ? (
                      members.map((member) => (
                        <div key={member._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {member.role === "hod" && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className="font-medium text-sm">{member.name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {member.role}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={member.permission} 
                              onValueChange={(value) => handleUpdatePermission(member._id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">
                                  <div className="flex items-center space-x-2">
                                    <UserPlus className="h-4 w-4" />
                                    <span>Viewer</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="contributor">
                                  <div className="flex items-center space-x-2">
                                    <Shield className="h-4 w-4" />
                                    <span>Contributor</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {member.role !== "hod" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member._id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No members found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Regenerate Code Dialog */}
          <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regenerate Join Code</DialogTitle>
                <DialogDescription>
                  This will create a new join code and invalidate the old one. Are you sure you want to continue?
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600">
                  <strong>Current code:</strong> {group.joinCode}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  After regeneration, you'll need to share the new code with all existing members.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRegenerateCode} className="bg-orange-600 hover:bg-orange-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Code
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  )
} 