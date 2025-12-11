import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id

  if (!sessionId) {
    redirect("/auth/pricing")
  }

  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  redirect("/dashboard?welcome=true")

  // The following code is not needed after the redirect
  // const { data: subscription } = await supabase
  //   .from("user_subscriptions")
  //   .select(
  //     `
  //     *,
  //     plan:subscription_plans(name, features)
  //   `,
  //   )
  //   .eq("user_id", user.id)
  //   .eq("status", "active")
  //   .order("created_at", { ascending: false })
  //   .limit(1)
  //   .single()

  // return (
  //   <div className="flex min-h-screen items-center justify-center p-4">
  //     <Card className="w-full max-w-md">
  //       <CardHeader className="text-center">
  //         {subscription ? (
  //           <>
  //             <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
  //               <CheckCircle2 className="h-6 w-6 text-green-600" />
  //             </div>
  //             <CardTitle className="text-2xl">Payment Successful!</CardTitle>
  //             <CardDescription>Your subscription to {subscription.plan?.name} has been activated.</CardDescription>
  //           </>
  //         ) : (
  //           <>
  //             <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
  //               <Loader2 className="h-6 w-6 animate-spin text-primary" />
  //             </div>
  //             <CardTitle className="text-2xl">Processing Payment</CardTitle>
  //             <CardDescription>
  //               Please wait while we activate your subscription. This usually takes a few seconds.
  //             </CardDescription>
  //           </>
  //         )}
  //       </CardHeader>
  //       <CardContent className="space-y-4">
  //         {subscription ? (
  //           <div className="space-y-2">
  //             <p className="text-sm text-muted-foreground">
  //               You now have access to all {subscription.plan?.name} features. Get started by visiting your dashboard.
  //             </p>
  //             <Button asChild className="w-full">
  //               <Link href="/dashboard">Go to Dashboard</Link>
  //             </Button>
  //           </div>
  //         ) : (
  //           <div className="space-y-2">
  //             <p className="text-sm text-muted-foreground">
  //               If this takes longer than expected, please refresh the page or contact support.
  //             </p>
  //             <Button asChild variant="outline" className="w-full bg-transparent">
  //               <Link href="/dashboard">Continue to Dashboard</Link>
  //             </Button>
  //           </div>
  //         )}
  //       </CardContent>
  //     </Card>
  //   </div>
  // )
}
