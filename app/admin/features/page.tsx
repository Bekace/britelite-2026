import { requireSuperAdmin } from "@/lib/admin/auth"
import { AdminLayout } from "@/components/admin/admin-layout"
import { FeatureManagement } from "@/components/admin/feature-management"

export default async function AdminFeaturesPage() {
  const { user, profile } = await requireSuperAdmin()

  return (
    <AdminLayout user={user} userRole={profile.role}>
      <FeatureManagement />
    </AdminLayout>
  )
}
