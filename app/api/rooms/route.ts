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
    let rooms: any[] = []

    if (user.role === "hod") {
      // HOD sees all rooms in their organization
      if (user.organizationId) {
        const orgId = typeof user.organizationId === 'string' 
          ? new ObjectId(user.organizationId) 
          : user.organizationId
        rooms = await db
          .collection("rooms")
          .find({ organizationId: orgId })
          .sort({ name: 1 })
          .toArray()
      }
    } else {
      // Students/Faculty see rooms from groups they're members of
      const memberships = await db
        .collection("memberships")
        .find({ userId: new ObjectId(user._id) })
        .toArray()

      const groupIds = memberships.map((m) => m.groupId)
      if (groupIds.length > 0) {
        // Get rooms that are used in timetables assigned to user's groups
        const timetables = await db
          .collection("timetables")
          .find({ assignedGroups: { $in: groupIds } })
          .toArray()

        const roomNames = new Set<string>()
        timetables.forEach(timetable => {
          timetable.slots?.forEach((slot: any) => {
            if (slot.room) roomNames.add(slot.room)
          })
        })

        if (roomNames.size > 0) {
          rooms = await db
            .collection("rooms")
            .find({ 
              organizationId: { $in: groupIds.map(() => new ObjectId(user.organizationId!)) },
              name: { $in: Array.from(roomNames) }
            })
            .sort({ name: 1 })
            .toArray()
        }
      }
    }

    // Convert ObjectIds to strings for client
    const serializedRooms = rooms.map(room => ({
      ...room,
      _id: room._id.toString(),
      organizationId: room.organizationId?.toString(),
    }))

    return NextResponse.json({ rooms: serializedRooms }, { status: 200 })
  } catch (error) {
    console.error("Fetch rooms error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can create rooms" }, { status: 403 })
    }

    const { name, type } = await request.json()

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
    }

    if (!["Classroom", "Lab", "Seminar Hall", "Cabin", "Office"].includes(type)) {
      return NextResponse.json({ error: "Invalid room type" }, { status: 400 })
    }

    const db = await getDatabase()

    // Check if room with same name already exists in the organization
    if (user.organizationId) {
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId
      
      const existingRoom = await db.collection("rooms").findOne({ 
        name, 
        organizationId: orgId 
      })

      if (existingRoom) {
        return NextResponse.json({ error: "Room with this name already exists" }, { status: 400 })
      }

      // Create room
      const room = {
        name,
        type,
        organizationId: orgId,
        createdBy: new ObjectId(user._id),
        createdAt: new Date(),
      }

      const result = await db.collection("rooms").insertOne(room)

      return NextResponse.json(
        {
          message: "Room created successfully",
          room: {
            _id: result.insertedId,
            ...room,
          },
        },
        { status: 201 },
      )
    } else {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 })
    }
  } catch (error) {
    console.error("Create room error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 