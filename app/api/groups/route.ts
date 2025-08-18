import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

// Generate random 6-character join code
function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()
    let groups: any[] = []

    if (user.role === "hod") {
      // HOD sees all groups in their organization
      if (user.organizationId) {
        // Handle organizationId - it might be a string or ObjectId
        const orgId = typeof user.organizationId === 'string' 
          ? new ObjectId(user.organizationId) 
          : user.organizationId
        
        groups = await db
          .collection("groups")
          .find({ organizationId: orgId })
          .toArray()
      }
    } else {
      // Students/Faculty see groups they're members of
      const memberships = await db
        .collection("memberships")
        .find({ userId: new ObjectId(user._id) })
        .toArray()

      const groupIds = memberships.map((m) => m.groupId)
      if (groupIds.length > 0) {
        const groupIdToPermission = new Map<string, string>(
          memberships.map((m) => [m.groupId.toString(), m.permission || 'viewer'])
        )
        groups = await db
          .collection("groups")
          .find({ _id: { $in: groupIds } })
          .toArray()
        // Attach userPermission from membership
        groups = groups.map((g) => ({
          ...g,
          userPermission: groupIdToPermission.get(g._id.toString()) || 'viewer',
        }))
      }
    }

    // Attach membersCount for each group using a single aggregation
    if (groups.length > 0) {
      const groupObjectIds = groups.map((g) => g._id)
      const counts = await db.collection("memberships").aggregate([
        { $match: { groupId: { $in: groupObjectIds } } },
        { $group: { _id: "$groupId", count: { $sum: 1 } } },
      ]).toArray()

      const idToCount = new Map<string, number>(counts.map((c: any) => [c._id.toString(), c.count]))
      groups = groups.map((g) => ({
        ...g,
        membersCount: idToCount.get(g._id.toString()) || 0,
      }))
    }

    return NextResponse.json({ groups })
  } catch (error) {
    console.error("Fetch groups error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can create groups" }, { status: 403 })
    }

    const { name, description, defaultAccess } = await request.json()

    if (!name || !defaultAccess) {
      return NextResponse.json({ error: "Name and default access are required" }, { status: 400 })
    }

    if (!["viewer", "contributor"].includes(defaultAccess)) {
      return NextResponse.json({ error: "Invalid default access level" }, { status: 400 })
    }

    const db = await getDatabase()

    // Generate unique join code
    let joinCode: string
    let isUnique = false
    let attempts = 0

    do {
      joinCode = generateJoinCode()
      const existing = await db.collection("groups").findOne({ joinCode })
      isUnique = !existing
      attempts++
    } while (!isUnique && attempts < 10)

    if (!isUnique) {
      return NextResponse.json({ error: "Failed to generate unique join code" }, { status: 500 })
    }

    // Create group
    const group = {
      name,
      description: description || "",
      joinCode,
      defaultAccess,
      organizationId: typeof user.organizationId === 'string' 
        ? new ObjectId(user.organizationId) 
        : user.organizationId,
      createdBy: new ObjectId(user._id),
      createdAt: new Date(),
    }

    const result = await db.collection("groups").insertOne(group)

    return NextResponse.json(
      {
        message: "Group created successfully",
        group: {
          _id: result.insertedId,
          ...group,
          membersCount: 0,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create group error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
