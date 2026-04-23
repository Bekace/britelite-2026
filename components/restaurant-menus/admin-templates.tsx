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
import { useToast } from "@/hooks/use-toast"
import type { MenuTemplate } from "@/lib/restaurant-menus/types"
import { TemplateDesigner } from "@/components/restaurant-menus/template-designer"
import { TemplatePreview } from "@/components/restaurant-menus/template-preview"
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  ChefHat,
} from "lucide-react"

export function AdminTemplates() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<MenuTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "designer">("list")
  const [editingTemplate, setEditingTemplate] = useState<MenuTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<MenuTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/menu-templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      toast({ title: "Error", description: "Failed to load templates", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleNewTemplate = () => {
    setEditingTemplate(null)
    setView("designer")
  }

  const handleEditTemplate = (template: MenuTemplate) => {
    setEditingTemplate(template)
    setView("designer")
  }

  const handleDesignerSave = (template: MenuTemplate) => {
    fetchTemplates()
    setView("list")
    setEditingTemplate(null)
  }

  const handleDesignerCancel = () => {
    setView("list")
    setEditingTemplate(null)
  }

  const handleToggleActive = async (template: MenuTemplate) => {
    try {
      const res = await fetch(`/api/admin/menu-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !template.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update template")
      await fetchTemplates()
      toast({
        title: template.is_active ? "Template deactivated" : "Template activated",
        description: `"${template.name}" is now ${template.is_active ? "inactive" : "active"}.`,
      })
    } catch {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" })
    }
  }

  const handleDuplicate = async (template: MenuTemplate) => {
    try {
      const res = await fetch("/api/admin/menu-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          layout_config: template.layout_config,
          is_active: false,
          thumbnail_url: template.thumbnail_url,
        }),
      })
      if (!res.ok) throw new Error("Failed to duplicate template")
      await fetchTemplates()
      toast({ title: "Template duplicated", description: `A copy of "${template.name}" was created.` })
    } catch {
      toast({ title: "Error", description: "Failed to duplicate template", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deletingTemplate) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/menu-templates/${deletingTemplate.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete template")
      await fetchTemplates()
      setDeletingTemplate(null)
      toast({ title: "Template deleted", description: `"${deletingTemplate.name}" was removed.` })
    } catch {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  // Designer view — full screen
  if (view === "designer") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <TemplateDesigner
          initial={editingTemplate}
          onSave={handleDesignerSave}
          onCancel={handleDesignerCancel}
        />
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-primary" />
            Menu Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage visual templates for restaurant menu boards
          </p>
        </div>
        <Button onClick={handleNewTemplate} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">No templates yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first menu board template to get started
              </p>
            </div>
            <Button onClick={handleNewTemplate} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
              {/* Preview */}
              <div
                className="relative overflow-hidden bg-muted cursor-pointer"
                style={{ height: 200 }}
                onClick={() => handleEditTemplate(template)}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transform: "scale(0.95)", transformOrigin: "center" }}
                >
                  <TemplatePreview
                    config={template.layout_config as any}
                    scale={template.layout_config?.orientation === "portrait" ? 0.095 : 0.17}
                  />
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1.5 rounded-full">
                    Edit Template
                  </span>
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="line-clamp-2 mt-0.5">{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.layout_config?.orientation || "landscape"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Copy className="w-3 h-3" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(template)}
                    className="h-8 text-xs gap-1.5"
                  >
                    {template.is_active
                      ? <ToggleRight className="w-3 h-3 text-emerald-500" />
                      : <ToggleLeft className="w-3 h-3" />}
                    {template.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingTemplate(template)}
                    className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Restaurant menus using this template will lose their visual style.
            </DialogDescription>
          </DialogHeader>
          {deletingTemplate && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold text-foreground">{deletingTemplate.name}</p>
              {deletingTemplate.description && (
                <p className="text-sm text-muted-foreground mt-1">{deletingTemplate.description}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
