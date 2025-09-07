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
          const idStr = s.facultyUserId ? String(s.facultyUserId) : ""
          const name = idStr ? idToName.get(idStr) : undefined
          return name ? { ...s, faculty: name } : s
        })
      }
    }

    // Hydrate subject/lab titles and abbreviations from ids so UI reflects latest names
    if (Array.isArray(timetable.slots) && timetable.slots.length > 0) {
      const subjectIds = new Set<string>()
      const labIds = new Set<string>()
      for (const s of timetable.slots as any[]) {
        if (s?.subjectId) subjectIds.add(String(s.subjectId))
        if (s?.labId) labIds.add(String(s.labId))
      }
      const subjectMap = new Map<string, { name: string; abbreviation?: string }>()
      if (subjectIds.size > 0) {
        const subs = await db.collection('subjects')
          .find({ _id: { $in: Array.from(subjectIds).map((id) => new ObjectId(id)) } })
          .project({ _id: 1, name: 1, abbreviation: 1 })
          .toArray()
        subs.forEach((x: any) => subjectMap.set(x._id.toString(), { name: x.name, abbreviation: x.abbreviation }))
      }
      const labMap = new Map<string, { name: string; abbreviation?: string }>()
      if (labIds.size > 0) {
        const labs = await db.collection('labs')
          .find({ _id: { $in: Array.from(labIds).map((id) => new ObjectId(id)) } })
          .project({ _id: 1, name: 1, abbreviation: 1 })
          .toArray()
        labs.forEach((x: any) => labMap.set(x._id.toString(), { name: x.name, abbreviation: x.abbreviation }))
      }

      timetable.slots = (timetable.slots as any[]).map((s) => {
        if (!s) return s
        const subj = s.subjectId ? subjectMap.get(String(s.subjectId)) : undefined
        const lab = s.labId ? labMap.get(String(s.labId)) : undefined
        const title = subj?.name || lab?.name || s.title
        const abbreviation = subj?.abbreviation || lab?.abbreviation || undefined
        return { ...s, title, abbreviation }
      })
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

      // For lecture/lab/honors, title is required (mentoring does not require title)
      if (["lecture","lab","honors"].includes(slot.type) && !slot.title) {
        return NextResponse.json({ error: "Title is required for lecture, lab, and honors slots" }, { status: 400 })
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

    // Normalize faculty names based on facultyUserId to avoid stale names
    const uniqueFacultyIds: ObjectId[] = []
    const seenIds = new Set<string>()
    for (const s of slots as any[]) {
      const idMaybe = s?.facultyUserId
      if (!idMaybe) continue
      try {
        const idStr = typeof idMaybe === 'string' ? idMaybe : String(idMaybe)
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr)
          uniqueFacultyIds.push(new ObjectId(idStr))
        }
      } catch {}
    }

    const idToName = new Map<string, string>()
    if (uniqueFacultyIds.length > 0) {
      const users = await db.collection("users").find({ _id: { $in: uniqueFacultyIds } }).project({ _id: 1, name: 1 }).toArray()
      for (const u of users) {
        idToName.set(u._id.toString(), u.name)
      }
    }

    // Normalize subject title and batch name if ids are provided
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
    const normalizedSlots = (slots as any[]).map((s) => {
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
    normalizedSlots.sort((a: any, b: any) => {
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

    const result = await db.collection("timetables").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || "",
          slots: normalizedSlots,
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