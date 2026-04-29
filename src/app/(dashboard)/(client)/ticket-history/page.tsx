import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket } from "lucide-react"

export default function TicketHistoryPage() {
  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Ticket className="h-6 w-6 text-primary" />
            Ticket History
          </h1>
          <p className="text-muted-foreground">
            View your support ticket history and status.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Ticket History</CardTitle>
            <CardDescription>
              Your support ticket history will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No support tickets found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    
  )
}
