"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Upload,
  FileImage,
  FileText,
  X,
  CheckCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { MenuSection, MenuItem } from "@/lib/restaurant-menus/types"

// ─── Mock Data ─────────────────────────────────────────────────────────────────
// This represents what Gemini will return when wired. Replace with real API call.

const MOCK_EXTRACTED_DATA: ExtractedMenu = {
  restaurant_name: "Burger Palace",
  sections: [
    {
      name: "Starters",
      items: [
        {
          name: "Caesar Salad",
          description: "Romaine lettuce, parmesan, house-made croutons and caesar dressing",
          price: "$9.99",
          tags: ["vegan"],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
        {
          name: "Crispy Wings",
          description: "8 pieces, choice of buffalo, BBQ or honey garlic sauce",
          price: "$13.99",
          tags: ["spicy"],
          variation_prices: { "6 pcs": "$9.99", "12 pcs": "$18.99" },
          is_featured: true,
          is_available: true,
        },
        {
          name: "Loaded Nachos",
          description: "Tortilla chips, melted cheese, jalapeños, sour cream and guacamole",
          price: "$11.99",
          tags: ["spicy", "gluten_free"],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
      ],
    },
    {
      name: "Main Course",
      items: [
        {
          name: "Classic Smash Burger",
          description: "Double smash patty, american cheese, pickles, onion, special sauce on brioche bun",
          price: "$16.99",
          tags: [],
          variation_prices: { Single: "$12.99", Double: "$16.99", Triple: "$20.99" },
          is_featured: true,
          is_available: true,
        },
        {
          name: "BBQ Bacon Burger",
          description: "Beef patty, crispy bacon, cheddar cheese, BBQ sauce, caramelised onion",
          price: "$18.99",
          tags: [],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
        {
          name: "Mushroom Swiss Burger",
          description: "Beef patty, sautéed mushrooms, swiss cheese, garlic aioli",
          price: "$17.99",
          tags: [],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
        {
          name: "Vegan Beyond Burger",
          description: "Beyond meat patty, lettuce, tomato, pickles, vegan mayo, brioche-style bun",
          price: "$17.99",
          tags: ["vegan"],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
      ],
    },
    {
      name: "Sides",
      items: [
        {
          name: "Truffle Fries",
          description: "Crispy fries tossed in truffle oil and parmesan",
          price: "$7.99",
          tags: [],
          variation_prices: { Regular: "$7.99", Large: "$9.99" },
          is_featured: false,
          is_available: true,
        },
        {
          name: "Sweet Potato Fries",
          description: "Crispy sweet potato fries with chipotle dipping sauce",
          price: "$6.99",
          tags: ["gluten_free"],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
        {
          name: "Onion Rings",
          description: "Beer-battered onion rings, ranch dipping sauce",
          price: "$6.99",
          tags: [],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
      ],
    },
    {
      name: "Desserts",
      items: [
        {
          name: "Chocolate Lava Cake",
          description: "Warm chocolate cake with molten center, vanilla ice cream",
          price: "$8.99",
          tags: [],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
        {
          name: "Salted Caramel Shake",
          description: "Thick shake with salted caramel, whipped cream and caramel drizzle",
          price: "$7.99",
          tags: [],
          variation_prices: {},
          is_featured: false,
          is_available: true,
        },
      ],
    },
  ],
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedItem {
  name: string
  description?: string
  price?: string
  tags: string[]
  variation_prices: Record<string, string>
  is_featured: boolean
  is_available: boolean
}

interface ExtractedSection {
  name: string
  items: ExtractedItem[]
}

interface ExtractedMenu {
  restaurant_name?: string
  sections: ExtractedSection[]
}

type ImportStep = "upload" | "processing" | "review"

const PROCESSING_STEPS = [
  { label: "Reading file contents…", duration: 800 },
  { label: "Identifying menu structure…", duration: 900 },
  { label: "Extracting sections and items…", duration: 1100 },
  { label: "Parsing prices and descriptions…", duration: 900 },
  { label: "Validating extracted data…", duration: 600 },
]

const TAG_META: Record<string, { label: string; color: string }> = {
  spicy: { label: "Spicy", color: "bg-red-500/15 text-red-600 border-red-500/30" },
  vegan: { label: "Vegan", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  gluten_free: { label: "Gluten Free", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  new: { label: "New", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function UploadStep({
  onFileSelected,
}: {
  onFileSelected: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFile = (file: File) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type)) return
    setSelectedFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const fileIcon = selectedFile?.type === "application/pdf" ? FileText : FileImage
  const FileIcon = fileIcon

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : selectedFile
            ? "border-emerald-500 bg-emerald-500/5 cursor-default"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-4 p-5"
            >
              <div className="w-12 h-12 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <FileIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type.split("/")[1].toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-14 gap-4 px-6 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Drop your menu file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse · PDF, JPG, PNG, WEBP supported
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">Max 10 MB</Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info box */}
      <div className="rounded-lg bg-muted/50 border border-border p-4 flex gap-3">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">How it works</p>
          <p>Upload a photo or PDF of your existing printed menu. Gemini AI will extract all sections, items, descriptions and prices automatically. You can review and edit everything before it gets added to your menu.</p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          disabled={!selectedFile}
          onClick={() => selectedFile && onFileSelected(selectedFile)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Extract Menu with AI
        </Button>
      </div>
    </div>
  )
}

function ProcessingStep({ onComplete }: { onComplete: (data: ExtractedMenu) => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [done, setDone] = useState(false)

  // Simulate processing steps
  useState(() => {
    let accumulated = 0
    PROCESSING_STEPS.forEach((step, idx) => {
      accumulated += step.duration
      setTimeout(() => {
        setCurrentStep(idx + 1)
        if (idx === PROCESSING_STEPS.length - 1) {
          setTimeout(() => {
            setDone(true)
            setTimeout(() => onComplete(MOCK_EXTRACTED_DATA), 600)
          }, 300)
        }
      }, accumulated)
    })
  })

  return (
    <div className="py-6 space-y-8">
      {/* Animated icon */}
      <div className="flex justify-center">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {done
              ? <CheckCircle className="w-7 h-7 text-emerald-500" />
              : <Sparkles className="w-6 h-6 text-primary" />
            }
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="font-semibold text-foreground text-lg">
          {done ? "Extraction complete!" : "Analyzing your menu…"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {done ? "Review your extracted items below" : "Gemini AI is reading your menu file"}
        </p>
      </div>

      {/* Step list */}
      <div className="space-y-3 max-w-sm mx-auto">
        {PROCESSING_STEPS.map((step, idx) => {
          const isComplete = currentStep > idx
          const isActive = currentStep === idx
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: isComplete || isActive ? 1 : 0.3 }}
              className="flex items-center gap-3"
            >
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                isComplete ? "bg-emerald-500" : isActive ? "bg-primary/20" : "bg-muted"
              )}>
                {isComplete
                  ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                  : isActive
                  ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                }
              </div>
              <span className={cn(
                "text-sm transition-colors",
                isComplete ? "text-foreground" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

interface ReviewItemRowProps {
  item: ExtractedItem
  index: number
  onUpdate: (updated: ExtractedItem) => void
  onRemove: () => void
}

function ReviewItemRow({ item, index, onUpdate, onRemove }: ReviewItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(item.name)

  const toggleTag = (tag: string) => {
    const tags = item.tags.includes(tag)
      ? item.tags.filter((t) => t !== tag)
      : [...item.tags, tag]
    onUpdate({ ...item, tags })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "rounded-lg border transition-colors",
        item.is_featured ? "border-primary/30 bg-primary/5" : "border-border bg-background"
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          }
          <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
          {item.is_featured && (
            <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30 border flex-shrink-0">Featured</Badge>
          )}
          {item.tags.map((tag) => TAG_META[tag] && (
            <Badge key={tag} variant="outline" className={cn("text-xs border flex-shrink-0", TAG_META[tag].color)}>
              {TAG_META[tag].label}
            </Badge>
          ))}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.price && (
            <span className="text-sm font-semibold text-foreground">{item.price}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded edit fields */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block text-muted-foreground">Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => onUpdate({ ...item, name: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block text-muted-foreground">Price</Label>
                  <Input
                    value={item.price || ""}
                    onChange={(e) => onUpdate({ ...item, price: e.target.value })}
                    placeholder="$0.00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Description</Label>
                <Input
                  value={item.description || ""}
                  onChange={(e) => onUpdate({ ...item, description: e.target.value })}
                  placeholder="Item description…"
                  className="h-8 text-sm"
                />
              </div>
              {/* Tags */}
              <div>
                <Label className="text-xs mb-1.5 block text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(TAG_META).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleTag(key)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
                        item.tags.includes(key)
                          ? cn("border", meta.color)
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Toggles */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.is_featured}
                    onCheckedChange={(v) => onUpdate({ ...item, is_featured: v })}
                  />
                  <Label className="text-xs text-muted-foreground">Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.is_available}
                    onCheckedChange={(v) => onUpdate({ ...item, is_available: v })}
                  />
                  <Label className="text-xs text-muted-foreground">Available</Label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ReviewStep({
  data,
  onConfirm,
  onRestart,
  saving,
}: {
  data: ExtractedMenu
  onConfirm: (sections: ExtractedSection[]) => void
  onRestart: () => void
  saving: boolean
}) {
  const [sections, setSections] = useState<ExtractedSection[]>(data.sections)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>(
    Object.fromEntries(data.sections.map((_, i) => [i, true]))
  )

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  const updateItem = (sIdx: number, iIdx: number, updated: ExtractedItem) => {
    setSections((prev) => prev.map((s, si) =>
      si !== sIdx ? s : { ...s, items: s.items.map((item, ii) => ii !== iIdx ? item : updated) }
    ))
  }

  const removeItem = (sIdx: number, iIdx: number) => {
    setSections((prev) => prev.map((s, si) =>
      si !== sIdx ? s : { ...s, items: s.items.filter((_, ii) => ii !== iIdx) }
    ))
  }

  const updateSectionName = (sIdx: number, name: string) => {
    setSections((prev) => prev.map((s, si) => si !== sIdx ? s : { ...s, name }))
  }

  const removeSection = (sIdx: number) => {
    setSections((prev) => prev.filter((_, si) => si !== sIdx))
  }

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-foreground">
            {sections.length} sections · {totalItems} items extracted
            {data.restaurant_name && (
              <span className="text-muted-foreground font-normal"> from {data.restaurant_name}</span>
            )}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRestart} className="gap-1.5 text-muted-foreground h-7 text-xs">
          <RefreshCw className="w-3 h-3" />
          Re-import
        </Button>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Review the extracted data before importing. Click any item to expand and edit its details. Remove anything that looks incorrect.</p>
      </div>

      {/* Sections */}
      <div className="space-y-4 max-h-[46vh] overflow-y-auto pr-1">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="rounded-xl border border-border overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
              <button
                type="button"
                onClick={() => toggleSection(sIdx)}
                className="flex-1 flex items-center gap-2 text-left"
              >
                {expandedSections[sIdx]
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
                <Input
                  value={section.name}
                  onChange={(e) => { e.stopPropagation(); updateSectionName(sIdx, e.target.value) }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 text-sm font-semibold border-transparent bg-transparent focus:bg-background focus:border-border px-1 max-w-48"
                />
                <Badge variant="outline" className="text-xs font-normal flex-shrink-0">
                  {section.items.length} items
                </Badge>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                onClick={() => removeSection(sIdx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Items */}
            <AnimatePresence>
              {expandedSections[sIdx] && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    <AnimatePresence mode="popLayout">
                      {section.items.map((item, iIdx) => (
                        <ReviewItemRow
                          key={`${sIdx}-${iIdx}-${item.name}`}
                          item={item}
                          index={iIdx}
                          onUpdate={(updated) => updateItem(sIdx, iIdx, updated)}
                          onRemove={() => removeItem(sIdx, iIdx)}
                        />
                      ))}
                    </AnimatePresence>
                    {section.items.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        All items removed from this section
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-1 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {totalItems} items will be added to your menu
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRestart} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(sections)}
            disabled={saving || totalItems === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
            ) : (
              <><Plus className="w-4 h-4" /> Import {totalItems} Items</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface MenuImportProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  menuId: string
  onImported: (sections: ExtractedSection[]) => void | Promise<void>
}

export function MenuImport({ open, onOpenChange, menuId, onImported }: MenuImportProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<ImportStep>("upload")
  const [extractedData, setExtractedData] = useState<ExtractedMenu | null>(null)
  const [saving, setSaving] = useState(false)

  const handleFileSelected = (_file: File) => {
    setStep("processing")
  }

  const handleExtractionComplete = (data: ExtractedMenu) => {
    setExtractedData(data)
    setStep("review")
  }

  const handleConfirm = async (sections: ExtractedSection[]) => {
    // TODO: wire to real API — POST sections + items to /api/restaurant-menus/${menuId}/sections
    setSaving(true)
    await new Promise((r) => setTimeout(r, 1200)) // simulate save
    setSaving(false)
    toast({
      title: "Menu imported",
      description: `${sections.reduce((s, sec) => s + sec.items.length, 0)} items added across ${sections.length} sections.`,
    })
    onImported(sections)
    handleClose()
  }

  const handleRestart = () => {
    setStep("upload")
    setExtractedData(null)
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep("upload")
      setExtractedData(null)
    }, 300)
  }

  const stepTitle = {
    upload: "Import Menu from File",
    processing: "Extracting Menu Data",
    review: "Review Extracted Items",
  }[step]

  const stepDescription = {
    upload: "Upload a photo or PDF of your printed menu. AI will extract all items automatically.",
    processing: "Please wait while Gemini AI reads and structures your menu content.",
    review: "Review and edit the extracted data before adding it to your menu.",
  }[step]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && step !== "processing") handleClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle>{stepTitle}</DialogTitle>
          </div>
          <DialogDescription>{stepDescription}</DialogDescription>

          {/* Step progress */}
          <div className="flex items-center gap-2 pt-1">
            {(["upload", "processing", "review"] as ImportStep[]).map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : (["upload", "processing", "review"].indexOf(step) > idx)
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {["upload", "processing", "review"].indexOf(step) > idx
                    ? <CheckCircle className="w-3.5 h-3.5" />
                    : idx + 1
                  }
                </div>
                <span className={cn(
                  "text-xs capitalize",
                  step === s ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {s === "upload" ? "Upload" : s === "processing" ? "Processing" : "Review"}
                </span>
                {idx < 2 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <UploadStep onFileSelected={handleFileSelected} />
              </motion.div>
            )}
            {step === "processing" && (
              <motion.div key="processing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ProcessingStep onComplete={handleExtractionComplete} />
              </motion.div>
            )}
            {step === "review" && extractedData && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ReviewStep
                  data={extractedData}
                  onConfirm={handleConfirm}
                  onRestart={handleRestart}
                  saving={saving}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
