import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const db = await getDatabase()
    
    // Check if group exists
    const group = await db.collection("groups").findOne({ _id: new ObjectId(id) })
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check access permissions
    if (user.role === "hod") {
      // HOD can access groups in their organization
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId

      if (!group.organizationId.equals(orgId)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    } else {
      // Students/Faculty can only access groups they're members of
      const membership = await db
        .collection("memberships")
        .findOne({ 
          userId: new ObjectId(user._id),
          groupId: new ObjectId(id)
        })

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Get all members of the group
    const memberships = await db.collection("memberships")
      .find({ groupId: new ObjectId(id) })
      .toArray()

    const memberIds = memberships.map(m => m.userId)
    const members: any[] = []

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

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Get group members error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 