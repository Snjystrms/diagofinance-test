import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DailyAllegianceIncomePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Daily Allegiance Income</h1>
          <p className="text-muted-foreground">
            View and manage your daily allegiance income records.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Daily Allegiance Income</CardTitle>
            <CardDescription>
              Your daily allegiance income records will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No records found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
