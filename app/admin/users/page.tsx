import { requireAdmin } from "@/lib/admin/auth"
import { AdminLayout } from "@/components/admin/admin-layout"
import { UserManagement } from "@/components/admin/user-management"

export default async function AdminUsersPage() {
  const { user, profile } = await requireAdmin()

  return (
    <AdminLayout user={user} userRole={profile.role}>
      <UserManagement userRole={profile.role} />
    </AdminLayout>
  )
}
