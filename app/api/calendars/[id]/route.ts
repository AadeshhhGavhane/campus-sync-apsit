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
    const calendar = await db.collection("calendars").findOne({ _id: new ObjectId(id) })

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 })
    }

    // Check access permissions
    if (user.role === "hod") {
      // HOD can access calendars in their organization
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId

      if (!calendar.organizationId.equals(orgId)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    } else {
      // Students/Faculty can only access calendars assigned to their groups
      const memberships = await db
        .collection("memberships")
        .find({ userId: new ObjectId(user._id) })
        .toArray()

      const groupIds = memberships.map((m) => m.groupId)
      const hasAccess = calendar.assignedGroups?.some((groupId: ObjectId) => 
        groupIds.some(userGroupId => userGroupId.equals(groupId))
      )

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Convert ObjectIds to strings for client
    const serializedCalendar = {
      ...calendar,
      _id: calendar._id.toString(),
      organizationId: calendar.organizationId.toString(),
      createdBy: calendar.createdBy.toString(),
      assignedGroups: calendar.assignedGroups?.map((id: ObjectId) => id.toString()) || [],
    }

    return NextResponse.json({ calendar: serializedCalendar })
  } catch (error) {
    console.error("Get calendar error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { name, description, events, customEventTypes } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Calendar name is required" }, { status: 400 })
    }

    // Validate events
    if (events && events.length > 0) {
      for (const event of events) {
        if (!event.date || !event.title || !event.type) {
          return NextResponse.json({ error: "All event fields (date, title, type) are required" }, { status: 400 })
        }
      }
    }

    const db = await getDatabase()

    // Load calendar first
    const calendar = await db.collection("calendars").findOne({ _id: new ObjectId(id) })
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 })
    }

    let allowed = false
    if (user.role === "hod") {
      // HOD must belong to same org
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId
      allowed = calendar.organizationId?.equals(orgId)
    } else {
      // Contributors: must be contributor in ANY assigned group
      const contributorMembership = await db.collection("memberships").findOne({
        userId: new ObjectId(user._id),
        groupId: { $in: (calendar.assignedGroups || []) },
        permission: "contributor",
      })
      allowed = !!contributorMembership
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update calendar
    const updateResult = await db.collection("calendars").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || "",
          events: events || [],
          customEventTypes: customEventTypes || [],
          updatedAt: new Date(),
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Calendar updated successfully" })
  } catch (error) {
    console.error("Update calendar error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'hod') {
      return NextResponse.json({ error: 'Only HODs can delete calendars' }, { status: 403 })
    }
    const { id } = await params
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId

    // Ensure calendar belongs to org
    const existing = await db.collection('calendars').findOne({ _id: new ObjectId(id), organizationId: orgId })
    if (!existing) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    await db.collection('calendars').deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ message: 'Calendar deleted successfully' })
  } catch (error) {
    console.error('Delete calendar error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 