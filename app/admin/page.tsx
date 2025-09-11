import { requireSuperAdmin } from "@/lib/admin/auth"
import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const { user, profile } = await requireSuperAdmin()

  return (
    <AdminLayout user={user} userRole={profile.role}>
      <AdminDashboard />
    </AdminLayout>
  )
}
