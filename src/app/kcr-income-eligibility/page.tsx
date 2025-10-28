import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function KCRIncomeEligibilityPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">KCR Income Eligibility</h1>
          <p className="text-muted-foreground">
            Check your eligibility for KCR income and related criteria.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>KCR Income Eligibility</CardTitle>
            <CardDescription>
              Your KCR income eligibility details will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No KCR income eligibility data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
