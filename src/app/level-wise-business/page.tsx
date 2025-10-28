import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LevelWiseBusinessPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Level Wise Business</h1>
          <p className="text-muted-foreground">
            View and analyze your business performance by levels.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Level Wise Business</CardTitle>
            <CardDescription>
              Your level-wise business statistics will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No level-wise business data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
