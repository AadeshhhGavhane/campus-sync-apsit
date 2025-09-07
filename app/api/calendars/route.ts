import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()
    let calendars: any[] = []

    if (user.role === "hod") {
      // HOD sees all calendars in their organization
      if (user.organizationId) {
        const orgId = typeof user.organizationId === 'string' 
          ? new ObjectId(user.organizationId) 
          : user.organizationId
        calendars = await db
          .collection("calendars")
          .find({ organizationId: orgId })
          .sort({ createdAt: -1 })
          .toArray()
      }
    } else {
      // Students/Faculty see calendars assigned to their groups
      const memberships = await db
        .collection("memberships")
        .find({ userId: new ObjectId(user._id) })
        .toArray()

      const groupIds = memberships.map((m) => m.groupId)
      if (groupIds.length > 0) {
        calendars = await db
          .collection("calendars")
          .find({ assignedGroups: { $in: groupIds } })
          .sort({ createdAt: -1 })
          .toArray()
      }
    }

    return NextResponse.json({ calendars }, { status: 200 })
  } catch (error) {
    console.error("Fetch calendars error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can create calendars" }, { status: 403 })
    }

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

    // Create calendar
    const calendar = {
      name,
      description: description || "",
      events: events || [],
      customEventTypes: customEventTypes || [],
      organizationId: new ObjectId(user.organizationId!),
      createdBy: new ObjectId(user._id),
      assignedGroups: [], // Will be assigned later
      createdAt: new Date(),
    }

    const result = await db.collection("calendars").insertOne(calendar)

    return NextResponse.json(
      {
        message: "Calendar created successfully",
        calendar: {
          _id: result.insertedId,
          ...calendar,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create calendar error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
