"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit, Trash2, Layers } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

interface Batch { _id: string; name: string; organizationId: string; createdBy: string; createdAt: string }

export default function BatchesPageClient({ batches: initialBatches }: { batches: Batch[] }) {
  const [batches, setBatches] = useState<Batch[]>(initialBatches)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Batch | null>(null)
  const [formData, setFormData] = useState({ name: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const reset = () => { setFormData({ name: "" }); setError(""); setEditing(null); setShowForm(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("")
    try {
      const url = editing ? `/api/batches/${editing._id}` : "/api/batches"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed to save batch")
      if (editing) setBatches(batches.map(b => b._id === editing._id ? { ...b, ...formData } as Batch : b)); else setBatches([...batches, data.batch])
      reset()
    } catch (err) { setError(err instanceof Error ? err.message : "An error occurred") } finally { setLoading(false) }
  }

  const handleEdit = (b: Batch) => { setEditing(b); setFormData({ name: b.name }); setShowForm(true) }
  const handleDelete = async (id: string) => { if (!confirm("Delete this batch?")) return; const res = await fetch(`/api/batches/${id}`, { method: 'DELETE' }); if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to delete batch'); return } setBatches(batches.filter(b => b._id !== id)) }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="/home">Home</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Batches</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Batches</h1>
              <p className="text-gray-600 mt-2">Manage class batches</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Batch</Button>
          </div>

          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{editing ? 'Edit Batch' : 'Add New Batch'}</CardTitle>
                <CardDescription>{editing ? 'Update batch' : 'Create a new batch in your organization'}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Batch Name</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., A1, A2, C1" required />
                    </div>
                  </div>

                  {error && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>)}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (editing ? 'Update Batch' : 'Create Batch')}</Button>
                    <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((b) => (
              <Card key={b._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-amber-600" /><CardTitle className="text-lg">{b.name}</CardTitle></div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(b)} className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(b._id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {batches.length === 0 && (
            <Card className="text-center py-12"><CardContent><Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No batches yet</h3><p className="text-gray-600 mb-4">Add your first batch.</p><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add First Batch</Button></CardContent></Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 