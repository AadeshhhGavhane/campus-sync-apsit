import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import RoomsPageClient from "./page-client"

export const dynamic = 'force-dynamic'

export default async function RoomsPage() {
	return <RoomsPageClient rooms={[]} />
} 