"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LeaveGroupButton({ groupId, userId }: { groupId: string; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to leave group')
      router.push('/groups')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to leave group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleLeave} variant="outline" disabled={loading} className="text-red-600 hover:text-red-700">
      {loading ? 'Leaving...' : 'Leave Group'}
    </Button>
  )
} 