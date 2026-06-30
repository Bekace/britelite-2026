import { MenuBuilder } from "@/components/restaurant-menus/menu-builder"

export const metadata = {
  title: "Edit Menu | Britelite",
}

export default async function MenuBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MenuBuilder menuId={id} />
}
