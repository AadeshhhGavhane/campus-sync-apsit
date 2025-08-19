export const dynamic = 'force-dynamic'
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import SubjectsPageClient from "./page-client"

export default async function SubjectsPage() {
	const user = await getCurrentUser()

	if (!user) {
		redirect("/auth/login")
	}

	if (user.role !== "hod") {
		redirect("/home")
	}

	const db = await getDatabase()

	let subjects: any[] = []
	if (user.organizationId) {
		const orgId = typeof user.organizationId === 'string'
			? new ObjectId(user.organizationId)
			: user.organizationId
		subjects = await db
			.collection("subjects")
			.find({ organizationId: orgId })
			.sort({ name: 1 })
			.toArray()
	}

	const serialized = subjects.map((s: any) => ({
		...s,
		_id: s._id.toString(),
		organizationId: s.organizationId?.toString(),
		createdBy: s.createdBy?.toString(),
	}))

	return <SubjectsPageClient subjects={serialized} />
} 