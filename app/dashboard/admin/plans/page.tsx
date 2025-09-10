"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2 } from "lucide-react"
import { PlanFormModal } from "@/components/admin/plan-form-modal"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Plan {
  id: string
  name: string
  description: string
  price: number
  billing_cycle: string
  max_screens: number
  max_playlists: number
  max_media_assets: number
  max_media_storage: number
  is_active: boolean
  user_subscriptions?: { id: string }[]
}

export default function PlanManagementPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>()
  const [deletingPlan, setDeletingPlan] = useState<Plan | undefined>()
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/plans")
      if (!response.ok) throw new Error("Failed to fetch plans")
      const data = await response.json()
      setPlans(data.plans || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load plans",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleCreatePlan = () => {
    setEditingPlan(undefined)
    setModalMode("create")
    setModalOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan)
    setModalMode("edit")
    setModalOpen(true)
  }

  const handleDeletePlan = async (plan: Plan) => {
    try {
      const response = await fetch(`/api/plans/${plan.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete plan")
      }

      toast({
        title: "Success",
        description: "Plan deleted successfully",
      })

      fetchPlans()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete plan",
        variant: "destructive",
      })
    } finally {
      setDeletingPlan(undefined)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plan Management</h1>
          <p className="text-muted-foreground">Manage subscription plans and pricing</p>
        </div>
        <Button onClick={handleCreatePlan}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/{plan.billing_cycle}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Max Screens:</span>
                    <span>{plan.max_screens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span>{(plan.max_media_storage / (1024 * 1024 * 1024)).toFixed(0)}GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subscribers:</span>
                    <span>{plan.user_subscriptions?.length || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleEditPlan(plan)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive bg-transparent"
                    onClick={() => setDeletingPlan(plan)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>Detailed view of all subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Max Screens</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>${plan.price}</TableCell>
                  <TableCell className="capitalize">{plan.billing_cycle}</TableCell>
                  <TableCell>{plan.max_screens}</TableCell>
                  <TableCell>{(plan.max_media_storage / (1024 * 1024 * 1024)).toFixed(0)}GB</TableCell>
                  <TableCell>{plan.user_subscriptions?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditPlan(plan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeletingPlan(plan)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlanFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchPlans}
        plan={editingPlan}
        mode={modalMode}
      />

      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPlan?.name}"? This action cannot be undone.
              {deletingPlan?.user_subscriptions && deletingPlan.user_subscriptions.length > 0 && (
                <span className="block mt-2 text-destructive">
                  This plan has {deletingPlan.user_subscriptions.length} active subscription(s) and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlan && handleDeletePlan(deletingPlan)}
              disabled={deletingPlan?.user_subscriptions && deletingPlan.user_subscriptions.length > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
