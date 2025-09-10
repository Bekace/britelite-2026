"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Plan {
  id?: string
  name: string
  description: string
  price: number
  billing_cycle: string
  max_screens: number
  max_playlists: number
  max_media_assets: number
  max_media_storage: number
  is_active: boolean
}

interface PlanFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  plan?: Plan
  mode: "create" | "edit"
}

export function PlanFormModal({ isOpen, onClose, onSuccess, plan, mode }: PlanFormModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Plan>({
    name: plan?.name || "",
    description: plan?.description || "",
    price: plan?.price || 0,
    billing_cycle: plan?.billing_cycle || "monthly",
    max_screens: plan?.max_screens || 1,
    max_playlists: plan?.max_playlists || 1,
    max_media_assets: plan?.max_media_assets || 10,
    max_media_storage: plan?.max_media_storage || 1073741824, // 1GB in bytes
    is_active: plan?.is_active ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === "create" ? "/api/plans" : `/api/plans/${plan?.id}`
      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save plan")
      }

      toast({
        title: "Success",
        description: `Plan ${mode === "create" ? "created" : "updated"} successfully`,
      })

      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Plan" : "Edit Plan"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new subscription plan" : "Update the subscription plan details"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_screens">Max Screens</Label>
              <Input
                id="max_screens"
                type="number"
                value={formData.max_screens}
                onChange={(e) => setFormData({ ...formData, max_screens: Number.parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_playlists">Max Playlists</Label>
              <Input
                id="max_playlists"
                type="number"
                value={formData.max_playlists}
                onChange={(e) => setFormData({ ...formData, max_playlists: Number.parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_media_assets">Max Media Assets</Label>
              <Input
                id="max_media_assets"
                type="number"
                value={formData.max_media_assets}
                onChange={(e) => setFormData({ ...formData, max_media_assets: Number.parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_media_storage">Max Storage (GB)</Label>
            <Input
              id="max_media_storage"
              type="number"
              value={Math.round(formData.max_media_storage / (1024 * 1024 * 1024))}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_media_storage: Number.parseInt(e.target.value) * 1024 * 1024 * 1024,
                })
              }
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active Plan</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create Plan" : "Update Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
