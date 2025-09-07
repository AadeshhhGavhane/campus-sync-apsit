import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can update rooms" }, { status: 403 })
    }

    const { id } = await params
    const { name, type } = await request.json()

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
    }

    if (!["Classroom", "Lab", "Seminar Hall", "Cabin", "Office"].includes(type)) {
      return NextResponse.json({ error: "Invalid room type" }, { status: 400 })
    }

    const db = await getDatabase()

    // Check if room exists and belongs to user's organization
    if (user.organizationId) {
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId
      
      const existingRoom = await db.collection("rooms").findOne({ 
        _id: new ObjectId(id),
        organizationId: orgId 
      })

      if (!existingRoom) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 })
      }

      // Check if new name conflicts with another room
      const conflictingRoom = await db.collection("rooms").findOne({ 
        name, 
        organizationId: orgId,
        _id: { $ne: new ObjectId(id) }
      })

      if (conflictingRoom) {
        return NextResponse.json({ error: "Room with this name already exists" }, { status: 400 })
      }

      // Update room
      const result = await db.collection("rooms").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name,
            type,
            updatedAt: new Date(),
          },
        }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 })
      }

      return NextResponse.json({ message: "Room updated successfully" }, { status: 200 })
    } else {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 })
    }
  } catch (error) {
    console.error("Update room error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can delete rooms" }, { status: 403 })
    }

    const { id } = await params
    const db = await getDatabase()

    if (user.organizationId) {
      const orgId = typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId

      // Check if room exists and belongs to user's organization
      const existingRoom = await db.collection("rooms").findOne({ 
        _id: new ObjectId(id), 
        organizationId: orgId 
      })

      if (!existingRoom) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 })
      }

      // Check if room is being used in any timetables
      const timetablesUsingRoom = await db.collection("timetables").find({
        "slots.room": existingRoom.name,
        organizationId: orgId
      }).toArray()

      if (timetablesUsingRoom.length > 0) {
        return NextResponse.json({ 
          error: "Cannot delete room. It is currently being used in timetables." 
        }, { status: 400 })
      }

      // Delete room
      await db.collection("rooms").deleteOne({ _id: new ObjectId(id) })

      return NextResponse.json({ message: "Room deleted successfully" }, { status: 200 })
    } else {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 })
    }
  } catch (error) {
    console.error("Delete room error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 