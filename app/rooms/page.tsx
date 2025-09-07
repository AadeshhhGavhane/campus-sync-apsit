export const dynamic = 'force-dynamic'
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import RoomsPageClient from "./page-client"

export default async function RoomsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  if (user.role !== "hod") {
    redirect("/home")
  }

  const db = await getDatabase()
  
  // Get rooms for the organization
  let rooms: any[] = []
  if (user.organizationId) {
    const orgId = typeof user.organizationId === 'string' 
      ? new ObjectId(user.organizationId) 
      : user.organizationId
    
    rooms = await db
      .collection("rooms")
      .find({ organizationId: orgId })
      .sort({ name: 1 })
      .toArray()
  }

  // Convert ObjectIds to strings for client
  const serializedRooms = rooms.map(room => ({
    ...room,
    _id: room._id.toString(),
    organizationId: room.organizationId?.toString(),
    createdBy: room.createdBy?.toString(),
  }))

  return <RoomsPageClient rooms={serializedRooms} />
} 