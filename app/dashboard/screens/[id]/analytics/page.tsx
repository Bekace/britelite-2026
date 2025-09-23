"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CameraAnalytics } from "@/components/camera-analytics"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Eye, Users, Clock, TrendingUp, Settings, Shield } from "lucide-react"
import { useParams } from "next/navigation"

interface AnalyticsData {
  totalRecords: number
  timeRange: string
  data: any[]
  summary: {
    avgPersonCount: number
    totalInteractions: number
    peakHour: number | null | undefined
    demographics: { male: number; female: number; unknown: number }
    emotions: { happy: number; neutral: number; sad: number; angry: number; surprised: number; unknown: number }
  }
}

export default function ScreenAnalyticsPage() {
  const params = useParams()
  const screenId = params.id as string

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState("24h")
  const [loading, setLoading] = useState(true)

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/analytics/data?screenId=${screenId}&timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [screenId, timeRange])

  // Prepare chart data
  const demographicsData = analyticsData?.summary?.demographics
    ? [
        { name: "Male", value: analyticsData.summary.demographics.male, color: "#3b82f6" },
        { name: "Female", value: analyticsData.summary.demographics.female, color: "#ec4899" },
        { name: "Unknown", value: analyticsData.summary.demographics.unknown, color: "#6b7280" },
      ]
    : []

  const emotionsData = analyticsData?.summary?.emotions
    ? [
        { name: "Happy", value: analyticsData.summary.emotions.happy },
        { name: "Neutral", value: analyticsData.summary.emotions.neutral },
        { name: "Sad", value: analyticsData.summary.emotions.sad },
        { name: "Angry", value: analyticsData.summary.emotions.angry },
        { name: "Surprised", value: analyticsData.summary.emotions.surprised },
      ].filter((item) => item.value > 0)
    : []

  // Hourly traffic data
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = analyticsData?.data.filter((record) => new Date(record.created_at).getHours() === hour) || []

    const totalPeople = hourData.reduce((sum, record) => sum + (record.event_data.personCount || 0), 0)

    return {
      hour: `${hour}:00`,
      people: totalPeople,
      interactions: hourData.reduce((sum, record) => sum + (record.event_data.lookingAtScreen || 0), 0),
    }
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Screen Analytics</h1>
          <p className="text-muted-foreground">AI-powered audience insights and engagement metrics</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch id="analytics-enabled" checked={analyticsEnabled} onCheckedChange={setAnalyticsEnabled} />
            <Label htmlFor="analytics-enabled">Enable Analytics</Label>
          </div>

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. People</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.summary?.avgPersonCount || 0}</div>
                <p className="text-xs text-muted-foreground">per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.summary?.totalInteractions || 0}</div>
                <p className="text-xs text-muted-foreground">looking at screen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData?.summary?.peakHour !== null && analyticsData?.summary?.peakHour !== undefined
                    ? `${analyticsData.summary.peakHour}:00`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">highest traffic</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.totalRecords || 0}</div>
                <p className="text-xs text-muted-foreground">last {timeRange}</p>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Traffic Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Traffic Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="people" fill="#3b82f6" name="People Count" />
                  <Bar dataKey="interactions" fill="#10b981" name="Interactions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <CameraAnalytics screenId={screenId} enabled={analyticsEnabled} onToggle={setAnalyticsEnabled} />
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demographicsData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {demographicsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emotional Response</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={emotionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="interactions"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Screen Interactions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Data Protection</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All video frames are processed locally and immediately deleted</li>
                  <li>• Only anonymized analytics data is stored</li>
                  <li>• No personal identification or facial recognition</li>
                  <li>• Data retention limited to 30 days by default</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Compliance</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• GDPR compliant data processing</li>
                  <li>• Consent management for public spaces</li>
                  <li>• Right to data deletion</li>
                  <li>• Transparent data usage policies</li>
                </ul>
              </div>

              <Button variant="outline" className="w-full bg-transparent">
                Download Privacy Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
