import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET() {
	try {
		const user = await getCurrentUser()
		if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		if (!user.organizationId) return NextResponse.json({ labs: [] }, { status: 200 })
		const db = await getDatabase()
		const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
		const labs = await db.collection("labs").find({ organizationId: orgId }).sort({ name: 1 }).toArray()
		const serialized = labs.map((l: any) => ({ ...l, _id: String(l._id), organizationId: String(l.organizationId), createdBy: String(l.createdBy) }))
		return NextResponse.json({ labs: serialized })
	} catch (e) {
		console.error("Fetch labs error:", e)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUser()
		if (!user || user.role !== 'hod') return NextResponse.json({ error: "Only HODs can create labs" }, { status: 403 })
		const { name, abbreviation } = await request.json()
		if (!name || String(name).trim().length === 0) return NextResponse.json({ error: "Name is required" }, { status: 400 })
		if (!user.organizationId) return NextResponse.json({ error: "Organization not found" }, { status: 400 })
		const db = await getDatabase()
		const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
		const dup = await db.collection("labs").findOne({ name, organizationId: orgId })
		if (dup) return NextResponse.json({ error: "Lab with this name already exists" }, { status: 400 })
		const lab = { name, abbreviation: abbreviation || "", organizationId: orgId, createdBy: new ObjectId(user._id), createdAt: new Date() }
		const result = await db.collection("labs").insertOne(lab)
		return NextResponse.json({ message: "Lab created", lab: { _id: result.insertedId, ...lab } }, { status: 201 })
	} catch (e) {
		console.error("Create lab error:", e)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
} 