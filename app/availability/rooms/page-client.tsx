"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DashboardLayout from '@/components/dashboard-layout'
import { useRooms, useTimetables, useUser } from '@/hooks/use-app-data'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function toMinutes(t: string) { const [h,m] = t.split(':').map(Number); return h*60+m }
const dayName = (i: number) => ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][i]
const fmt = (t: string) => { const [h,m] = t.split(':').map(Number); const ap = h>=12? 'PM':'AM'; const hh = (h%12)||12; return `${hh}:${String(m).padStart(2,'0')} ${ap}` }

export default function RoomsAvailabilityClient() {
	const { user } = useUser()
	const { rooms } = useRooms()
	const { timetables } = useTimetables()
	const [currentDay, setCurrentDay] = React.useState<number>((new Date()).getDay())
	const [search, setSearch] = React.useState<string>("")
	const [groupBy, setGroupBy] = React.useState<'window'|'resource'>('window')
	const [selectedWindow, setSelectedWindow] = React.useState<string>('all')

	const slotsForDay = timetables.flatMap((t: any) => (t.slots||[]).filter((s: any) => (s.dayOfWeek||'').toLowerCase() === dayName(currentDay).toLowerCase()))
	const windowsSet = new Set<string>(slotsForDay.map((s: any) => `${s.startTime}|${s.endTime}`))
	const windows: { startTime: string; endTime: string }[] = Array.from(windowsSet).map((k: string) => ({ startTime: k.split('|')[0], endTime: k.split('|')[1] }))
		.sort((a,b) => toMinutes(a.startTime)-toMinutes(b.startTime))

	const dataByWindow = windows.map((win) => {
		const busy = slotsForDay.filter((s: any) => s.startTime === win.startTime && s.endTime === win.endTime)
		const busyRoomNames = new Set<string>(busy.map((s: any) => s.room).filter(Boolean))
		let freeRoomList = (rooms||[]).filter((r: any) => !busyRoomNames.has(r.name))
		if (search.trim()) freeRoomList = freeRoomList.filter((r:any)=> String(r.name).toLowerCase().includes(search.toLowerCase()))
		return { win, freeRooms: freeRoomList }
	})

	const resources = (rooms||[]).map((r:any)=> ({ name: r.name }))
	const dataByResource: { resource: { name: string }; freeWindows: string[] }[] = resources
		.filter((res: { name: string })=> !search.trim() || res.name.toLowerCase().includes(search.toLowerCase()))
		.map((res: { name: string })=>{
			const freeWindows = windows.filter((w)=>{
				if (selectedWindow !== 'all') { const [s,e] = selectedWindow.split('|'); if (w.startTime!==s || w.endTime!==e) return false }
				const busy = slotsForDay.some((s:any)=> s.room===res.name && s.startTime===w.startTime && s.endTime===w.endTime)
				return !busy
			}).map((w)=> `${fmt(w.startTime)} - ${fmt(w.endTime)}`)
			return { resource: res, freeWindows }
		})

	const filteredWindows = selectedWindow==='all' ? dataByWindow : dataByWindow.filter(({win})=> `${win.startTime}|${win.endTime}`===selectedWindow)

	return (
		<DashboardLayout>
			<div className="p-6 lg:p-8 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Free Rooms</h1>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={()=>setCurrentDay((d:number)=> (d+6)%7)}>Previous</Button>
						<Badge variant="secondary">{dayName(currentDay)}</Badge>
						<Button variant="outline" size="sm" onClick={()=>setCurrentDay((d:number)=> (d+1)%7)}>Next</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
					<div>
						<label className="text-xs text-gray-600">Group by</label>
						<Select value={groupBy} onValueChange={(v)=> setGroupBy(v as any)}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="window">Time window</SelectItem>
								<SelectItem value="resource">Room</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<label className="text-xs text-gray-600">Time window</label>
						<Select value={selectedWindow} onValueChange={(v)=> setSelectedWindow(v)}>
							<SelectTrigger><SelectValue placeholder="All windows" /></SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All windows</SelectItem>
								{windows.map((w,idx)=> (
									<SelectItem key={idx} value={`${w.startTime}|${w.endTime}`}>{fmt(w.startTime)} - {fmt(w.endTime)}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<label className="text-xs text-gray-600">Search</label>
						<Input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Search room" />
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Availability</CardTitle>
						<CardDescription>Based on current timetables</CardDescription>
					</CardHeader>
					<CardContent>
						{windows.length===0 ? (
							<div className="text-sm text-gray-600">No time windows today.</div>
						) : groupBy==='window' ? (
							<div className="space-y-3">
								{filteredWindows.map(({win, freeRooms}, idx)=> (
									<div key={idx} className="p-3 border rounded-lg">
										<div className="flex items-center justify-between mb-1">
											<div className="font-medium text-sm">{fmt(win.startTime)} - {fmt(win.endTime)}</div>
											<Badge variant="outline" className="text-xs">{freeRooms.length} free</Badge>
										</div>
										<div className="text-xs text-gray-700">{freeRooms.length>0 ? freeRooms.map((r:any)=>r.name).join(', ') : 'None'}</div>
									</div>
								))}
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{dataByResource.map(({resource, freeWindows}: { resource: { name: string }; freeWindows: string[] }, idx: number)=> (
									<div key={idx} className="p-3 border rounded-lg">
										<div className="flex items-center justify-between mb-1">
											<div className="font-medium text-sm">{resource.name}</div>
											<Badge variant="outline" className="text-xs">Room</Badge>
										</div>
										<div className="text-xs text-gray-700">{freeWindows.length>0? freeWindows.join(', '): 'Not free in selected day/window'}</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
} 