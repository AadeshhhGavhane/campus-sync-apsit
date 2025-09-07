import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || user.role !== "hod") {
			return NextResponse.json({ error: "Only HODs can update subjects" }, { status: 403 })
		}
		const { id } = await params
		const { name, abbreviation, category } = await request.json()
		if (!name || name.trim().length === 0) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 })
		}
		const db = await getDatabase()
		const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
		// Ensure subject belongs to org and name is unique
		const existing = await db.collection("subjects").findOne({ _id: new ObjectId(id), organizationId: orgId })
		if (!existing) {
			return NextResponse.json({ error: "Subject not found" }, { status: 404 })
		}
		const dup = await db.collection("subjects").findOne({ _id: { $ne: new ObjectId(id) }, name, organizationId: orgId })
		if (dup) {
			return NextResponse.json({ error: "Subject with this name already exists" }, { status: 400 })
		}
		await db.collection("subjects").updateOne({ _id: new ObjectId(id) }, { $set: { name, abbreviation: abbreviation || "", category: category || "" } })
		return NextResponse.json({ message: "Subject updated" }, { status: 200 })
	} catch (error) {
		console.error("Update subject error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || user.role !== "hod") {
			return NextResponse.json({ error: "Only HODs can delete subjects" }, { status: 403 })
		}
		const { id } = await params
		const db = await getDatabase()
		const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
		const existing = await db.collection("subjects").findOne({ _id: new ObjectId(id), organizationId: orgId })
		if (!existing) {
			return NextResponse.json({ error: "Subject not found" }, { status: 404 })
		}
		await db.collection("subjects").deleteOne({ _id: new ObjectId(id) })
		return NextResponse.json({ message: "Subject deleted" }, { status: 200 })
	} catch (error) {
		console.error("Delete subject error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
} 