import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function KCRIncomeHistoryPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">KCR Income History</h1>
          <p className="text-muted-foreground">
            View your KCR income history and transactions.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>KCR Income History</CardTitle>
            <CardDescription>
              Your KCR income history will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No KCR income history available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
