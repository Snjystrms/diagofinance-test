'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ActiveProjects } from "@/components/active-projects"
import { AccentCard } from "@/components/AccentCard"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { ACCENT_COLORS } from "@/utils/accent"
import { ActivityTimeline } from "@/components/activity-timeline"
import { ProtectedRoute } from "@/components/protected-route"
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  BarChart3,
  PieChart
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

// Dummy data for charts and statistics
const monthlyData = [
  { month: "Jan", sales: 120, revenue: 15000 },
  { month: "Feb", sales: 180, revenue: 22000 },
  { month: "Mar", sales: 150, revenue: 18000 },
  { month: "Apr", sales: 220, revenue: 28000 },
  { month: "May", sales: 280, revenue: 35000 },
  { month: "Jun", sales: 320, revenue: 42000 },
]

const recentDeals = [
  {
    id: 1,
    customer: "John Smith",
    company: "ABC Corp",
    value: "$50,000",
    status: "Closed Won",
    date: "2024-01-15",
    avatar: "JS"
  },
  {
    id: 2,
    customer: "Sarah Johnson",
    company: "XYZ Inc",
    value: "$35,000",
    status: "In Progress",
    date: "2024-01-14",
    avatar: "SJ"
  },
  {
    id: 3,
    customer: "Mike Brown",
    company: "DEF Ltd",
    value: "$75,000",
    status: "Negotiation",
    date: "2024-01-13",
    avatar: "MB"
  },
  {
    id: 4,
    customer: "Emily Davis",
    company: "GHI Solutions",
    value: "$25,000",
    status: "Qualification",
    date: "2024-01-12",
    avatar: "ED"
  },
]

const upcomingTasks = [
  {
    id: 1,
    title: "Follow up with ABC Corp",
    dueDate: "2024-01-20",
    priority: "High",
    assignee: "John Doe"
  },
  {
    id: 2,
    title: "Prepare proposal for XYZ Inc",
    dueDate: "2024-01-22",
    priority: "Medium",
    assignee: "Jane Smith"
  },
  {
    id: 3,
    title: "Review contract with DEF Ltd",
    dueDate: "2024-01-25",
    priority: "Low",
    assignee: "Mike Johnson"
  },
]

export default function DashboardPage() {
  const user= useAuth();
  console.log(user,"user");
  return (
    <ProtectedRoute>
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>

        <div className="space-y-6 lg:space-y-8">
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Total Revenue",
                value: "$234,210",
                change: "+9.0% from last month",
                icon: DollarSign,
                positive: true
              },
              {
                title: "Active Deals",
                value: "$120,369", 
                change: "+20% from last month",
                icon: CreditCard,
                positive: true
              },
              {
                title: "Total Customers",
                value: "3,782",
                change: "+11.01% from last month", 
                icon: Users,
                positive: true
              },
              {
                title: "Closed Deals",
                value: "874",
                change: "-4.5% from last month",
                icon: Target,
                positive: false
              }
            ].map((metric, index) => (
              <div key={index} className="relative rounded-lg">
                <GlowingEffect
                  spread={30}
                  glow={true}
                  disabled={false}
                  proximity={32}
                  inactiveZone={0.1}
                  borderWidth={2}
                  variant="default"
                />
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl lg:text-2xl font-bold">{metric.value}</div>
                    <div className="flex items-center space-x-2">
                      {metric.positive ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <p className={`text-xs ${metric.positive ? 'text-green-500' : 'text-red-500'}`}>
                        {metric.change}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Active Projects and Activity Timeline */}
          <div className="grid gap-6 xl:grid-cols-2">
            <ActiveProjects />
            <ActivityTimeline />
          </div>

          {/* Charts and Analytics */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Monthly Revenue Chart */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>
                  Revenue trends over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 lg:h-64 flex items-end justify-between space-x-1 sm:space-x-2 overflow-hidden">
                  {monthlyData.map((data, index) => (
                    <div key={index} className="flex flex-col items-center space-y-2 flex-1 max-w-12">
                      <div 
                        className="w-full bg-primary rounded-t min-h-[20px]"
                        style={{ 
                          height: `${(data.revenue / 42000) * 160}px`,
                        }}
                      ></div>
                      <span className="text-xs text-muted-foreground truncate">{data.month}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Total: $160,000</span>
                  <span className="text-green-500">+23.2% vs last period</span>
                </div>
              </CardContent>
            </Card>

            {/* Sales Category */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Sales Category</CardTitle>
                <CardDescription>
                  Revenue breakdown by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Enterprise", value: "$120,000", color: "bg-blue-500" },
                    { name: "SMB", value: "$80,000", color: "bg-green-500" },
                    { name: "Startup", value: "$34,210", color: "bg-orange-500" }
                  ].map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <span className="text-sm font-medium">{category.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity and Tasks */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Recent Deals */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Recent Deals</CardTitle>
                <CardDescription>
                  Latest deals in your pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentDeals.map((deal) => (
                    <div key={deal.id} className="flex items-center space-x-3 sm:space-x-4">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">{deal.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{deal.customer}</p>
                        <p className="text-xs text-muted-foreground truncate">{deal.company}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium">{deal.value}</p>
                        <Badge 
                          variant={
                            deal.status === 'Closed Won' ? 'default' : 
                            deal.status === 'In Progress' ? 'secondary' : 'outline'
                          }
                          className="text-xs mt-1"
                        >
                          {deal.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>
                  Tasks due in the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 sm:space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Due: {task.dueDate} • {task.assignee}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          task.priority === 'High' ? 'destructive' : 
                          task.priority === 'Medium' ? 'default' : 'secondary'
                        }
                        className="text-xs flex-shrink-0"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="relative rounded-lg">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={48}
              inactiveZone={0.05}
              borderWidth={3}
              variant="default"
            />
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                  {[
                    { icon: Users, label: "Add Customer" },
                    { icon: Building2, label: "Add Company" },
                    { icon: CreditCard, label: "Create Deal" },
                    { icon: Calendar, label: "Schedule Task" }
                  ].map((action, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      className="h-16 sm:h-20 flex-col space-y-2 p-2"
                    >
                      <action.icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-center leading-tight">
                        {action.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}