import { MenuPreviewPage } from "@/components/restaurant-menus/menu-preview-page"

export const metadata = {
  title: "Menu Preview | Xkreen",
}

export default async function MenuPreviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MenuPreviewPage menuId={id} />
}
