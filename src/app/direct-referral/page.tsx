import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DirectReferralPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Direct Referral</h1>
          <p className="text-muted-foreground">
            View and manage your direct referral information.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Direct Referral</CardTitle>
            <CardDescription>
              Your direct referral information will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No direct referral data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
