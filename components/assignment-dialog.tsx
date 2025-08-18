"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

interface Group {
  _id: string
  name: string
  description: string
  joinCode: string
}

interface AssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  itemName: string
  itemId: string
  itemType: "timetable" | "calendar"
  groups: Group[]
  assignedGroups: string[]
  onAssign: (itemId: string, groupIds: string[]) => Promise<void>
}

export default function AssignmentDialog({
  open,
  onOpenChange,
  title,
  itemName,
  itemId,
  itemType,
  groups,
  assignedGroups,
  onAssign,
}: AssignmentDialogProps) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(assignedGroups)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]))
  }

  const handleAssign = async () => {
    setLoading(true)
    setError("")

    try {
      await onAssign(itemId, selectedGroups)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign groups")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select groups to assign "{itemName}" to. Members of selected groups will be able to view this {itemType}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No groups available</p>
              <p className="text-sm text-gray-500">Create groups first to assign {itemType}s</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {groups.map((group) => (
                <div key={group._id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={group._id}
                    checked={selectedGroups.includes(group._id)}
                    onCheckedChange={() => handleGroupToggle(group._id)}
                  />
                  <div className="flex-1">
                    <label htmlFor={group._id} className="text-sm font-medium cursor-pointer">
                      {group.name}
                    </label>
                    {group.description && <p className="text-xs text-gray-600">{group.description}</p>}
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {group.joinCode}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedGroups.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Selected {selectedGroups.length} group{selectedGroups.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || groups.length === 0}>
            {loading ? "Assigning..." : "Assign Groups"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
