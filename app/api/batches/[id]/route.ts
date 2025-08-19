import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'hod') return NextResponse.json({ error: 'Only HODs can update batches' }, { status: 403 })
    const { id } = await params
    const { name } = await request.json()
    if (!name || String(name).trim().length === 0) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
    const existing = await db.collection('batches').findOne({ _id: new ObjectId(id), organizationId: orgId })
    if (!existing) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    const dup = await db.collection('batches').findOne({ _id: { $ne: new ObjectId(id) }, name, organizationId: orgId })
    if (dup) return NextResponse.json({ error: 'Batch with this name already exists' }, { status: 400 })
    await db.collection('batches').updateOne({ _id: new ObjectId(id) }, { $set: { name } })
    return NextResponse.json({ message: 'Batch updated' })
  } catch (e) {
    console.error('Update batch error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'hod') return NextResponse.json({ error: 'Only HODs can delete batches' }, { status: 403 })
    const { id } = await params
    const db = await getDatabase()
    const orgId = typeof user.organizationId === 'string' ? new ObjectId(user.organizationId) : user.organizationId
    const existing = await db.collection('batches').findOne({ _id: new ObjectId(id), organizationId: orgId })
    if (!existing) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    await db.collection('batches').deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ message: 'Batch deleted' })
  } catch (e) {
    console.error('Delete batch error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 