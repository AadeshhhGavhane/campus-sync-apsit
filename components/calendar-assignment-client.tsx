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

interface Calendar {
	_id: string
	name: string
	assignedGroups: string[]
}

interface CalendarAssignmentClientProps {
	calendar: Calendar
	groups: Group[]
}

export default function CalendarAssignmentClient({ calendar, groups }: CalendarAssignmentClientProps) {
	const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
	const queryClient = useQueryClient()
	const { setCalendars } = useAppStore()

	const handleAssign = async (calendarId: string, groupIds: string[]) => {
		const response = await fetch(`/api/calendars/${calendarId}/assign`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ groupIds }),
		})

		if (!response.ok) {
			const data = await response.json()
			throw new Error(data.error || "Failed to assign groups")
		}

		// Update React Query cache
		queryClient.setQueryData(queryKeys.calendars, (prev: any) => {
			if (!Array.isArray(prev)) return prev
			const updated = prev.map((c: any) => (c._id === calendarId ? { ...c, assignedGroups: groupIds } : c))
			// Sync Zustand for immediate UI usage
			setCalendars(updated)
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
				title="Assign Calendar to Groups"
				itemName={calendar.name}
				itemId={calendar._id}
				itemType="calendar"
				groups={groups}
				assignedGroups={calendar.assignedGroups || []}
				onAssign={handleAssign}
			/>
		</>
	)
}
