import { createClient } from "@supabase/supabase-js"
import ScreenContentPlayer from "./content/page"

export default async function ScreenPlayerPage({
  params,
}: {
  params: { screenCode: string }
}) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

  // Display screen content directly without redirect
  return <ScreenContentPlayer params={params} />
}
