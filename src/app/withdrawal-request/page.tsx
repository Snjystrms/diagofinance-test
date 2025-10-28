import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function WithdrawalRequestPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Withdrawal Request</h1>
          <p className="text-muted-foreground">
            Request a withdrawal from your account.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Request</CardTitle>
            <CardDescription>
              Submit a new withdrawal request from your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Withdrawal request form will be available here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
