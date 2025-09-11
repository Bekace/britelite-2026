import { requireSuperAdmin } from "@/lib/admin/auth"
import { AdminLayout } from "@/components/admin/admin-layout"
import { PlanManagement } from "@/components/admin/plan-management"

export default async function AdminPlansPage() {
  const { user, profile } = await requireSuperAdmin()

  return (
    <AdminLayout user={user} userRole={profile.role}>
      <PlanManagement />
    </AdminLayout>
  )
}
