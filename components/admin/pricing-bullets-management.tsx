"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PricingBullet {
  id: string
  plan_id: string
  label: string
  sort_order: number
  is_visible: boolean
  created_at: string
  subscription_plans: { id: string; name: string } | null
}

interface Plan {
  id: string
  name: string
}

export function PricingBulletsManagement() {
  const [bullets, setBullets] = useState<PricingBullet[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string>("all")

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newPlanId, setNewPlanId] = useState("")
  const [newSortOrder, setNewSortOrder] = useState("0")
  const [creating, setCreating] = useState(false)

  // Edit dialog
  const [editingBullet, setEditingBullet] = useState<PricingBullet | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editSortOrder, setEditSortOrder] = useState("0")
  const [editVisible, setEditVisible] = useState(true)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deletingBullet, setDeletingBullet] = useState<PricingBullet | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [bulletsRes, plansRes] = await Promise.all([
        fetch("/api/admin/pricing-bullets"),
        fetch("/api/admin/plans"),
      ])
      const bulletsData = await bulletsRes.json()
      const plansData = await plansRes.json()
      setBullets(Array.isArray(bulletsData) ? bulletsData : [])
      // /api/admin/plans returns { plans: [...] }, not a bare array
      const plansArray = Array.isArray(plansData) ? plansData : (plansData?.plans ?? [])
      const activePlans = plansArray.filter((p: Plan & { is_active?: boolean }) => p.is_active !== false)
      setPlans(activePlans)
      if (activePlans.length > 0 && !newPlanId) {
        setNewPlanId(activePlans[0].id)
      }
    } catch {
      toast({ title: "Error", description: "Failed to load pricing bullets.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function openEdit(bullet: PricingBullet) {
    setEditingBullet(bullet)
    setEditLabel(bullet.label)
    setEditSortOrder(String(bullet.sort_order))
    setEditVisible(bullet.is_visible)
  }

  async function handleCreate() {
    if (!newLabel.trim() || !newPlanId) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/pricing-bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: newPlanId, label: newLabel.trim(), sort_order: parseInt(newSortOrder) || 0, is_visible: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast({ title: "Bullet created", description: `"${newLabel.trim()}" added successfully.` })
      setShowCreateDialog(false)
      setNewLabel("")
      setNewSortOrder("0")
      fetchData()
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create bullet.", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingBullet || !editLabel.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/pricing-bullets/${editingBullet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim(), sort_order: parseInt(editSortOrder) || 0, is_visible: editVisible }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast({ title: "Bullet updated", description: "Changes saved successfully." })
      setEditingBullet(null)
      fetchData()
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update bullet.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleVisible(bullet: PricingBullet) {
    try {
      const res = await fetch(`/api/admin/pricing-bullets/${bullet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: !bullet.is_visible }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to toggle visibility.", variant: "destructive" })
    }
  }

  async function handleDelete() {
    if (!deletingBullet) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/pricing-bullets/${deletingBullet.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error)
      toast({ title: "Bullet deleted", description: `"${deletingBullet.label}" removed.` })
      setDeletingBullet(null)
      fetchData()
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete bullet.", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const filteredBullets = selectedPlanId === "all"
    ? bullets
    : bullets.filter((b) => b.plan_id === selectedPlanId)

  const groupedByPlan: Record<string, PricingBullet[]> = {}
  for (const bullet of filteredBullets) {
    const planName = bullet.subscription_plans?.name ?? bullet.plan_id
    if (!groupedByPlan[planName]) groupedByPlan[planName] = []
    groupedByPlan[planName].push(bullet)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing Bullets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the feature bullet points displayed on each plan&apos;s pricing card.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Bullet
        </Button>
      </div>

      {/* Filter by plan */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium shrink-0">Filter by plan:</Label>
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bullets grouped by plan */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : Object.keys(groupedByPlan).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            No bullets yet. Click &quot;Add Bullet&quot; to create the first one.
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByPlan).map(([planName, planBullets]) => (
          <Card key={planName}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{planName}</CardTitle>
                <Badge variant="outline" className="text-xs">{planBullets.length} bullet{planBullets.length !== 1 ? "s" : ""}</Badge>
              </div>
              <CardDescription>
                Bullet points shown on the {planName} plan pricing card
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {planBullets.map((bullet) => (
                  <div
                    key={bullet.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${bullet.is_visible ? "bg-background border-border" : "bg-muted/30 border-dashed border-muted-foreground/30"}`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={`flex-1 text-sm ${!bullet.is_visible ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {bullet.label}
                    </span>
                    <span className="text-xs text-muted-foreground w-10 text-right shrink-0">#{bullet.sort_order}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleVisible(bullet)}
                        title={bullet.is_visible ? "Hide from pricing page" : "Show on pricing page"}
                      >
                        {bullet.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(bullet)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingBullet(bullet)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pricing Bullet</DialogTitle>
            <DialogDescription>Add a feature bullet point to a plan&apos;s pricing card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bullet Label</Label>
              <Input
                placeholder="e.g. Unlimited screens"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                min="0"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first. Use 0, 10, 20... to leave room for reordering.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newLabel.trim() || !newPlanId}>
              {creating ? "Adding..." : "Add Bullet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingBullet} onOpenChange={(open) => !open && setEditingBullet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bullet</DialogTitle>
            <DialogDescription>Update the label, sort order, or visibility of this bullet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bullet Label</Label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                min="0"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Visible on pricing page</p>
                <p className="text-xs text-muted-foreground">Toggle off to hide without deleting</p>
              </div>
              <Switch checked={editVisible} onCheckedChange={setEditVisible} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBullet(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editLabel.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingBullet} onOpenChange={(open) => !open && setDeletingBullet(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Bullet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingBullet?.label}&quot;? This will immediately remove it from the pricing page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingBullet(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
