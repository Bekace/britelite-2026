"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { RestaurantMenu, MenuSection, MenuItem, MenuTemplate } from "@/lib/restaurant-menus/types"
import { TemplatePreview } from "@/components/restaurant-menus/template-preview"
import {
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  Star,
  StarOff,
  Eye,
  EyeOff,
  ChevronLeft,
  LayoutTemplate,
  CheckCircle,
  Flame,
  Leaf,
  WheatOff,
  Sparkles,
  ImageIcon,
  X,
  FileUp,
  ListVideo,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { MenuImport } from "@/components/restaurant-menus/menu-import"

const ITEM_TAGS = [
  { key: "spicy", label: "Spicy", icon: Flame, color: "text-red-500" },
  { key: "vegan", label: "Vegan", icon: Leaf, color: "text-emerald-500" },
  { key: "gluten_free", label: "Gluten Free", icon: WheatOff, color: "text-amber-500" },
  { key: "new", label: "New", icon: Sparkles, color: "text-blue-500" },
]

interface ItemFormProps {
  initial?: MenuItem | null
  sectionId: string
  onSave: (item: MenuItem) => void
  onCancel: () => void
}

function ItemForm({ initial, sectionId, onSave, onCancel }: ItemFormProps) {
  const { toast } = useToast()
  const [name, setName] = useState(initial?.name || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [price, setPrice] = useState(initial?.price || "")
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured || false)
  const [isAvailable, setIsAvailable] = useState(initial?.is_available ?? true)
  const [tags, setTags] = useState<string[]>(initial?.tags || [])
  const [variationPrices, setVariationPrices] = useState<Record<string, string>>(initial?.variation_prices || {})
  const [variationInput, setVariationInput] = useState("")
  const [saving, setSaving] = useState(false)

  const toggleTag = (key: string) =>
    setTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key])

  const addVariation = () => {
    const parts = variationInput.split(":")
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      setVariationPrices((prev) => ({ ...prev, [parts[0].trim()]: parts[1].trim() }))
      setVariationInput("")
    } else {
      toast({ title: "Format: Name: Price", description: 'e.g. "Small: $4.99"', variant: "destructive" })
    }
  }

  const removeVariation = (key: string) =>
    setVariationPrices((prev) => { const n = { ...prev }; delete n[key]; return n })

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: price.trim() || null,
        is_featured: isFeatured,
        is_available: isAvailable,
        tags,
        variation_prices: variationPrices,
      }
      let res: Response
      if (initial) {
        res = await fetch(`/api/restaurant-menus/items/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/restaurant-menus/sections/${sectionId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) throw new Error((await res.json()).error)
      const { item } = await res.json()
      onSave(item)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-2">
      <div>
        <Label className="text-sm mb-1 block">Item Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Caesar Salad" />
      </div>
      <div>
        <Label className="text-sm mb-1 block">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ingredients, preparation notes…" rows={2} className="resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm mb-1 block">Price</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$12.99" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Available</Label>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Featured</Label>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>
        </div>
      </div>
      {/* Tags */}
      <div>
        <Label className="text-sm mb-2 block">Tags</Label>
        <div className="flex flex-wrap gap-2">
          {ITEM_TAGS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleTag(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                tags.includes(key)
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", tags.includes(key) ? color : "")} />
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Variation prices */}
      <div>
        <Label className="text-sm mb-2 block">Variation Prices</Label>
        {Object.keys(variationPrices).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.entries(variationPrices).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="gap-1 pr-1">
                {k}: {v}
                <button type="button" onClick={() => removeVariation(k)} className="ml-0.5 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={variationInput}
            onChange={(e) => setVariationInput(e.target.value)}
            placeholder="Small: $4.99"
            className="text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariation() } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addVariation} className="shrink-0">Add</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Format: Name: Price (press Enter or Add)</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {saving ? "Saving…" : initial ? "Update Item" : "Add Item"}
        </Button>
      </div>
    </div>
  )
}

interface TemplateSelectorProps {
  currentTemplateId?: string | null
  onSelect: (templateId: string) => void
  onCancel: () => void
}

function TemplateSelector({ currentTemplateId, onSelect, onCancel }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<MenuTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(currentTemplateId || null)

  useEffect(() => {
    fetch("/api/restaurant-menus/templates")
      .then((r) => r.json())
      .then((d) => { setTemplates(d.templates || []); setLoading(false) })
  }, [])

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No templates available yet. Ask your admin to create some.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                "rounded-lg border-2 cursor-pointer overflow-hidden transition-all",
                selected === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
              )}
            >
              <div className="relative h-32 bg-muted overflow-hidden flex items-center justify-center">
                <TemplatePreview
                  config={t.layout_config as any}
                  scale={t.orientation === "portrait" ? 0.085 : 0.15}
                />
                {selected === t.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-primary drop-shadow-md" />
                  </div>
                )}
              </div>
              <div className="px-3 py-2">
                <p className="font-medium text-sm text-foreground">{t.name}</p>
                {t.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          Apply Template
        </Button>
      </div>
    </div>
  )
}

interface MenuBuilderProps {
  menuId: string
}

export function MenuBuilder({ menuId }: MenuBuilderProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [menu, setMenu] = useState<RestaurantMenu | null>(null)
  const [sections, setSections] = useState<MenuSection[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplateSheet, setShowTemplateSheet] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [addingSectionLoading, setAddingSectionLoading] = useState(false)
  const [editingSection, setEditingSection] = useState<MenuSection | null>(null)
  const [editSectionName, setEditSectionName] = useState("")
  const [deletingSection, setDeletingSection] = useState<MenuSection | null>(null)
  const [editingItem, setEditingItem] = useState<{ item: MenuItem | null; sectionId: string } | null>(null)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("")
  const [publishDuration, setPublishDuration] = useState(30)
  const [publishing, setPublishing] = useState(false)
  const [publishedPlaylists, setPublishedPlaylists] = useState<{ playlist_item_id: string; playlist_id: string; playlist_name: string }[]>([])

  const fetchMenu = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurant-menus/${menuId}`)
      if (!res.ok) throw new Error("Menu not found")
      const data = await res.json()
      setMenu(data.menu)
      const sorted = (data.menu.menu_sections || []).sort((a: MenuSection, b: MenuSection) => a.position - b.position)
      setSections(sorted.map((s: any) => ({
        ...s,
        menu_items: (s.menu_items || []).sort((a: MenuItem, b: MenuItem) => a.position - b.position),
      })))
    } catch {
      toast({ title: "Error", description: "Failed to load menu", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [menuId])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  // Fetch playlists and publish status when dialog opens
  useEffect(() => {
    if (showPublishDialog) {
      // Fetch user's playlists
      fetch("/api/playlists")
        .then((res) => res.json())
        .then((data) => setPlaylists(data.playlists || []))
        .catch(() => setPlaylists([]))

      // Fetch publish status
      fetch(`/api/restaurant-menus/${menuId}/publish`)
        .then((res) => res.json())
        .then((data) => setPublishedPlaylists(data.playlists || []))
        .catch(() => setPublishedPlaylists([]))
    }
  }, [showPublishDialog, menuId])

  const handlePublish = async () => {
    if (!selectedPlaylistId) {
      toast({ title: "Select a playlist", variant: "destructive" })
      return
    }
    setPublishing(true)
    try {
      const res = await fetch(`/api/restaurant-menus/${menuId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_id: selectedPlaylistId, duration: publishDuration }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      toast({ title: data.message })
      // Refresh published list
      const statusRes = await fetch(`/api/restaurant-menus/${menuId}/publish`)
      const statusData = await statusRes.json()
      setPublishedPlaylists(statusData.playlists || [])
      setSelectedPlaylistId("")
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to publish", variant: "destructive" })
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async (playlistItemId: string) => {
    try {
      const res = await fetch(`/api/restaurant-menus/${menuId}/publish?playlist_item_id=${playlistItemId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      setPublishedPlaylists((prev) => prev.filter((p) => p.playlist_item_id !== playlistItemId))
      toast({ title: "Removed from playlist" })
    } catch {
      toast({ title: "Error", description: "Failed to remove", variant: "destructive" })
    }
  }

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return
    setAddingSectionLoading(true)
    try {
      const res = await fetch(`/api/restaurant-menus/${menuId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectionName.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { section } = await res.json()
      setSections((prev) => [...prev, { ...section, menu_items: [] }])
      setNewSectionName("")
      setShowAddSection(false)
      toast({ title: "Section added" })
    } catch {
      toast({ title: "Error", description: "Failed to add section", variant: "destructive" })
    } finally {
      setAddingSectionLoading(false)
    }
  }

  const handleUpdateSection = async () => {
    if (!editingSection || !editSectionName.trim()) return
    try {
      const res = await fetch(`/api/restaurant-menus/sections/${editingSection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editSectionName.trim() }),
      })
      if (!res.ok) throw new Error()
      setSections((prev) => prev.map((s) => s.id === editingSection.id ? { ...s, name: editSectionName.trim() } : s))
      setEditingSection(null)
      toast({ title: "Section updated" })
    } catch {
      toast({ title: "Error", description: "Failed to update section", variant: "destructive" })
    }
  }

  const handleDeleteSection = async () => {
    if (!deletingSection) return
    try {
      const res = await fetch(`/api/restaurant-menus/sections/${deletingSection.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setSections((prev) => prev.filter((s) => s.id !== deletingSection.id))
      setDeletingSection(null)
      toast({ title: "Section deleted" })
    } catch {
      toast({ title: "Error", description: "Failed to delete section", variant: "destructive" })
    }
  }

  const handleItemSaved = (item: MenuItem, sectionId: string) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s
      const existing = s.menu_items?.find((i) => i.id === item.id)
      if (existing) {
        return { ...s, menu_items: s.menu_items?.map((i) => i.id === item.id ? item : i) }
      }
      return { ...s, menu_items: [...(s.menu_items || []), item] }
    }))
    setEditingItem(null)
    toast({ title: editingItem?.item ? "Item updated" : "Item added" })
  }

  const handleToggleItemAvailable = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/restaurant-menus/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !item.is_available }),
      })
      if (!res.ok) throw new Error()
      setSections((prev) => prev.map((s) => ({
        ...s,
        menu_items: s.menu_items?.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i),
      })))
    } catch {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" })
    }
  }

  const handleToggleItemFeatured = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/restaurant-menus/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !item.is_featured }),
      })
      if (!res.ok) throw new Error()
      setSections((prev) => prev.map((s) => ({
        ...s,
        menu_items: s.menu_items?.map((i) => i.id === item.id ? { ...i, is_featured: !i.is_featured } : i),
      })))
    } catch {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" })
    }
  }

  const handleDeleteItem = async () => {
    if (!deletingItem) return
    try {
      const res = await fetch(`/api/restaurant-menus/items/${deletingItem.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setSections((prev) => prev.map((s) => ({
        ...s,
        menu_items: s.menu_items?.filter((i) => i.id !== deletingItem.id),
      })))
      setDeletingItem(null)
      toast({ title: "Item deleted" })
    } catch {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" })
    }
  }

  const handleTemplateSelect = async (templateId: string) => {
    try {
      const res = await fetch(`/api/restaurant-menus/${menuId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      })
      if (!res.ok) throw new Error()
      const { menu: updated } = await res.json()
      setMenu(updated)
      setShowTemplateSheet(false)
      toast({ title: "Template applied" })
    } catch {
      toast({ title: "Error", description: "Failed to apply template", variant: "destructive" })
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "menu_logo")

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error()
      const { file_path } = await res.json()
      // file_path is already the full public GCS URL returned by the upload API
      const logoUrl = file_path

      // Update brand settings with logo URL
      const updateRes = await fetch(`/api/restaurant-menus/${menuId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_settings: {
            ...menu?.brand_settings,
            logo_url: logoUrl,
          },
        }),
      })
      if (!updateRes.ok) throw new Error()
      const { menu: updated } = await updateRes.json()
      setMenu(updated)
      toast({ title: "Logo uploaded successfully" })
    } catch {
      toast({ title: "Error", description: "Failed to upload logo", variant: "destructive" })
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!menu) return null

  const totalItems = sections.reduce((sum, s) => sum + (s.menu_items?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/restaurant-menus")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{menu.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={menu.status === "published" ? "default" : "secondary"} className="text-xs">
                {menu.status === "published" ? "Published" : "Draft"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {sections.length} sections · {totalItems} items
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImport(true)}
            className="gap-2"
          >
            <FileUp className="w-4 h-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateSheet(true)}
            className="gap-2"
          >
            <LayoutTemplate className="w-4 h-4" />
            {menu.menu_template ? menu.menu_template.name : "Choose Template"}
          </Button>
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                "border-border bg-background hover:bg-accent hover:text-accent-foreground",
                uploadingLogo && "opacity-50 pointer-events-none"
              )}>
                {menu.brand_settings?.logo_url ? (
                  <img
                    src={menu.brand_settings.logo_url}
                    alt="Logo"
                    className="w-5 h-5 object-contain rounded"
                  />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                {uploadingLogo ? "Uploading..." : menu.brand_settings?.logo_url ? "Change Logo" : "Add Logo"}
              </div>
            </label>
            {menu.brand_settings?.logo_url && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  const res = await fetch(`/api/restaurant-menus/${menuId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brand_settings: { ...menu.brand_settings, logo_url: null } }),
                  })
                  if (res.ok) {
                    const { menu: updated } = await res.json()
                    setMenu(updated)
                    toast({ title: "Logo removed" })
                  }
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPublishDialog(true)}
            className="gap-2"
          >
            <ListVideo className="w-4 h-4" />
            Publish
            {publishedPlaylists.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {publishedPlaylists.length}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/restaurant-menus/${menuId}/preview`)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">No sections yet</p>
              <p className="text-sm">Add your first menu section like Starters, Mains, Desserts</p>
            </div>
            <Button
              onClick={() => setShowAddSection(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Section
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={sections.map((s) => s.id)} className="space-y-3">
            {sections.map((section) => (
              <AccordionItem key={section.id} value={section.id} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-1 bg-muted/30">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  <AccordionTrigger className="flex-1 hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{section.name}</span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {section.menu_items?.length || 0} items
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setEditSectionName(section.name); setEditingSection(section) }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setDeletingSection(section) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <AccordionContent className="pb-0">
                  <div className="px-4 pb-4">
                    {/* Items list */}
                    <div className="space-y-2 mb-3 mt-2">
                      {(section.menu_items || []).map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                            !item.is_available && "opacity-50",
                            item.is_featured ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                          )}
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                              {item.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                              {item.tags?.map((tag) => {
                                const t = ITEM_TAGS.find((t) => t.key === tag)
                                if (!t) return null
                                const Icon = t.icon
                                return <Icon key={tag} className={cn("w-3.5 h-3.5 flex-shrink-0", t.color)} />
                              })}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                            )}
                            {Object.keys(item.variation_prices || {}).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {Object.entries(item.variation_prices).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.price && (
                              <span className="font-semibold text-sm text-foreground">{item.price}</span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleItemFeatured(item)}
                              title={item.is_featured ? "Remove featured" : "Mark as featured"}
                            >
                              {item.is_featured
                                ? <Star className="w-3.5 h-3.5 text-amber-500" />
                                : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleItemAvailable(item)}
                              title={item.is_available ? "Mark unavailable" : "Mark available"}
                            >
                              {item.is_available
                                ? <Eye className="w-3.5 h-3.5 text-emerald-500" />
                                : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingItem({ item, sectionId: section.id })}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingItem(item)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingItem({ item: null, sectionId: section.id })}
                      className="w-full gap-2 border-dashed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item to {section.name}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Add section button */}
        {sections.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowAddSection(true)}
            className="w-full gap-2 border-dashed"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </Button>
        )}
      </div>

      {/* Add section dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Section</DialogTitle></DialogHeader>
          <div>
            <Label className="text-sm mb-1 block">Section Name *</Label>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Starters, Main Course, Desserts"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSection() }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddSection(false); setNewSectionName("") }}>Cancel</Button>
            <Button onClick={handleAddSection} disabled={addingSectionLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {addingSectionLoading ? "Adding…" : "Add Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit section dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Section</DialogTitle></DialogHeader>
          <div>
            <Label className="text-sm mb-1 block">Section Name</Label>
            <Input value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleUpdateSection() }} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
            <Button onClick={handleUpdateSection} className="bg-emerald-500 hover:bg-emerald-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete section dialog */}
      <Dialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete <strong>{deletingSection?.name}</strong> and all its items. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSection(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSection}>Delete Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item form sheet */}
      <Sheet open={!!editingItem} onOpenChange={(v) => { if (!v) setEditingItem(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingItem?.item ? "Edit Item" : "Add Item"}</SheetTitle>
            <SheetDescription>
              {editingItem?.item ? "Update the item details below." : "Fill in the item details to add it to this section."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {editingItem && (
              <ItemForm
                initial={editingItem.item}
                sectionId={editingItem.sectionId}
                onSave={(item) => handleItemSaved(item, editingItem.sectionId)}
                onCancel={() => setEditingItem(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete item dialog */}
      <Dialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Item</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deletingItem?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteItem}>Delete Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <MenuImport
        open={showImport}
        onOpenChange={setShowImport}
        menuId={menuId}
        onImported={() => fetchMenu()}
      />

      {/* Template selector sheet */}
      <Sheet open={showTemplateSheet} onOpenChange={setShowTemplateSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Choose a Template</SheetTitle>
            <SheetDescription>Select the visual style for your menu board. You can change this at any time.</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <TemplateSelector
              currentTemplateId={menu.template_id}
              onSelect={handleTemplateSelect}
              onCancel={() => setShowTemplateSheet(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Publish to Playlist dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish to Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Currently published */}
            {publishedPlaylists.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Currently in playlists:</Label>
                <div className="space-y-2">
                  {publishedPlaylists.map((p) => (
                    <div key={p.playlist_item_id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm font-medium">{p.playlist_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUnpublish(p.playlist_item_id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add to playlist */}
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-sm">Add to playlist</Label>
              <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a playlist..." />
                </SelectTrigger>
                <SelectContent>
                  {playlists
                    .filter((pl) => !publishedPlaylists.some((pp) => pp.playlist_id === pl.id))
                    .map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <Label className="text-sm">Duration (seconds)</Label>
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={publishDuration}
                  onChange={(e) => setPublishDuration(parseInt(e.target.value) || 30)}
                />
                <p className="text-xs text-muted-foreground">How long to display this menu before advancing</p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Close</Button>
            <Button
              onClick={handlePublish}
              disabled={!selectedPlaylistId || publishing}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {publishing ? "Publishing..." : "Add to Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
