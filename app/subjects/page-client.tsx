"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit, Trash2, BookOpen } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSubjects } from "@/hooks/use-app-data"

interface Subject {
	_id: string
	name: string
	abbreviation?: string
	category?: string
	organizationId: string
	createdBy: string
	createdAt: string
}

export default function SubjectsPageClient({ subjects: initialSubjects }: { subjects: Subject[] }) {
	const { subjects: cachedSubjects } = useSubjects()
	const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
	const [showForm, setShowForm] = useState(false)
	const [editing, setEditing] = useState<Subject | null>(null)
	const [formData, setFormData] = useState({ name: "", abbreviation: "", category: "" })
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (cachedSubjects && cachedSubjects.length > 0) {
			setSubjects(cachedSubjects as any)
		}
	}, [cachedSubjects])

	const reset = () => {
		setFormData({ name: "", abbreviation: "", category: "" })
		setError("")
		setEditing(null)
		setShowForm(false)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError("")
		try {
			const url = editing ? `/api/subjects/${editing._id}` : "/api/subjects"
			const method = editing ? "PUT" : "POST"
			const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
			const data = await res.json()
			if (!res.ok) throw new Error(data.error || "Failed to save subject")
			if (editing) {
				setSubjects(subjects.map(s => s._id === editing._id ? { ...s, ...formData } as Subject : s))
			} else {
				setSubjects([...subjects, data.subject])
			}
			reset()
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred")
		} finally {
			setLoading(false)
		}
	}

	const handleEdit = (s: Subject) => {
		setEditing(s)
		setFormData({ name: s.name, abbreviation: s.abbreviation || "", category: s.category || "" })
		setShowForm(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this subject?")) return
		const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" })
		if (!res.ok) {
			const data = await res.json().catch(() => ({}))
			alert(data.error || "Failed to delete subject")
			return
		}
		setSubjects(subjects.filter(s => s._id !== id))
	}

	return (
		<DashboardLayout>
			<div className="p-6 lg:p-8">
				<div className="max-w-6xl mx-auto">
					<Breadcrumb className="mb-6">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/home">Home</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Subjects</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
							<p className="text-gray-600 mt-2">Manage academic subjects</p>
						</div>
						<Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Add Subject
						</Button>
					</div>

					{showForm && (
						<Card className="mb-8">
							<CardHeader>
								<CardTitle>{editing ? "Edit Subject" : "Add New Subject"}</CardTitle>
								<CardDescription>{editing ? "Update subject" : "Create a new subject in your organization"}</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmit} className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<Label htmlFor="name">Subject Name</Label>
											<Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Data Structures" required />
										</div>
										<div>
											<Label htmlFor="abbr">Abbreviation</Label>
											<Input id="abbr" value={formData.abbreviation} onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })} placeholder="e.g., DS" />
										</div>
										<div>
											<Label htmlFor="category">Category</Label>
											<Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
												<SelectTrigger>
													<SelectValue placeholder="Select category" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="Core">Core</SelectItem>
													<SelectItem value="Elective">Elective</SelectItem>
													<SelectItem value="Honor">Honor</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>

									{error && (
										<Alert variant="destructive">
											<AlertCircle className="h-4 w-4" />
											<AlertDescription>{error}</AlertDescription>
										</Alert>
									)}

									<div className="flex gap-3">
										<Button type="submit" disabled={loading}>{loading ? "Saving..." : (editing ? "Update Subject" : "Create Subject")}</Button>
										<Button type="button" variant="outline" onClick={reset}>Cancel</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{subjects.map((s) => (
							<Card key={s._id} className="hover:shadow-md transition-shadow">
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<BookOpen className="h-5 w-5 text-purple-600" />
											<CardTitle className="text-lg">{s.name}</CardTitle>
										</div>
										<div className="flex gap-1">
											<Button variant="ghost" size="sm" onClick={() => handleEdit(s)} className="h-8 w-8 p-0">
												<Edit className="h-4 w-4" />
											</Button>
											<Button variant="ghost" size="sm" onClick={() => handleDelete(s._id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
									<CardDescription className="text-sm">{[s.abbreviation ? `Abbr: ${s.abbreviation}` : '', s.category ? `Category: ${s.category}` : ''].filter(Boolean).join(' • ')}</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>

					{subjects.length === 0 && (
						<Card className="text-center py-12">
							<CardContent>
								<BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">No subjects yet</h3>
								<p className="text-gray-600 mb-4">Get started by adding your first subject.</p>
								<Button onClick={() => setShowForm(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Add First Subject
								</Button>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</DashboardLayout>
	)
} 