"use client"

import React from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTimetables, useUser } from '@/hooks/use-app-data'

const dayName = (i: number) => ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][i]
const fmt = (t: string) => { const [h,m] = t.split(':').map(Number); const ap = h>=12? 'PM':'AM'; const hh=(h%12)||12; return `${hh}:${String(m).padStart(2,'0')} ${ap}` }

export default function FacultyAvailabilityClient() {
	const { user } = useUser()
	const { timetables } = useTimetables()
	const [currentDay, setCurrentDay] = React.useState<number>((new Date()).getDay())
	const [search, setSearch] = React.useState<string>("")
	const [groupBy, setGroupBy] = React.useState<'window'|'faculty'>('window')
	const [selectedWindow, setSelectedWindow] = React.useState<string>('all') // key: start|end

	const slotsForDay = timetables.flatMap((t: any) => (t.slots||[]).filter((s: any) => (s.dayOfWeek||'').toLowerCase()===dayName(currentDay).toLowerCase()))
	const windowsSet = new Set<string>(slotsForDay.map((s:any)=>`${s.startTime}|${s.endTime}`))
	const windows = Array.from(windowsSet).map((k: string)=>({ startTime: k.split('|')[0], endTime: k.split('|')[1] }))
		.sort((a,b)=> (a.startTime.localeCompare(b.startTime)))

	// Pool of all faculty seen in timetables for that day
	const pool = new Map<string,string>()
	slotsForDay.forEach((s:any)=>{ if (s.facultyUserId && s.faculty) pool.set(String(s.facultyUserId), s.faculty) })

	const byWindow = windows.map((win)=>{
		const busy = slotsForDay.filter((s:any)=> s.startTime===win.startTime && s.endTime===win.endTime)
		const busyIds = new Set<string>(busy.map((s:any)=> String(s.facultyUserId||'')).filter(Boolean))
		let free = Array.from(pool.entries()).filter(([id])=> !busyIds.has(id)).map(([_,name])=> name)
		if (search.trim()) free = free.filter((n)=> n.toLowerCase().includes(search.toLowerCase()))
		return { win, free }
	})

	const byFaculty = Array.from(pool.entries()).map(([id, name])=>{
		if (search.trim() && !name.toLowerCase().includes(search.toLowerCase())) return null
		const freeWindows = windows.filter((w)=>{
			if (selectedWindow !== 'all') { const [s,e] = selectedWindow.split('|'); if (w.startTime!==s || w.endTime!==e) return false }
			const isBusy = slotsForDay.some((s:any)=> String(s.facultyUserId||'')===id && s.startTime===w.startTime && s.endTime===w.endTime)
			return !isBusy
		}).map((w)=> `${fmt(w.startTime)} - ${fmt(w.endTime)}`)
		return { name, freeWindows }
	}).filter(Boolean) as { name: string; freeWindows: string[] }[]

	const filteredWindows = selectedWindow==='all' ? byWindow : byWindow.filter(({win})=> `${win.startTime}|${win.endTime}`===selectedWindow)

	return (
		<DashboardLayout>
			<div className="p-6 lg:p-8 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Free Faculty</h1>
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
								<SelectItem value="faculty">Faculty</SelectItem>
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
						<Input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Search faculty" />
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
								{filteredWindows.map(({win, free}, idx)=> (
									<div key={idx} className="p-3 border rounded-lg">
										<div className="flex items-center justify-between mb-1">
											<div className="font-medium text-sm">{fmt(win.startTime)} - {fmt(win.endTime)}</div>
											<Badge variant="outline" className="text-xs">{free.length} free</Badge>
										</div>
										<div className="text-xs text-gray-700">{free.length>0 ? free.join(', ') : 'No faculty free'}</div>
									</div>
								))}
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{byFaculty.map(({name, freeWindows}, idx)=> (
									<div key={idx} className="p-3 border rounded-lg">
										<div className="flex items-center justify-between mb-1">
											<div className="font-medium text-sm">{name}</div>
											<Badge variant="outline" className="text-xs">Faculty</Badge>
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