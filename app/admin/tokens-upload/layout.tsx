import { requireSuperAdmin } from "@/lib/admin/auth"
import { redirect } from "next/navigation"

export default async function AdminTokensLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await requireSuperAdmin()
  } catch (error) {
    redirect("/auth/login")
  }

  return children
}
