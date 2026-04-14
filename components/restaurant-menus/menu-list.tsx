"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { RestaurantMenu, MenuTemplate } from "@/lib/restaurant-menus/types"
import { TemplatePreview } from "@/components/restaurant-menus/template-preview"
import {
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  LayoutTemplate,
  ChevronRight,
  Clock,
} from "lucide-react"
import { useRouter } from "next/navigation"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

interface CreateMenuDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (menu: RestaurantMenu) => void
}

function CreateMenuDialog({ open, onOpenChange, onCreate }: CreateMenuDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/restaurant-menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { menu } = await res.json()
      toast({ title: "Menu created", description: `"${menu.name}" is ready to edit.` })
      onCreate(menu)
      setName("")
      setDescription("")
      onOpenChange(false)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Menu</DialogTitle>
          <DialogDescription>Give your menu a name to get started. You can add sections and items next.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-1 block">Menu Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lunch Menu, Dinner Menu" />
          </div>
          <div>
            <Label className="text-sm mb-1 block">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description…" rows={2} className="resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {creating ? "Creating…" : "Create Menu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MenuList() {
  const { toast } = useToast()
  const router = useRouter()
  const [menus, setMenus] = useState<RestaurantMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState<RestaurantMenu | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchMenus = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/restaurant-menus")
      if (!res.ok) throw new Error("Failed to fetch menus")
      const data = await res.json()
      setMenus(data.menus || [])
    } catch {
      toast({ title: "Error", description: "Failed to load menus", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMenus() }, [])

  const handleCreated = (menu: RestaurantMenu) => {
    router.push(`/dashboard/restaurant-menus/${menu.id}`)
  }

  const handleDelete = async () => {
    if (!deletingMenu) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/restaurant-menus/${deletingMenu.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchMenus()
      setDeletingMenu(null)
      toast({ title: "Menu deleted" })
    } catch {
      toast({ title: "Error", description: "Failed to delete menu", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            Restaurant Menus
          </h1>
          <p className="text-muted-foreground mt-1">
            Create digital menu boards for your restaurant screens
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Menu
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : menus.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">No menus yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first digital menu board to display on your screens
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create First Menu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {menus.map((menu) => (
            <Card
              key={menu.id}
              className="overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/restaurant-menus/${menu.id}`)}
            >
              {/* Template preview thumbnail */}
              <div className="relative h-44 bg-muted overflow-hidden">
                {menu.menu_template ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <TemplatePreview
                      config={menu.menu_template.layout_config as any}
                      scale={menu.menu_template.orientation === "portrait" ? 0.1 : 0.18}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <LayoutTemplate className="w-10 h-10 opacity-40" />
                    <span className="text-xs">No template selected</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                <div className="absolute top-2 right-2">
                  <Badge variant={menu.status === "published" ? "default" : "secondary"} className="text-xs shadow-sm">
                    {menu.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{menu.name}</CardTitle>
                    {menu.description && (
                      <CardDescription className="line-clamp-1 mt-0.5">{menu.description}</CardDescription>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Updated {formatDate(menu.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {menu.menu_template && (
                      <span className="text-xs text-muted-foreground truncate max-w-28">
                        {menu.menu_template.name}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeletingMenu(menu) }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateMenuDialog open={showCreate} onOpenChange={setShowCreate} onCreate={handleCreated} />

      {/* Delete confirmation */}
      <Dialog open={!!deletingMenu} onOpenChange={() => setDeletingMenu(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu</DialogTitle>
            <DialogDescription>
              This will permanently delete the menu and all its sections and items.
            </DialogDescription>
          </DialogHeader>
          {deletingMenu && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{deletingMenu.name}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMenu(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete Menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
