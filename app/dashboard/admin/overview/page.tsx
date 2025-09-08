import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Monitor, PlayCircle, TrendingUp } from "lucide-react"

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Get user statistics
  const { data: userStats } = await supabase.from("profiles").select("role, created_at")

  const { data: screenStats } = await supabase.from("screens").select("id, created_at")

  const { data: playlistStats } = await supabase.from("playlists").select("id, created_at")

  const { data: mediaStats } = await supabase.from("media").select("id, file_size, created_at")

  const totalUsers = userStats?.length || 0
  const totalScreens = screenStats?.length || 0
  const totalPlaylists = playlistStats?.length || 0
  const totalMediaSize = mediaStats?.reduce((acc, media) => acc + (media.file_size || 0), 0) || 0

  // Calculate recent activity (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentUsers = userStats?.filter((user) => new Date(user.created_at) > thirtyDaysAgo).length || 0

  const recentScreens = screenStats?.filter((screen) => new Date(screen.created_at) > thirtyDaysAgo).length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">System statistics and user activity overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">+{recentUsers} new this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Screens</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScreens}</div>
            <p className="text-xs text-muted-foreground">+{recentScreens} new this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Playlists</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlaylists}</div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalMediaSize / (1024 * 1024 * 1024)).toFixed(2)} GB</div>
            <p className="text-xs text-muted-foreground">Total media storage</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Roles Distribution</CardTitle>
            <CardDescription>Breakdown of user roles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {["user", "admin", "superadmin"].map((role) => {
                const count = userStats?.filter((user) => user.role === role).length || 0
                const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : 0
                return (
                  <div key={role} className="flex items-center justify-between">
                    <span className="capitalize">{role}s</span>
                    <span className="text-sm text-muted-foreground">
                      {count} ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>New registrations and content in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>New Users</span>
                <span className="text-sm text-muted-foreground">{recentUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>New Screens</span>
                <span className="text-sm text-muted-foreground">{recentScreens}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
