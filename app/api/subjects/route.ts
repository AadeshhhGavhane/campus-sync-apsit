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

		if (!user.organizationId) {
			return NextResponse.json({ subjects: [] }, { status: 200 })
		}

		const orgId = typeof user.organizationId === 'string'
			? new ObjectId(user.organizationId)
			: user.organizationId

		const subjects = await db
			.collection("subjects")
			.find({ organizationId: orgId })
			.sort({ name: 1 })
			.toArray()

		const serialized = subjects.map((s: any) => ({
			...s,
			_id: s._id.toString(),
			organizationId: s.organizationId?.toString(),
			createdBy: s.createdBy?.toString(),
		}))

		return NextResponse.json({ subjects: serialized }, { status: 200 })
	} catch (error) {
		console.error("Fetch subjects error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUser()

		if (!user || user.role !== "hod") {
			return NextResponse.json({ error: "Only HODs can create subjects" }, { status: 403 })
		}

		const body = await request.json()
		const name: string | undefined = body?.name
		const abbreviation: string | undefined = body?.abbreviation
		const category: string | undefined = body?.category

		if (!name || name.trim().length === 0) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 })
		}

		if (!user.organizationId) {
			return NextResponse.json({ error: "Organization not found" }, { status: 400 })
		}

		const db = await getDatabase()
		const orgId = typeof user.organizationId === 'string'
			? new ObjectId(user.organizationId)
			: user.organizationId

		// Enforce unique name within org
		const existing = await db.collection("subjects").findOne({ name, organizationId: orgId })
		if (existing) {
			return NextResponse.json({ error: "Subject with this name already exists" }, { status: 400 })
		}

		const subject = {
			name,
			abbreviation: abbreviation || "",
			category: category || "",
			organizationId: orgId,
			createdBy: new ObjectId(user._id),
			createdAt: new Date(),
		}

		const result = await db.collection("subjects").insertOne(subject)

		return NextResponse.json({
			message: "Subject created successfully",
			subject: { _id: result.insertedId, ...subject },
		}, { status: 201 })
	} catch (error) {
		console.error("Create subject error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
} 