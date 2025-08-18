import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can update member permissions" }, { status: 403 })
    }

    const { id, memberId } = await params
    const { permission } = await request.json()

    if (!["viewer", "contributor"].includes(permission)) {
      return NextResponse.json({ error: "Invalid permission level" }, { status: 400 })
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

    // Check if member exists in the group
    const existingMembership = await db.collection("memberships").findOne({
      groupId: new ObjectId(id),
      userId: new ObjectId(memberId)
    })

    if (!existingMembership) {
      return NextResponse.json({ error: "Member not found in group" }, { status: 404 })
    }

    // Update member permission
    const updateResult = await db.collection("memberships").updateOne(
      {
        groupId: new ObjectId(id),
        userId: new ObjectId(memberId)
      },
      {
        $set: {
          permission,
          updatedAt: new Date(),
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: "Member permission updated successfully",
      permission 
    })
  } catch (error) {
    console.error("Update member permission error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 