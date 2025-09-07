import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { hashPassword, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, departmentName } = await request.json()

    // Validate required fields
    if (!name || !email || !password || !role || !departmentName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate role
    if (!["hod", "faculty", "student"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const db = await getDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user: { name: string; email: string; password: string; role: string; departmentName: string; createdAt: Date; organizationId?: string } = {
      name,
      email,
      password: hashedPassword,
      role,
      departmentName,
      createdAt: new Date(),
    }

    const result = await db.collection("users").insertOne(user)

    // If HOD, create organization
    if (role === "hod") {
      const organization = {
        name: departmentName,
        hodId: result.insertedId,
        createdAt: new Date(),
      }

      const orgResult = await db.collection("organizations").insertOne(organization)

      // Update user with organizationId
      await db
        .collection("users")
        .updateOne({ _id: result.insertedId }, { $set: { organizationId: orgResult.insertedId } })

      user.organizationId = orgResult.insertedId.toString()
    }

    // Generate JWT token
    const userForToken = {
      _id: result.insertedId.toString(),
      name,
      email,
      role,
      departmentName,
      organizationId: user.organizationId,
    }

    const token = generateToken(userForToken as any)

    // Set HTTP-only cookie
    const response = NextResponse.json({ message: "User created successfully", user: userForToken }, { status: 201 })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
