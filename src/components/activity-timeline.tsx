"use client"

import { useMemo, type ComponentProps, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, CheckSquare, DollarSign, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActivityTimelineItem {
  id: number | string
  title: string
  time?: string
  status?: string
  description?: string
  icon?: ReactNode
  iconColor?: string
  avatars?: string[]
  badgeVariant?: ComponentProps<typeof Badge>["variant"]
}

const defaultActivities: ActivityTimelineItem[] = [
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

interface ActivityTimelineProps {
  title?: string
  subtitle?: string
  activities?: ActivityTimelineItem[]
  emptyStateMessage?: string
  showCalendarIcon?: boolean
  footer?: ReactNode
}

export function ActivityTimeline({
  title = "Activity Timeline",
  subtitle = "Today",
  activities,
  emptyStateMessage = "No activity available",
  showCalendarIcon = true,
  footer
}: ActivityTimelineProps) {
  const timelineItems = useMemo(() => activities ?? defaultActivities, [activities])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {showCalendarIcon && <Calendar className="size-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {timelineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
        ) : (
          <div className="space-y-6">
            {timelineItems.map((activity, index) => (
              <div key={activity.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center text-white",
                      activity.iconColor ?? "bg-primary"
                    )}
                  >
                    {activity.icon ?? <Mail className="size-4" />}
                  </div>
                  {index < timelineItems.length - 1 && <div className="w-0.5 h-8 bg-border mt-2" />}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                    {(activity.time || activity.status) && (
                      <div className="flex items-center gap-2 shrink-0">
                        {activity.time && <span className="text-xs text-muted-foreground">{activity.time}</span>}
                        {activity.status && (
                          <Badge variant={activity.badgeVariant ?? "secondary"} className="text-xs">
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{activity.description}</p>
                  )}

                  {!!activity.avatars?.length && (
                    <div className="flex gap-1">
                      {activity.avatars.map((avatar, avatarIndex) => (
                        <Avatar key={avatarIndex} className="size-6">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {avatar}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {footer && (
          <div className="mt-6 pt-6 border-t">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  )
}