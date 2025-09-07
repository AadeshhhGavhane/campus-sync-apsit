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

    // Convert ObjectIds to strings for client
    const serializedGroup = {
      ...group,
      _id: group._id.toString(),
      organizationId: group.organizationId.toString(),
      createdBy: group.createdBy.toString(),
    }

    return NextResponse.json({ group: serializedGroup })
  } catch (error) {
    console.error("Get group error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can update groups" }, { status: 403 })
    }

    const { id } = await params
    const { name, description, defaultAccess } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 })
    }

    if (!["viewer", "contributor"].includes(defaultAccess)) {
      return NextResponse.json({ error: "Invalid default access level" }, { status: 400 })
    }

    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' 
      ? new ObjectId(user.organizationId) 
      : user.organizationId

    // Check if group exists and user has permission
    const existingGroup = await db.collection("groups").findOne({ 
      _id: new ObjectId(id),
      organizationId: orgId
    })

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Update group
    const updateResult = await db.collection("groups").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || "",
          defaultAccess,
          updatedAt: new Date(),
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Group updated successfully" })
  } catch (error) {
    console.error("Update group error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'hod') {
      return NextResponse.json({ error: 'Only HODs can delete groups' }, { status: 403 })
    }

    const { id } = await params
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId

    // Ensure group belongs to HOD org
    const existing = await db.collection('groups').findOne({ _id: new ObjectId(id), organizationId: orgId })
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Remove memberships
    await db.collection('memberships').deleteMany({ groupId: new ObjectId(id) })
    // Optionally, remove references in calendars/timetables assignedGroups
    await (db.collection('calendars') as any).updateMany({}, { $pull: { assignedGroups: new ObjectId(id) } })
    await (db.collection('timetables') as any).updateMany({}, { $pull: { assignedGroups: new ObjectId(id) } })

    // Delete group
    await db.collection('groups').deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 