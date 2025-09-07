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
      // Students/Faculty: list rooms for organizations inferred from their groups
      const memberships = await db
        .collection("memberships")
        .find({ userId: new ObjectId(user._id) })
        .toArray()

      const groupIds = memberships.map((m) => m.groupId).filter(Boolean)
      if (groupIds.length > 0) {
        const groups = await db
          .collection("groups")
          .find({ _id: { $in: groupIds } })
          .project({ _id: 1, organizationId: 1 })
          .toArray()
        const orgIdSet = new Set<string>()
        for (const g of groups) {
          if (g.organizationId) orgIdSet.add(String(g.organizationId))
        }
        const orgIds = Array.from(orgIdSet).map((id) => new ObjectId(id))
        if (orgIds.length > 0) {
          rooms = await db
            .collection("rooms")
            .find({ organizationId: { $in: orgIds } })
            .sort({ name: 1 })
            .toArray()
        } else if (user.organizationId) {
          // Fallback to user's organization if present
          const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
          rooms = await db
            .collection("rooms")
            .find({ organizationId: orgId })
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