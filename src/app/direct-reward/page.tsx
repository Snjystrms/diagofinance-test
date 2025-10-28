import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DirectRewardPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Direct Reward</h1>
          <p className="text-muted-foreground">
            View and manage your direct reward records.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Direct Reward</CardTitle>
            <CardDescription>
              Your direct reward records will be displayed here.
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
