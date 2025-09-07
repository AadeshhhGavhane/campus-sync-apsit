import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can assign calendars" }, { status: 403 })
    }

    const { groupIds } = await request.json()

    if (!Array.isArray(groupIds)) {
      return NextResponse.json({ error: "Group IDs must be an array" }, { status: 400 })
    }

    const db = await getDatabase()
    const { id } = await params

    // Handle organizationId - it might be a string or ObjectId
    const orgId = typeof user.organizationId === 'string' 
      ? new ObjectId(user.organizationId) 
      : user.organizationId

    // Verify calendar exists and belongs to HOD's organization
    const calendar = await db.collection("calendars").findOne({
      _id: new ObjectId(id),
      organizationId: orgId,
    })

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 })
    }

    // Verify all groups belong to HOD's organization
    if (groupIds.length > 0) {
      const groups = await db
        .collection("groups")
        .find({
          _id: { $in: groupIds.map((id) => new ObjectId(id)) },
          organizationId: orgId,
        })
        .toArray()

      if (groups.length !== groupIds.length) {
        return NextResponse.json({ error: "Some groups not found or not accessible" }, { status: 400 })
      }
    }

    // Update calendar with assigned groups
    await db.collection("calendars").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          assignedGroups: groupIds.map((id) => new ObjectId(id)),
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({ message: "Calendar assigned successfully" }, { status: 200 })
  } catch (error) {
    console.error("Assign calendar error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
