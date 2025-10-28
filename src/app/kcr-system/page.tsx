import { MainLayout } from "@/components/main-layout"

export default function KCRSystemPage() {
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">KCR System</h2>
            <p className="text-sm text-muted-foreground">
              Manage KCR system configurations and settings
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">KCR System management page is under construction</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
