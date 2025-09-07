import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (user.role === "hod") {
      return NextResponse.json({ error: "HODs cannot join groups" }, { status: 403 })
    }

    const { joinCode } = await request.json()

    if (!joinCode || joinCode.length !== 6) {
      return NextResponse.json({ error: "Valid 6-character join code is required" }, { status: 400 })
    }

    const db = await getDatabase()

    // Find group by join code
    const group = await db.collection("groups").findOne({ joinCode: joinCode.toUpperCase() })

    if (!group) {
      return NextResponse.json({ error: "Invalid join code" }, { status: 404 })
    }

    // Check if user is already a member
    const existingMembership = await db.collection("memberships").findOne({
      userId: new ObjectId(user._id),
      groupId: group._id,
    })

    if (existingMembership) {
      return NextResponse.json({ error: "You are already a member of this group" }, { status: 400 })
    }

    // Create membership
    const membership = {
      userId: new ObjectId(user._id),
      groupId: group._id,
      access: group.defaultAccess,
      joinedAt: new Date(),
    }

    await db.collection("memberships").insertOne(membership)

    return NextResponse.json(
      {
        message: "Successfully joined group",
        groupName: group.name,
        access: group.defaultAccess,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Join group error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
