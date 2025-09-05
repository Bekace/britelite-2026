import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function ScreenPlayerPage({
  params,
}: {
  params: { screenCode: string }
}) {
  const supabase = createClient()

  // Find screen by screen code
  const { data: screen } = await supabase.from("screens").select("id").eq("screen_code", params.screenCode).single()

  if (!screen) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Screen Not Found</h1>
          <p>Screen code {params.screenCode} does not exist.</p>
        </div>
      </div>
    )
  }

  // Redirect to the screen content player
  redirect(`/screen/${params.screenCode}/content`)
}
