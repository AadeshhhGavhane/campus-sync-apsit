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

    // Normalize subject title and batch name if ids are provided
    const normalizedSlots = await (async () => {
      // collect subject ids and batch ids if provided
      const subjectIds = new Set<string>()
      const batchIds = new Set<string>()
      for (const s of slots as any[]) {
        if (s.subjectId) subjectIds.add(String(s.subjectId))
        if (s.batchId) batchIds.add(String(s.batchId))
      }
      const idToSubjectName = new Map<string, string>()
      if (subjectIds.size > 0) {
        const ids = Array.from(subjectIds).map((id) => new ObjectId(id))
        const subjects = await db.collection('subjects').find({ _id: { $in: ids } }).project({ _id: 1, name: 1 }).toArray()
        subjects.forEach((sub) => idToSubjectName.set(sub._id.toString(), sub.name))
      }
      const idToBatchName = new Map<string, string>()
      if (batchIds.size > 0) {
        const ids = Array.from(batchIds).map((id) => new ObjectId(id))
        const batches = await db.collection('batches').find({ _id: { $in: ids } }).project({ _id: 1, name: 1 }).toArray()
        batches.forEach((b) => idToBatchName.set(b._id.toString(), b.name))
      }
      const cleaned = (slots as any[]).map((s) => {
        const copy: any = { ...s }
        if (copy.subjectId && !copy.title) {
          const name = idToSubjectName.get(String(copy.subjectId))
          if (name) copy.title = name
        }
        if (copy.batchId && !copy.batchName) {
          const name = idToBatchName.get(String(copy.batchId))
          if (name) copy.batchName = name
        }
        if (copy.room === 'none') copy.room = ''
        if (copy.batchName === 'none') copy.batchName = ''
        return copy
      })
      const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map((x: string) => parseInt(x, 10))
        return h * 60 + m
      }
      const typeRank = (type: string) => {
        const order = ['lecture', 'lab', 'honors', 'mentoring', 'mini-project', 'break']
        const idx = order.indexOf(type)
        return idx === -1 ? 999 : idx
      }
      const dayRank = (day: string) => {
        const order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        const idx = order.indexOf(day)
        return idx === -1 ? 999 : idx
      }
      cleaned.sort((a: any, b: any) => {
        const da = dayRank(a.dayOfWeek || '')
        const db = dayRank(b.dayOfWeek || '')
        if (da !== db) return da - db
        const ta = toMinutes(a.startTime)
        const tb = toMinutes(b.startTime)
        if (ta !== tb) return ta - tb
        const ra = typeRank(a.type)
        const rb = typeRank(b.type)
        if (ra !== rb) return ra - rb
        const sa = (a.title || '').localeCompare(b.title || '')
        return sa
      })
      return cleaned
    })()

    // Create timetable
    const timetable = {
      name,
      description: description || "",
      slots: normalizedSlots,
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
