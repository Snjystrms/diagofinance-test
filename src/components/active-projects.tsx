"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActiveProjectType {
  name: string
  progress: number
  startDate: Date
  dueDate: Date
  status: "On Track" | "At Risk" | "On Hold"
}

const activeProjectsData: ActiveProjectType[] = [
  {
    name: "E-Commerce Platform Redesign",
    progress: 85,
    startDate: new Date("2024-01-15T00:00:00Z"),
    dueDate: new Date("2024-10-01T00:00:00Z"),
    status: "On Track",
  },
  {
    name: "Mobile App Development",
    progress: 60,
    startDate: new Date("2024-03-10T00:00:00Z"),
    dueDate: new Date("2024-09-30T00:00:00Z"),
    status: "At Risk",
  },
  {
    name: "Marketing Automation Setup",
    progress: 40,
    startDate: new Date("2024-05-05T00:00:00Z"),
    dueDate: new Date("2024-12-15T00:00:00Z"),
    status: "On Hold",
  },
  {
    name: "Cloud Migration",
    progress: 20,
    startDate: new Date("2024-06-01T00:00:00Z"),
    dueDate: new Date("2025-03-01T00:00:00Z"),
    status: "On Track",
  },
  {
    name: "Customer Support Portal Upgrade",
    progress: 90,
    startDate: new Date("2023-12-01T00:00:00Z"),
    dueDate: new Date("2024-08-15T00:00:00Z"),
    status: "On Track",
  },
]

const statusColors = {
  "On Track": {
    text: "text-success",
    chart: "hsl(var(--success))",
  },
  "At Risk": {
    text: "text-destructive",
    chart: "hsl(var(--destructive))",
  },
  "On Hold": {
    text: "text-muted-foreground",
    chart: "hsl(var(--muted-foreground))",
  },
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const CircularProgress = ({ progress, color }: { progress: number; color: string }) => {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative size-12 shrink-0">
      <svg className="size-12 -rotate-90" viewBox="0 0 48 48">
        {/* Background circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ color }}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium">{progress}%</span>
      </div>
    </div>
  )
}

const ActiveProjectsItem = ({ project }: { project: ActiveProjectType }) => {
  const textColor = statusColors[project.status].text
  const chartColor = statusColors[project.status].chart

  return (
    <li className="flex items-center gap-4 py-2 px-4 bg-card border rounded-lg">
      <CircularProgress progress={project.progress} color={chartColor} />
      <div>
        <p className={cn(textColor, "text-xs font-semibold")}>
          {project.status}
        </p>
        <h3 className="line-clamp-1">{project.name}</h3>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="shrink-0 me-2 h-4 w-4" aria-hidden />
          <p className="text-sm">
            {formatDate(project.startDate)} - {formatDate(project.dueDate)}
          </p>
        </div>
      </div>
    </li>
  )
}

export function ActiveProjects() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="h-full flex flex-col justify-between gap-y-2">
          {activeProjectsData.map((project, index) => (
            <ActiveProjectsItem key={project.name + index} project={project} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
} 