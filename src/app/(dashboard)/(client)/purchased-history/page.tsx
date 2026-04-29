import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart } from "lucide-react"

export default function PurchasedHistoryPage() {
  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Purchased History
          </h1>
          <p className="text-muted-foreground">
            View your purchase history and related information.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Purchased History</CardTitle>
            <CardDescription>
              Your purchase history will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No purchase history available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    
  )
}
