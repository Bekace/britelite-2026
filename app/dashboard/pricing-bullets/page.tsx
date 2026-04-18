import { requireAdmin } from "@/lib/admin/auth"
import { PricingBulletsManagement } from "@/components/admin/pricing-bullets-management"

export default async function PricingBulletsPage() {
  await requireAdmin()
  return <PricingBulletsManagement />
}
