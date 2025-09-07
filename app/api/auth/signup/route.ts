import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { hashPassword, generateToken } from "@/lib/auth"
import { z } from "zod" // Using Zod for validation

// 1. Define a schema for validating the incoming data
const signupSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().optional(), // Last name can be optional if you want
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["hod", "faculty", "student"], { message: "Invalid role" }),
  departmentName: z.string().min(1, { message: "Department is required" }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 2. Validate the request body against the schema
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      // Return the first validation error message
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }
    
    // Destructure the validated data
    const { firstName, lastName, email, password, role, departmentName } = validation.data;

    const db = await getDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 }) // 409 Conflict is more appropriate
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // 3. Create the user object with the new fields
    const user = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      departmentName,
      createdAt: new Date(),
    }

    const result = await db.collection("users").insertOne(user)
    const userId = result.insertedId;

    let organizationId = undefined;

    // If HOD, create organization
    if (role === "hod") {
      const organization = {
        name: departmentName,
        hodId: userId,
        createdAt: new Date(),
      }
      const orgResult = await db.collection("organizations").insertOne(organization)
      organizationId = orgResult.insertedId;

      // Update user with organizationId
      await db.collection("users").updateOne({ _id: userId }, { $set: { organizationId } })
    }

    // 4. Generate JWT token with the combined full name
    const userForToken = {
      _id: userId.toString(),
      name: `${firstName} ${lastName || ''}`.trim(), // Combine first and last name
      email,
      role,
      departmentName,
      organizationId: organizationId?.toString(),
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