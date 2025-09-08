import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Plus, Settings } from "lucide-react"

const AVAILABLE_FEATURES = [
  { key: "unlimited_screens", name: "Unlimited Screens", description: "Allow unlimited screen connections" },
  { key: "advanced_analytics", name: "Advanced Analytics", description: "Detailed analytics and reporting" },
  { key: "custom_branding", name: "Custom Branding", description: "Remove branding and add custom logos" },
  { key: "api_access", name: "API Access", description: "Full API access for integrations" },
  { key: "priority_support", name: "Priority Support", description: "24/7 priority customer support" },
  { key: "bulk_upload", name: "Bulk Upload", description: "Upload multiple media files at once" },
  { key: "scheduled_content", name: "Scheduled Content", description: "Schedule content for specific times" },
  { key: "team_collaboration", name: "Team Collaboration", description: "Multiple users per account" },
]

export default async function FeatureManagementPage() {
  const supabase = await createClient()

  // Get all plans and their feature permissions
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select(`
      *,
      feature_permissions (
        feature_key,
        is_enabled,
        limit_value
      )
    `)
    .order("price", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Management</h1>
          <p className="text-muted-foreground">Define and manage feature access based on subscription tiers</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Feature
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Matrix</CardTitle>
          <CardDescription>Configure which features are available for each subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Feature</TableHead>
                  {plans?.map((plan) => (
                    <TableHead key={plan.id} className="text-center">
                      {plan.name}
                      <div className="text-xs text-muted-foreground font-normal">
                        ${plan.price}/{plan.billing_cycle}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {AVAILABLE_FEATURES.map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{feature.name}</div>
                        <div className="text-sm text-muted-foreground">{feature.description}</div>
                      </div>
                    </TableCell>
                    {plans?.map((plan) => {
                      const permission = plan.feature_permissions?.find((fp) => fp.feature_key === feature.key)
                      return (
                        <TableCell key={plan.id} className="text-center">
                          <Switch checked={permission?.is_enabled || false} disabled />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Most popular features across all plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {AVAILABLE_FEATURES.slice(0, 5).map((feature) => {
                const enabledPlans =
                  plans?.filter((plan) =>
                    plan.feature_permissions?.some((fp) => fp.feature_key === feature.key && fp.is_enabled),
                  ).length || 0
                const totalPlans = plans?.length || 1
                const percentage = ((enabledPlans / totalPlans) * 100).toFixed(0)

                return (
                  <div key={feature.key} className="flex items-center justify-between">
                    <span className="text-sm">{feature.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-secondary rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common feature management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Settings className="mr-2 h-4 w-4" />
                Bulk Enable Features
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Settings className="mr-2 h-4 w-4" />
                Copy Features Between Plans
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Settings className="mr-2 h-4 w-4" />
                Reset All Features
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
