import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RaiseTicketPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Raise a Support Ticket</h1>
          <p className="text-muted-foreground">
            Submit a new support ticket for assistance.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Raise a Support Ticket</CardTitle>
            <CardDescription>
              Fill out the form below to submit a new support request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Support ticket form will be available here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
