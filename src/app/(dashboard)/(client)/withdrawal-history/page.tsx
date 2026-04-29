import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History } from "lucide-react"

export default function WithdrawalHistoryPage() {
  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <History className="h-6 w-6 text-primary" />
            Withdrawal History
          </h1>
          <p className="text-muted-foreground">
            View your withdrawal transaction history.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
            <CardDescription>
              Your withdrawal transaction history will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No withdrawal history available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    
  )
}
