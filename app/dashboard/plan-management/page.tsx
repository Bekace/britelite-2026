import { requireAdmin } from "@/lib/admin/auth"

export default async function PlanManagementPage() {
  const { user, profile } = await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Plan Management</h1>
        <p className="text-muted-foreground mt-1">Manage subscription plans and pricing</p>
      </div>

      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Plan Management</h2>
        <p className="text-muted-foreground mt-2">Subscription plan management interface coming soon.</p>
      </div>
    </div>
  )
}
