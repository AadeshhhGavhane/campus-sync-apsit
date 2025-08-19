import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.organizationId) return NextResponse.json({ batches: [] }, { status: 200 })
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
    const batches = await db.collection('batches').find({ organizationId: orgId }).sort({ name: 1 }).toArray()
    const serialized = batches.map((b: any) => ({ ...b, _id: String(b._id), organizationId: String(b.organizationId), createdBy: String(b.createdBy) }))
    return NextResponse.json({ batches: serialized })
  } catch (e) {
    console.error('Fetch batches error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'hod') return NextResponse.json({ error: 'Only HODs can create batches' }, { status: 403 })
    const { name } = await request.json()
    if (!name || String(name).trim().length === 0) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
    const dup = await db.collection('batches').findOne({ name, organizationId: orgId })
    if (dup) return NextResponse.json({ error: 'Batch with this name already exists' }, { status: 400 })
    const batch = { name, organizationId: orgId, createdBy: new ObjectId(user._id), createdAt: new Date() }
    const result = await db.collection('batches').insertOne(batch)
    return NextResponse.json({ message: 'Batch created', batch: { _id: result.insertedId, ...batch } }, { status: 201 })
  } catch (e) {
    console.error('Create batch error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 