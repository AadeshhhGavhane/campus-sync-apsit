"use client"

import { useState } from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Users } from "lucide-react"
import AssignmentDialog from "@/components/assignment-dialog"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/hooks/use-app-data"
import { useAppStore } from "@/lib/store"

interface Group {
	_id: string
	name: string
	description: string
	joinCode: string
}

interface Timetable {
	_id: string
	name: string
	assignedGroups: string[]
}

interface TimetableAssignmentClientProps {
	timetable: Timetable
	groups: Group[]
}

export default function TimetableAssignmentClient({ timetable, groups }: TimetableAssignmentClientProps) {
	const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
	const queryClient = useQueryClient()
	const { setTimetables } = useAppStore()

	const handleAssign = async (timetableId: string, groupIds: string[]) => {
		const response = await fetch(`/api/timetables/${timetableId}/assign`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ groupIds }),
		})

		if (!response.ok) {
			const data = await response.json()
			throw new Error(data.error || "Failed to assign groups")
		}

		// Update React Query cache
		queryClient.setQueryData(queryKeys.timetables, (prev: any) => {
			if (!Array.isArray(prev)) return prev
			const updated = prev.map((t: any) => (t._id === timetableId ? { ...t, assignedGroups: groupIds } : t))
			// Sync Zustand for immediate UI usage
			setTimetables(updated)
			return updated
		})

		setShowAssignmentDialog(false)
	}

	const handleOpenAssignmentDialog = (event: Event) => {
		event.preventDefault()
		// Add a small delay to ensure the dropdown has closed before opening the modal
		setTimeout(() => {
			setShowAssignmentDialog(true)
		}, 150)
	}

	return (
		<>
			<DropdownMenuItem onSelect={handleOpenAssignmentDialog}>
				<Users className="h-4 w-4 mr-2" />
				Assign to Groups
			</DropdownMenuItem>

			<AssignmentDialog
				open={showAssignmentDialog}
				onOpenChange={setShowAssignmentDialog}
				title="Assign Timetable to Groups"
				itemName={timetable.name}
				itemId={timetable._id}
				itemType="timetable"
				groups={groups}
				assignedGroups={timetable.assignedGroups || []}
				onAssign={handleAssign}
			/>
		</>
	)
}
