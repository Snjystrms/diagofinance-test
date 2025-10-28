import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MyAllTeamPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My All Team</h1>
          <p className="text-muted-foreground">
            View and manage your complete team information.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>My All Team</CardTitle>
            <CardDescription>
              Your complete team information will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No team data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
