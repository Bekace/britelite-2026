"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FeaturePermission {
  id: string
  plan_id: string
  plan_name: string
  feature_key: string
  feature_name: string
  is_enabled: boolean
  limit_value?: number
  created_at: string
}

interface Feature {
  feature_key: string
  feature_name: string
  description?: string
  permissions: FeaturePermission[]
}

interface FeatureFormData {
  feature_key: string
  feature_name: string
  description: string
}

export function FeatureManagement() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPlan, setFilterPlan] = useState<string>("all")
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [deletingFeature, setDeletingFeature] = useState<Feature | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState<FeatureFormData>({
    feature_key: "",
    feature_name: "",
    description: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchFeatures()
    fetchPlans()
  }, [])

  const fetchFeatures = async () => {
    try {
      const response = await fetch("/api/admin/features")
      if (response.ok) {
        const data = await response.json()
        setFeatures(data.features)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch features",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching features:", error)
      toast({
        title: "Error",
        description: "Failed to fetch features",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans)
      }
    } catch (error) {
      console.error("[v0] Error fetching plans:", error)
    }
  }

  const handleCreateFeature = async () => {
    try {
      const response = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchFeatures()
        setShowCreateDialog(false)
        resetForm()
        toast({
          title: "Success",
          description: "Feature created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create feature",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating feature:", error)
      toast({
        title: "Error",
        description: "Failed to create feature",
        variant: "destructive",
      })
    }
  }

  const handleUpdateFeature = async () => {
    if (!editingFeature) return

    try {
      const response = await fetch(`/api/admin/features/${editingFeature.feature_key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchFeatures()
        setEditingFeature(null)
        resetForm()
        toast({
          title: "Success",
          description: "Feature updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update feature",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating feature:", error)
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive",
      })
    }
  }

  const handleDeleteFeature = async (featureKey: string) => {
    try {
      const response = await fetch(`/api/admin/features/${featureKey}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchFeatures()
        setDeletingFeature(null)
        toast({
          title: "Success",
          description: "Feature deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to delete feature",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting feature:", error)
      toast({
        title: "Error",
        description: "Failed to delete feature",
        variant: "destructive",
      })
    }
  }

  const handleToggleFeature = async (permissionId: string, isEnabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/features/permissions/${permissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: isEnabled }),
      })

      if (response.ok) {
        await fetchFeatures()
        toast({
          title: "Success",
          description: `Feature ${isEnabled ? "enabled" : "disabled"} successfully`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update feature",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error toggling feature:", error)
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      feature_key: "",
      feature_name: "",
      description: "",
    })
  }

  const openEditDialog = (feature: Feature) => {
    setFormData({
      feature_key: feature.feature_key,
      feature_name: feature.feature_name,
      description: feature.description || "",
    })
    setEditingFeature(feature)
  }

  const filteredFeatures = features.filter((feature) => {
    const matchesSearch =
      feature.feature_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.feature_key.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterPlan === "all") return matchesSearch

    const hasMatchingPlan = feature.permissions.some((p) => p.plan_id === filterPlan)
    return matchesSearch && hasMatchingPlan
  })

  const getFeatureStats = () => {
    const totalFeatures = features.length
    const enabledFeatures = features.reduce((count, feature) => {
      return count + feature.permissions.filter((p) => p.is_enabled).length
    }, 0)
    const totalPermissions = features.reduce((count, feature) => count + feature.permissions.length, 0)

    return { totalFeatures, enabledFeatures, totalPermissions }
  }

  const stats = getFeatureStats()

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
          <h1 className="text-3xl font-bold text-foreground">Feature Management</h1>
          <p className="text-muted-foreground mt-1">Manage feature permissions across subscription plans</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchFeatures} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Feature
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Features</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFeatures}</div>
            <p className="text-xs text-muted-foreground">Available features</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled Permissions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enabledFeatures}</div>
            <p className="text-xs text-muted-foreground">of {stats.totalPermissions} total permissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPermissions > 0 ? Math.round((stats.enabledFeatures / stats.totalPermissions) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Features enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.filter((p) => p.is_active).length}</div>
            <p className="text-xs text-muted-foreground">of {plans.length} total plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Feature Permissions Matrix
          </CardTitle>
          <CardDescription>Configure which features are available for each subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search features..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Features Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  {plans.map((plan) => (
                    <TableHead key={plan.id} className="text-center">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${plan.price}/{plan.billing_interval}
                        </p>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeatures.map((feature) => (
                  <TableRow key={feature.feature_key}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{feature.feature_name}</p>
                        <p className="text-sm text-muted-foreground">{feature.feature_key}</p>
                        {feature.description && (
                          <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                        )}
                      </div>
                    </TableCell>
                    {plans.map((plan) => {
                      const permission = feature.permissions.find((p) => p.plan_id === plan.id)
                      return (
                        <TableCell key={plan.id} className="text-center">
                          {permission ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFeature(permission.id, !permission.is_enabled)}
                              className="p-1"
                            >
                              {permission.is_enabled ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )
                    })}
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
                          <DropdownMenuItem onClick={() => openEditDialog(feature)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Feature
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingFeature(feature)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Feature
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

      {/* Create/Edit Feature Dialog */}
      <Dialog
        open={showCreateDialog || !!editingFeature}
        onOpenChange={() => {
          setShowCreateDialog(false)
          setEditingFeature(null)
          resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeature ? "Edit Feature" : "Create New Feature"}</DialogTitle>
            <DialogDescription>
              {editingFeature ? "Update feature details" : "Add a new feature to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feature Key</Label>
              <Input
                value={formData.feature_key}
                onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                placeholder="e.g., custom_branding"
                disabled={!!editingFeature}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Unique identifier for the feature (cannot be changed after creation)
              </p>
            </div>
            <div>
              <Label>Feature Name</Label>
              <Input
                value={formData.feature_name}
                onChange={(e) => setFormData({ ...formData, feature_name: e.target.value })}
                placeholder="e.g., Custom Branding"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of the feature..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingFeature(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingFeature ? handleUpdateFeature : handleCreateFeature}>
              {editingFeature ? "Update Feature" : "Create Feature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Feature Dialog */}
      <Dialog open={!!deletingFeature} onOpenChange={() => setDeletingFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feature? This will remove it from all subscription plans.
            </DialogDescription>
          </DialogHeader>
          {deletingFeature && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{deletingFeature.feature_name}</p>
              <p className="text-sm text-muted-foreground">{deletingFeature.feature_key}</p>
              <p className="text-sm text-muted-foreground">
                {deletingFeature.permissions.length} plan permissions will be removed
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingFeature(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingFeature && handleDeleteFeature(deletingFeature.feature_key)}
            >
              Delete Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
