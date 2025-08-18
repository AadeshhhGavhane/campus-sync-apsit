import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 401 })
    }

    const db = await getDatabase()
    
    // Get user from database
    const dbUser = await db.collection("users").findOne({ _id: new ObjectId(user._id) })
    
    // Get groups for this user's organization
    let groups: any[] = []
    if (user.organizationId) {
      groups = await db.collection("groups").find({}).toArray()
    }
    
    // Get all groups in the database
    const allGroups = await db.collection("groups").find({}).toArray()
    
    return NextResponse.json({
      currentUser: user,
      dbUser,
      groups,
      allGroups,
      collections: await db.listCollections().toArray()
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
} 