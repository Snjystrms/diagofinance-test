"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, CheckSquare, DollarSign, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface Activity {
  id: number
  title: string
  time: string
  status: string
  description: string
  icon: React.ReactNode
  iconColor: string
  avatars: string[]
}

const activities: Activity[] = [
  {
    id: 1,
    title: "Follow-up Email to John Doe",
    time: "10:30 AM",
    status: "Opened",
    description: "Followed up on the proposal sent last week. Awaiting response.",
    icon: <Mail className="size-4" />,
    iconColor: "bg-blue-500",
    avatars: ["JD", "SM"]
  },
  {
    id: 2,
    title: "Billing Discrepancy Support Ticket",
    time: "11:10 AM",
    status: "Resolved",
    description: "Ticket ID: TKT-12345 - Customer reported an overcharge, issue resolved with refund processed.",
    icon: <CheckSquare className="size-4" />,
    iconColor: "bg-green-500",
    avatars: ["AB"]
  },
  {
    id: 3,
    title: "Enterprise Subscription Deal - Acme Corp",
    time: "2:45 PM",
    status: "Closed-Won",
    description: "Negotiation completed. Deal closed at $50,000 annual value.",
    icon: <DollarSign className="size-4" />,
    iconColor: "bg-orange-500",
    avatars: ["JD", "SM"]
  }
]

export function ActivityTimeline() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Activity Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">Today</p>
        </div>
        <Calendar className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={cn("size-8 rounded-full flex items-center justify-center text-white", activity.iconColor)}>
                  {activity.icon}
                </div>
                {index < activities.length - 1 && (
                  <div className="w-0.5 h-8 bg-border mt-2"></div>
                )}
              </div>
              
              {/* Activity content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                    <Badge variant="secondary" className="text-xs">
                      {activity.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{activity.description}</p>
                
                {/* Avatars */}
                <div className="flex gap-1">
                  {activity.avatars.map((avatar, avatarIndex) => (
                    <Avatar key={avatarIndex} className="size-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {avatar}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 