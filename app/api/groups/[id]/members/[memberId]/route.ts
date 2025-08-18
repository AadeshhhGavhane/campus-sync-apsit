import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, memberId } = await params
    const db = await getDatabase()

    // Allow HOD to remove any non-HOD member in their org, OR allow a user to leave the group themselves
    const isSelfRemoval = user._id === memberId

    if (!isSelfRemoval) {
      if (user.role !== "hod") {
        return NextResponse.json({ error: "Only HODs can remove other members" }, { status: 403 })
      }
      // For HOD, ensure group belongs to their organization
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId

      const existingGroup = await db.collection("groups").findOne({ 
        _id: new ObjectId(id),
        organizationId: orgId
      })

      if (!existingGroup) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 })
      }

      // Disallow removing HODs
      const memberUser = await db.collection("users").findOne({ _id: new ObjectId(memberId) })
      if (memberUser && memberUser.role === "hod") {
        return NextResponse.json({ error: "Cannot remove HOD from group" }, { status: 403 })
      }
    } else {
      // Self-removal path: ensure a membership exists for the current user
      const existingMembership = await db.collection("memberships").findOne({
        groupId: new ObjectId(id),
        userId: new ObjectId(user._id)
      })
      if (!existingMembership) {
        return NextResponse.json({ error: "You are not a member of this group" }, { status: 400 })
      }
    }

    // Remove member (either by HOD or self)
    const deleteResult = await db.collection("memberships").deleteOne({
      groupId: new ObjectId(id),
      userId: new ObjectId(memberId)
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
    }

    return NextResponse.json({ 
      message: isSelfRemoval ? "Left group successfully" : "Member removed successfully" 
    })
  } catch (error) {
    console.error("Remove member error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 