export const dynamic = 'force-dynamic'
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import LabsPageClient from "./page-client"

export default async function LabsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/auth/login")
  if (user.role !== 'hod') redirect("/home")
  const db = await getDatabase()
  let labs: any[] = []
  if (user.organizationId) {
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
    labs = await db.collection('labs').find({ organizationId: orgId }).sort({ name: 1 }).toArray()
  }
  const serialized = labs.map((l: any) => ({ ...l, _id: String(l._id), organizationId: String(l.organizationId), createdBy: String(l.createdBy) }))
  return <LabsPageClient labs={serialized} />
} 