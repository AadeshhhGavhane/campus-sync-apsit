import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

// Generate a random 6-character join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "hod") {
      return NextResponse.json({ error: "Only HODs can regenerate join codes" }, { status: 403 })
    }

    const { id } = await params
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' 
      ? new ObjectId(user.organizationId) 
      : user.organizationId

    // Check if group exists and user has permission
    const existingGroup = await db.collection("groups").findOne({ 
      _id: new ObjectId(id),
      organizationId: orgId
    })

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Generate new join code
    let newCode: string
    let attempts = 0
    const maxAttempts = 10

    do {
      newCode = generateJoinCode()
      attempts++
      
      // Check if code already exists
      const existingGroupWithCode = await db.collection("groups").findOne({ 
        joinCode: newCode,
        _id: { $ne: new ObjectId(id) } // Exclude current group
      })
      
      if (!existingGroupWithCode) {
        break
      }
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: "Failed to generate unique join code" }, { status: 500 })
    }

    // Update group with new join code
    const updateResult = await db.collection("groups").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          joinCode: newCode,
          updatedAt: new Date(),
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: "Join code regenerated successfully",
      newCode 
    })
  } catch (error) {
    console.error("Regenerate join code error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 