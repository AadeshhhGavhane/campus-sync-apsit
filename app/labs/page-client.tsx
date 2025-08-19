"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit, Trash2, FlaskConical } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useLabs } from "@/hooks/use-app-data"

interface Lab { _id: string; name: string; abbreviation?: string; organizationId: string; createdBy: string; createdAt: string }

export default function LabsPageClient({ labs: initialLabs }: { labs: Lab[] }) {
  const { labs: cachedLabs } = useLabs()
  const [labs, setLabs] = useState<Lab[]>(initialLabs)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Lab | null>(null)
  const [formData, setFormData] = useState({ name: "", abbreviation: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cachedLabs && cachedLabs.length > 0) {
      setLabs(cachedLabs as any)
    }
  }, [cachedLabs])

  const reset = () => { setFormData({ name: "", abbreviation: "" }); setError(""); setEditing(null); setShowForm(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("")
    try {
      const url = editing ? `/api/labs/${editing._id}` : "/api/labs"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed to save lab")
      if (editing) setLabs(labs.map(l => l._id === editing._id ? { ...l, ...formData } as Lab : l)); else setLabs([...labs, data.lab])
      reset()
    } catch (err) { setError(err instanceof Error ? err.message : "An error occurred") } finally { setLoading(false) }
  }

  const handleEdit = (l: Lab) => { setEditing(l); setFormData({ name: l.name, abbreviation: l.abbreviation || "" }); setShowForm(true) }
  const handleDelete = async (id: string) => { if (!confirm("Delete this lab?")) return; const res = await fetch(`/api/labs/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to delete lab'); return } setLabs(labs.filter(l => l._id !== id)) }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="/home">Home</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Labs</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Labs</h1>
              <p className="text-gray-600 mt-2">Manage lab definitions</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Lab</Button>
          </div>

          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{editing ? 'Edit Lab' : 'Add New Lab'}</CardTitle>
                <CardDescription>{editing ? 'Update lab' : 'Create a new lab in your organization'}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Lab Name</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., DBMS Lab" required />
                    </div>
                    <div>
                      <Label htmlFor="abbr">Abbreviation</Label>
                      <Input id="abbr" value={formData.abbreviation} onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })} placeholder="e.g., DBMS" />
                    </div>
                  </div>

                  {error && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>)}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (editing ? 'Update Lab' : 'Create Lab')}</Button>
                    <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((l) => (
              <Card key={l._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-green-600" /><CardTitle className="text-lg">{l.name}</CardTitle></div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(l)} className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(l._id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <CardDescription className="text-sm">{l.abbreviation ? `Abbr: ${l.abbreviation}` : ''}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {labs.length === 0 && (
            <Card className="text-center py-12"><CardContent><FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No labs yet</h3><p className="text-gray-600 mb-4">Add your first lab.</p><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add First Lab</Button></CardContent></Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 