import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, TrendingUp, DollarSign, Calendar, User } from "lucide-react"

const deals = [
  {
    id: 1,
    title: "Enterprise Software License",
    customer: "ABC Corp",
    value: "$50,000",
    stage: "Proposal",
    probability: 75,
    expectedClose: "2024-02-15",
    owner: "John Smith",
  },
  {
    id: 2,
    title: "Consulting Services",
    customer: "XYZ Inc",
    value: "$25,000",
    stage: "Negotiation",
    probability: 60,
    expectedClose: "2024-01-30",
    owner: "Sarah Johnson",
  },
  {
    id: 3,
    title: "Product Implementation",
    customer: "DEF Ltd",
    value: "$35,000",
    stage: "Qualification",
    probability: 40,
    expectedClose: "2024-03-01",
    owner: "Michael Brown",
  },
  {
    id: 4,
    title: "Annual Support Contract",
    customer: "GHI Solutions",
    value: "$15,000",
    stage: "Closed Won",
    probability: 100,
    expectedClose: "2024-01-20",
    owner: "Emily Davis",
  },
  {
    id: 5,
    title: "Custom Development",
    customer: "JKL Tech",
    value: "$80,000",
    stage: "Discovery",
    probability: 25,
    expectedClose: "2024-04-15",
    owner: "David Wilson",
  },
]

const stages = [
  { name: "Qualification", count: 5, value: "$120,000" },
  { name: "Discovery", count: 3, value: "$95,000" },
  { name: "Proposal", count: 2, value: "$75,000" },
  { name: "Negotiation", count: 4, value: "$150,000" },
  { name: "Closed Won", count: 8, value: "$320,000" },
  { name: "Closed Lost", count: 2, value: "$45,000" },
]

export default function DealsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Deals</h1>
            <p className="text-muted-foreground">
              Track and manage your sales pipeline and opportunities.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Deal
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$805,000</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$320,000</div>
              <p className="text-xs text-muted-foreground">
                8 deals closed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$40,250</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">68%</div>
              <p className="text-xs text-muted-foreground">
                +5% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline by Stage</CardTitle>
              <CardDescription>
                Overview of deals in each stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stages.map((stage) => (
                  <div key={stage.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">{stage.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{stage.count} deals</div>
                      <div className="text-xs text-muted-foreground">{stage.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Deals</CardTitle>
              <CardDescription>
                Latest deals in your pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.slice(0, 5).map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{deal.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {deal.customer}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{deal.value}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{deal.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>
                              {deal.owner.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{deal.owner}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Deals</CardTitle>
            <CardDescription>
              Complete list of all deals in your pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div className="font-medium">{deal.title}</div>
                    </TableCell>
                    <TableCell>{deal.customer}</TableCell>
                    <TableCell>{deal.value}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.stage}</Badge>
                    </TableCell>
                    <TableCell>{deal.probability}%</TableCell>
                    <TableCell>{deal.expectedClose}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            {deal.owner.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{deal.owner}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
} 