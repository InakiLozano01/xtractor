'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Category = { id: string; name: string; color: string }

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#71717a')

  const load = useCallback(() => {
    return fetch('/api/categories', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (data) setCats(data.categories || []) })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })
    if (!res.ok) {
      toast.error((await res.json()).error || 'Failed')
      return
    }
    toast.success('Category created')
    setName('')
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this category? Articles keep their data; they just lose the label.')) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      setCats((c) => c.filter((x) => x.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-fg">Organize your archive with custom labels.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Research" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-input bg-bg"
              />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {cats.length === 0 ? (
          <p className="text-sm text-muted-fg">No categories yet.</p>
        ) : (
          cats.map((c) => (
            <div key={c.id} className="flex items-center gap-1">
              <Badge style={{ backgroundColor: c.color + '22', color: c.color, borderColor: 'transparent' }} className="px-3 py-1">
                {c.name}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-fg" onClick={() => del(c.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
