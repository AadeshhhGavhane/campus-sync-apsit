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

    const db = await getDatabase()
    const { id } = await params
    
    const timetable = await db.collection("timetables").findOne({ _id: new ObjectId(id) })

    if (!timetable) {
      return NextResponse.json({ error: "Timetable not found" }, { status: 404 })
    }

    // Check access permissions
    if (user.role === "hod") {
      // HOD can access all timetables in their organization
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId
      
      if (!timetable.organizationId || !timetable.organizationId.equals(orgId)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    } else {
      // Students/Faculty can only access timetables assigned to their groups
      const memberships = await db
        .collection("memberships")
        .find({ userId: new ObjectId(user._id) })
        .toArray()

      const groupIds = memberships.map((m) => m.groupId)
      const hasAccess = timetable.assignedGroups?.some((groupId: any) => 
        groupIds.some(userGroupId => userGroupId.equals(groupId))
      )

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Hydrate faculty names for slots from facultyUserId when faculty string is missing
    if (Array.isArray(timetable.slots) && timetable.slots.length > 0) {
      const uniqueIds: ObjectId[] = []
      const seen = new Set<string>()

      for (const slot of timetable.slots as any[]) {
        const maybeId = slot?.facultyUserId
        if (!maybeId) continue
        try {
          const idStr = typeof maybeId === 'string' ? maybeId : String(maybeId)
          if (!seen.has(idStr)) {
            seen.add(idStr)
            uniqueIds.push(new ObjectId(idStr))
          }
        } catch {
          // ignore invalid ids
        }
      }

      if (uniqueIds.length > 0) {
        const users = await db.collection("users").find({ _id: { $in: uniqueIds } }).project({ _id: 1, name: 1 }).toArray()
        const idToName = new Map<string, string>(users.map(u => [u._id.toString(), u.name]))

        timetable.slots = (timetable.slots as any[]).map((s) => {
          if (!s) return s
          const hasFacultyText = typeof s.faculty === 'string' && s.faculty.trim().length > 0
          if (hasFacultyText) return s
          const idStr = s.facultyUserId ? String(s.facultyUserId) : ""
          const name = idStr ? idToName.get(idStr) : undefined
          return name ? { ...s, faculty: name } : s
        })
      }
    }

    return NextResponse.json({ timetable })
  } catch (error) {
    console.error("Fetch timetable error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    const { id } = await params

    // Load timetable
    const existingTimetable = await db.collection("timetables").findOne({ _id: new ObjectId(id) })
    if (!existingTimetable) {
      return NextResponse.json({ error: "Timetable not found" }, { status: 404 })
    }

    let allowed = false
    if (user.role === "hod") {
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId
      allowed = existingTimetable.organizationId?.equals(orgId)
    } else {
      const contributorMembership = await db.collection("memberships").findOne({
        userId: new ObjectId(user._id),
        groupId: { $in: (existingTimetable.assignedGroups || []) },
        permission: "contributor",
      })
      allowed = !!contributorMembership
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update timetable
    const result = await db.collection("timetables").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || "",
          slots,
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Timetable not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Timetable updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("Update timetable error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'hod') {
      return NextResponse.json({ error: 'Only HODs can delete timetables' }, { status: 403 })
    }
    const { id } = await params
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId

    // Ensure timetable belongs to org
    const existing = await db.collection('timetables').findOne({ _id: new ObjectId(id), organizationId: orgId })
    if (!existing) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }

    await db.collection('timetables').deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ message: 'Timetable deleted successfully' })
  } catch (error) {
    console.error('Delete timetable error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 