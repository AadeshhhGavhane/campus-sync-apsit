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
    let timetables: any[] = []

    if (user.role === "hod") {
      // HOD sees all timetables in their organization
      if (user.organizationId) {
        const orgId = typeof user.organizationId === 'string' 
          ? new ObjectId(user.organizationId) 
          : user.organizationId
        timetables = await db
          .collection("timetables")
          .find({ organizationId: orgId })
          .sort({ createdAt: -1 })
          .toArray()
      }
    } else {
      // Students/Faculty see timetables assigned to their groups
      const memberships = await db
        .collection("memberships")
        .find({ userId: new ObjectId(user._id) })
        .toArray()

      const groupIds = memberships.map((m) => m.groupId)
      if (groupIds.length > 0) {
        timetables = await db
          .collection("timetables")
          .find({ assignedGroups: { $in: groupIds } })
          .sort({ createdAt: -1 })
          .toArray()
      }
    }

    return NextResponse.json({ timetables }, { status: 200 })
  } catch (error) {
    console.error("Fetch timetables error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can create timetables" }, { status: 403 })
    }

    const { name, description, slots } = await request.json()

    if (!name || !slots || slots.length === 0) {
      return NextResponse.json({ error: "Name and at least one slot are required" }, { status: 400 })
    }

    // Validate slots
    for (const slot of slots) {
      if (!slot.dayOfWeek || !slot.startTime || !slot.endTime || !slot.type) {
        return NextResponse.json({ error: "Day, start time, end time, and type are required for all slots" }, { status: 400 })
      }

      if (!["lecture", "lab", "honors", "mentoring", "break", "mini-project"].includes(slot.type)) {
        return NextResponse.json({ error: "Invalid slot type" }, { status: 400 })
      }

      // For non-break and non-mini-project slots, title is required
      if (slot.type !== "break" && slot.type !== "mini-project" && !slot.title) {
        return NextResponse.json({ error: "Title is required for lecture, lab, honors, and mentoring slots" }, { status: 400 })
      }
    }

    const db = await getDatabase()

    // Create timetable
    const timetable = {
      name,
      description: description || "",
      slots,
      organizationId: new ObjectId(user.organizationId!),
      createdBy: new ObjectId(user._id),
      assignedGroups: [], // Will be assigned later
      createdAt: new Date(),
    }

    const result = await db.collection("timetables").insertOne(timetable)

    return NextResponse.json(
      {
        message: "Timetable created successfully",
        timetable: {
          _id: result.insertedId,
          ...timetable,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create timetable error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
