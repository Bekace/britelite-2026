"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { TemplatePreview } from "@/components/restaurant-menus/template-preview"
import type { LayoutConfig, MenuTemplate } from "@/lib/restaurant-menus/types"
import { defaultLayoutConfig, GOOGLE_FONTS } from "@/lib/restaurant-menus/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  Save,
  ImageIcon,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function DesignerSection({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
      >
        <span className="font-semibold text-sm text-foreground">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-md border border-border cursor-pointer p-0.5 bg-transparent"
        />
      </div>
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-8 font-mono text-sm"
        />
      </div>
    </div>
  )
}

interface TemplateDesignerProps {
  initial?: MenuTemplate | null
  onSave: (template: MenuTemplate) => void
  onCancel: () => void
}

type SegmentedOption = { value: string; label: string }

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function TemplateDesigner({ initial, onSave, onCancel }: TemplateDesignerProps) {
  const { toast } = useToast()
  const [name, setName] = useState(initial?.name || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [config, setConfig] = useState<LayoutConfig>(
    initial?.layout_config ? (initial.layout_config as LayoutConfig) : { ...defaultLayoutConfig }
  )
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(initial?.thumbnail_url || "")
  const [bgImageFile, setBgImageFile] = useState<File | null>(null)
  const [bgImagePreview, setBgImagePreview] = useState<string>(
    initial?.layout_config?.background?.image_url || ""
  )
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgImageInputRef = useRef<HTMLInputElement>(null)
  const jsonImportRef = useRef<HTMLInputElement>(null)

  const update = useCallback(<K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateNested = useCallback(
    <K extends keyof LayoutConfig>(section: K, key: keyof LayoutConfig[K], value: any) => {
      setConfig((prev) => ({
        ...prev,
        [section]: { ...(prev[section] as any), [key]: value },
      }))
    },
    []
  )

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBgImageFile(file)
    const url = URL.createObjectURL(file)
    setBgImagePreview(url)
    updateNested("background", "image_url", url)
    updateNested("background", "type", "image")
  }

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const handleExportJSON = () => {
    const data = JSON.stringify(config, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name || "template"}-layout.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        setConfig(parsed)
        toast({ title: "JSON imported", description: "Template config loaded successfully." })
      } catch {
        toast({ title: "Invalid JSON", description: "The file could not be parsed.", variant: "destructive" })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a template name.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      if (description) formData.append("description", description.trim())
      formData.append("is_active", String(isActive))

      // Strip blob URL from layout_config before sending — API will replace it with GCS URL
      const finalConfig = { ...config }
      if (bgImageFile) {
        // Clear the local blob URL; API will upload the file and inject the real GCS URL
        finalConfig.background = { ...finalConfig.background, image_url: "" }
      }
      formData.append("layout_config", JSON.stringify(finalConfig))
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile)
      if (bgImageFile) formData.append("bg_image", bgImageFile)

      const url = initial
        ? `/api/admin/menu-templates/${initial.id}`
        : "/api/admin/menu-templates"
      const method = initial ? "PATCH" : "POST"

      const response = await fetch(url, { method, body: formData })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to save template")
      }
      const { template } = await response.json()
      toast({ title: initial ? "Template updated" : "Template created", description: `"${template.name}" saved successfully.` })
      onSave(template)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const bg = config.background
  const typo = config.typography
  const lay = config.layout
  const promo = config.promo_area
  const anim = config.animations

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Left panel — controls */}
      <div className="w-[400px] flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">{initial ? "Edit Template" : "New Template"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Changes reflect live in the preview</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={jsonImportRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
            <Button variant="outline" size="sm" onClick={() => jsonImportRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={!name}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Template meta */}
          <DesignerSection title="Template Info">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Template Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dark Bistro" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description…" rows={2} className="resize-none" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Active (visible to users)</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              {/* Thumbnail */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Thumbnail (optional)</Label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                {thumbnailPreview ? (
                  <div className="relative w-full h-28 rounded-md overflow-hidden border border-border">
                    <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setThumbnailPreview(""); setThumbnailFile(null) }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-20 border-2 border-dashed border-border rounded-md flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Upload thumbnail
                  </button>
                )}
              </div>
            </div>
          </DesignerSection>

          {/* Orientation */}
          <DesignerSection title="Orientation">
            <SegmentedControl
              options={[{ value: "landscape", label: "Landscape 16:9" }, { value: "portrait", label: "Portrait 9:16" }]}
              value={config.orientation}
              onChange={(v) => update("orientation", v as "landscape" | "portrait")}
            />
          </DesignerSection>

          {/* Background */}
          <DesignerSection title="Background">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                <SegmentedControl
                  options={[{ value: "solid", label: "Solid" }, { value: "gradient", label: "Gradient" }, { value: "image", label: "Image" }]}
                  value={bg.type}
                  onChange={(v) => updateNested("background", "type", v)}
                />
              </div>

              {bg.type === "solid" && (
                <ColorField label="Background Color" value={bg.color || "#1a1a1a"} onChange={(v) => updateNested("background", "color", v)} />
              )}

              {bg.type === "gradient" && (
                <div className="space-y-3">
                  <ColorField label="From" value={bg.gradient_from || "#1a1a1a"} onChange={(v) => updateNested("background", "gradient_from", v)} />
                  <ColorField label="To" value={bg.gradient_to || "#2d2d2d"} onChange={(v) => updateNested("background", "gradient_to", v)} />
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Direction</Label>
                    <Select value={bg.gradient_direction || "to-bottom"} onValueChange={(v) => updateNested("background", "gradient_direction", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to-bottom">Top to Bottom</SelectItem>
                        <SelectItem value="to-right">Left to Right</SelectItem>
                        <SelectItem value="to-bottom-right">Diagonal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {bg.type === "image" && (
                <div className="space-y-3">
                  <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                  {bgImagePreview ? (
                    <div className="relative w-full h-28 rounded-md overflow-hidden border border-border">
                      <img src={bgImagePreview} alt="Background" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setBgImagePreview("")
                          setBgImageFile(null)
                          updateNested("background", "image_url", undefined)
                        }}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => bgImageInputRef.current?.click()}
                      className="w-full h-20 border-2 border-dashed border-border rounded-md flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Upload background image
                    </button>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Image Position</Label>
                    <Select value={bg.image_position || "fill"} onValueChange={(v) => updateNested("background", "image_position", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fill">Fill (Cover)</SelectItem>
                        <SelectItem value="center">Centered</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Overlay Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bg.overlay_color || "#000000"}
                          onChange={(e) => updateNested("background", "overlay_color", e.target.value)}
                          className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-transparent"
                        />
                        <span className="text-xs font-mono text-muted-foreground">{bg.overlay_color || "#000000"}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Overlay Opacity</span>
                        <span>{Math.round((bg.overlay_opacity ?? 0.5) * 100)}%</span>
                      </div>
                      <Slider
                        min={0} max={1} step={0.05}
                        value={[bg.overlay_opacity ?? 0.5]}
                        onValueChange={([v]) => updateNested("background", "overlay_opacity", v)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DesignerSection>

          {/* Typography */}
          <DesignerSection title="Typography">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Heading Font</Label>
                <Select value={typo.font_heading} onValueChange={(v) => updateNested("typography", "font_heading", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {GOOGLE_FONTS.map((f) => (
                      <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Body Font</Label>
                <Select value={typo.font_body} onValueChange={(v) => updateNested("typography", "font_body", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {GOOGLE_FONTS.map((f) => (
                      <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Size Scale</Label>
                <SegmentedControl
                  options={[{ value: "small", label: "S" }, { value: "medium", label: "M" }, { value: "large", label: "L" }, { value: "xl", label: "XL" }]}
                  value={typo.size_scale}
                  onChange={(v) => updateNested("typography", "size_scale", v as any)}
                />
              </div>
              <ColorField label="Text Color" value={typo.text_color} onChange={(v) => updateNested("typography", "text_color", v)} />
              <ColorField label="Price Color" value={typo.price_color} onChange={(v) => updateNested("typography", "price_color", v)} />
            </div>
          </DesignerSection>

          {/* Accent */}
          <DesignerSection title="Accent & Branding">
            <div className="space-y-3">
              <ColorField label="Accent Color" value={config.accent_color} onChange={(v) => update("accent_color", v)} />
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Border Radius</Label>
                <SegmentedControl
                  options={[{ value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "pill", label: "Pill" }]}
                  value={lay.border_radius}
                  onChange={(v) => updateNested("layout", "border_radius", v as any)}
                />
              </div>
            </div>
          </DesignerSection>

          {/* Layout */}
          <DesignerSection title="Layout">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Columns</Label>
                <SegmentedControl
                  options={[{ value: "1", label: "1 Column" }, { value: "2", label: "2 Columns" }, { value: "3", label: "3 Columns" }]}
                  value={String(lay.columns)}
                  onChange={(v) => updateNested("layout", "columns", parseInt(v) as 1 | 2 | 3)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Header Style</Label>
                <Select value={lay.header_style} onValueChange={(v) => updateNested("layout", "header_style", v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo-left">Logo Left + Title Right</SelectItem>
                    <SelectItem value="logo-center">Logo Centered</SelectItem>
                    <SelectItem value="title-only">Title Only</SelectItem>
                    <SelectItem value="none">No Header</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Item Card Style</Label>
                <SegmentedControl
                  options={[{ value: "minimal", label: "Minimal" }, { value: "standard", label: "Standard" }, { value: "rich", label: "Rich" }]}
                  value={lay.item_style}
                  onChange={(v) => updateNested("layout", "item_style", v as any)}
                />
              </div>
              {lay.item_style === "rich" && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Show Item Images</Label>
                  <Switch
                    checked={lay.show_item_image}
                    onCheckedChange={(v) => updateNested("layout", "show_item_image", v)}
                  />
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Section Separator</Label>
                <SegmentedControl
                  options={[{ value: "bold-label", label: "Bold" }, { value: "subtle-divider", label: "Subtle" }, { value: "none", label: "None" }]}
                  value={lay.section_style}
                  onChange={(v) => updateNested("layout", "section_style", v as any)}
                />
              </div>
            </div>
          </DesignerSection>

          {/* Promo Area */}
          <DesignerSection title="Promo Area" defaultOpen={false}>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Position</Label>
                <SegmentedControl
                  options={[{ value: "none", label: "None" }, { value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }]}
                  value={promo.position}
                  onChange={(v) => updateNested("promo_area", "position", v as any)}
                />
              </div>
              {promo.position !== "none" && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Style</Label>
                  <SegmentedControl
                    options={[{ value: "banner", label: "Banner" }, { value: "card", label: "Card" }, { value: "full-bleed", label: "Full Bleed" }]}
                    value={promo.style}
                    onChange={(v) => updateNested("promo_area", "style", v as any)}
                  />
                </div>
              )}
            </div>
          </DesignerSection>

          {/* Animations */}
          <DesignerSection title="Animations" defaultOpen={false}>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Entrance Effect</Label>
                <Select value={anim.entrance} onValueChange={(v) => updateNested("animations", "entrance", v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stagger-fade">Stagger Fade</SelectItem>
                    <SelectItem value="slide-up">Slide Up</SelectItem>
                    <SelectItem value="zoom-in">Zoom In</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Featured Item Effect</Label>
                <Select value={anim.featured_item} onValueChange={(v) => updateNested("animations", "featured_item", v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="glow-pulse">Glow Pulse</SelectItem>
                    <SelectItem value="shimmer">Shimmer</SelectItem>
                    <SelectItem value="ken-burns">Ken Burns (on image)</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Background Effect</Label>
                <Select value={anim.background_effect} onValueChange={(v) => updateNested("animations", "background_effect", v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="parallax">Subtle Parallax</SelectItem>
                    <SelectItem value="vignette-pulse">Vignette Pulse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DesignerSection>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : initial ? "Update Template" : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Right panel — live preview */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background">
          <div>
            <span className="font-semibold text-sm text-foreground">Live Preview</span>
            <span className="text-xs text-muted-foreground ml-3">
              {config.orientation === "landscape" ? "1920 × 1080" : "1080 × 1920"} — updates in real time
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sample data</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="shadow-2xl">
            <TemplatePreview config={config} scale={config.orientation === "landscape" ? 0.38 : 0.32} />
          </div>
        </div>
        {/* Font loader */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(config.typography.font_heading)}:wght@400;600;700&family=${encodeURIComponent(config.typography.font_body)}:wght@400;500;600&display=swap');
        `}</style>
      </div>
    </div>
  )
}
