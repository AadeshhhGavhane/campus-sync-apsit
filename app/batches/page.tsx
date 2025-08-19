export const dynamic = 'force-dynamic'
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import BatchesPageClient from "./page-client"

export default async function BatchesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/auth/login")
  if (user.role !== 'hod') redirect("/home")
  const db = await getDatabase()
  let batches: any[] = []
  if (user.organizationId) {
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
    batches = await db.collection('batches').find({ organizationId: orgId }).sort({ name: 1 }).toArray()
  }
  const serialized = batches.map((b: any) => ({ ...b, _id: String(b._id), organizationId: String(b.organizationId), createdBy: String(b.createdBy) }))
  return <BatchesPageClient batches={serialized} />
} 