"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Users,
  Monitor,
  HardDrive,
  RefreshCw,
  DollarSign,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  billing_interval: "monthly" | "yearly"
  max_screens: number
  max_users: number
  max_storage_gb: number
  features: string[]
  is_active: boolean
  subscriber_count?: number
  created_at: string
}

interface PlanFormData {
  name: string
  description: string
  price: string
  billing_interval: "monthly" | "yearly"
  max_screens: string
  max_users: string
  max_storage_gb: string
  features: string[]
  is_active: boolean
}

export function PlanManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState<PlanFormData>({
    name: "",
    description: "",
    price: "0",
    billing_interval: "monthly",
    max_screens: "1",
    max_users: "1",
    max_storage_gb: "1",
    features: [],
    is_active: true,
  })
  const [newFeature, setNewFeature] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch subscription plans",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching plans:", error)
      toast({
        title: "Error",
        description: "Failed to fetch subscription plans",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async () => {
    try {
      const planData = {
        ...formData,
        price: Number.parseFloat(formData.price),
        max_screens: formData.max_screens === "-1" ? -1 : Number.parseInt(formData.max_screens),
        max_users: formData.max_users === "-1" ? -1 : Number.parseInt(formData.max_users),
        max_storage_gb: Number.parseInt(formData.max_storage_gb),
      }

      const response = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      })

      if (response.ok) {
        await fetchPlans()
        setShowCreateDialog(false)
        resetForm()
        toast({
          title: "Success",
          description: "Subscription plan created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating plan:", error)
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePlan = async () => {
    if (!editingPlan) return

    try {
      const planData = {
        ...formData,
        price: Number.parseFloat(formData.price),
        max_screens: formData.max_screens === "-1" ? -1 : Number.parseInt(formData.max_screens),
        max_users: formData.max_users === "-1" ? -1 : Number.parseInt(formData.max_users),
        max_storage_gb: Number.parseInt(formData.max_storage_gb),
      }

      const response = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      })

      if (response.ok) {
        await fetchPlans()
        setEditingPlan(null)
        resetForm()
        toast({
          title: "Success",
          description: "Subscription plan updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating plan:", error)
      toast({
        title: "Error",
        description: "Failed to update plan",
        variant: "destructive",
      })
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchPlans()
        setDeletingPlan(null)
        toast({
          title: "Success",
          description: "Subscription plan deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to delete plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting plan:", error)
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "0",
      billing_interval: "monthly",
      max_screens: "1",
      max_users: "1",
      max_storage_gb: "1",
      features: [],
      is_active: true,
    })
    setNewFeature("")
  }

  const openEditDialog = (plan: SubscriptionPlan) => {
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      billing_interval: plan.billing_interval,
      max_screens: plan.max_screens.toString(),
      max_users: plan.max_users.toString(),
      max_storage_gb: plan.max_storage_gb.toString(),
      features: [...plan.features],
      is_active: plan.is_active,
    })
    setEditingPlan(plan)
  }

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      })
      setNewFeature("")
    }
  }

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatLimitValue = (value: number) => {
    return value === -1 ? "Unlimited" : value.toString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plan Management</h1>
          <p className="text-muted-foreground mt-1">Manage subscription plans and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchPlans} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>
      </div>

      {/* Plans Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
            <p className="text-xs text-muted-foreground">{plans.filter((p) => p.is_active).length} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.reduce((sum, plan) => sum + (plan.subscriber_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                plans
                  .filter((p) => p.billing_interval === "monthly")
                  .reduce((sum, plan) => sum + plan.price * (plan.subscriber_count || 0), 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">Monthly plans only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                plans
                  .filter((p) => p.billing_interval === "yearly")
                  .reduce((sum, plan) => sum + plan.price * 12 * (plan.subscriber_count || 0), 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">Yearly plans annualized</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscription Plans
          </CardTitle>
          <CardDescription>Manage pricing and features for all subscription tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Details</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatCurrency(plan.price)}</p>
                        <p className="text-sm text-muted-foreground">per {plan.billing_interval}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs">
                          <Monitor className="w-3 h-3" />
                          {formatLimitValue(plan.max_screens)} screens
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="w-3 h-3" />
                          {formatLimitValue(plan.max_users)} users
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <HardDrive className="w-3 h-3" />
                          {plan.max_storage_gb}GB storage
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <p className="font-medium">{plan.subscriber_count || 0}</p>
                        <p className="text-xs text-muted-foreground">subscribers</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditDialog(plan)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingPlan(plan)}
                            className="text-red-600"
                            disabled={(plan.subscriber_count || 0) > 0}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Plan Dialog */}
      <Dialog
        open={showCreateDialog || !!editingPlan}
        onOpenChange={() => {
          setShowCreateDialog(false)
          setEditingPlan(null)
          resetForm()
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update plan details and pricing" : "Add a new subscription plan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pro Plan"
                />
              </div>
              <div>
                <Label>Billing Interval</Label>
                <Select
                  value={formData.billing_interval}
                  onValueChange={(value: "monthly" | "yearly") => setFormData({ ...formData, billing_interval: value })}
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
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active Plan</Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Max Screens</Label>
                <Select
                  value={formData.max_screens}
                  onValueChange={(value) => setFormData({ ...formData, max_screens: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="-1">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Users</Label>
                <Select
                  value={formData.max_users}
                  onValueChange={(value) => setFormData({ ...formData, max_users: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="-1">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Storage (GB)</Label>
                <Select
                  value={formData.max_storage_gb}
                  onValueChange={(value) => setFormData({ ...formData, max_storage_gb: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 GB</SelectItem>
                    <SelectItem value="5">5 GB</SelectItem>
                    <SelectItem value="10">10 GB</SelectItem>
                    <SelectItem value="25">25 GB</SelectItem>
                    <SelectItem value="50">50 GB</SelectItem>
                    <SelectItem value="100">100 GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Features</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyPress={(e) => e.key === "Enter" && addFeature()}
                  />
                  <Button type="button" onClick={addFeature} size="sm">
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{feature}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFeature(index)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingPlan(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}>
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subscription plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingPlan && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{deletingPlan.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(deletingPlan.price)} per {deletingPlan.billing_interval}
              </p>
              <p className="text-sm text-muted-foreground">{deletingPlan.subscriber_count || 0} subscribers</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deletingPlan && handleDeletePlan(deletingPlan.id)}>
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
