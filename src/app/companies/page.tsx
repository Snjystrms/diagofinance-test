import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, Building2, Users, Globe, Phone } from "lucide-react"

const companies = [
  {
    id: 1,
    name: "ABC Corporation",
    industry: "Technology",
    employees: 250,
    revenue: "$10M",
    status: "Active",
    website: "www.abccorp.com",
    phone: "+1 (555) 123-4567",
    address: "123 Business St, New York, NY",
  },
  {
    id: 2,
    name: "XYZ Inc",
    industry: "Healthcare",
    employees: 150,
    revenue: "$5M",
    status: "Active",
    website: "www.xyzinc.com",
    phone: "+1 (555) 234-5678",
    address: "456 Corporate Ave, San Francisco, CA",
  },
  {
    id: 3,
    name: "DEF Ltd",
    industry: "Finance",
    employees: 500,
    revenue: "$25M",
    status: "Active",
    website: "www.defltd.com",
    phone: "+1 (555) 345-6789",
    address: "789 Finance Blvd, Chicago, IL",
  },
  {
    id: 4,
    name: "GHI Solutions",
    industry: "Consulting",
    employees: 75,
    revenue: "$3M",
    status: "Inactive",
    website: "www.ghisolutions.com",
    phone: "+1 (555) 456-7890",
    address: "321 Consulting Way, Boston, MA",
  },
  {
    id: 5,
    name: "JKL Tech",
    industry: "Software",
    employees: 300,
    revenue: "$15M",
    status: "Active",
    website: "www.jkltech.com",
    phone: "+1 (555) 567-8901",
    address: "654 Tech Park, Austin, TX",
  },
]

export default function CompaniesPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Companies</h1>
            <p className="text-muted-foreground">
              Manage your company relationships and organizational data.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                +45 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,156</div>
              <p className="text-xs text-muted-foreground">
                94% active rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Company Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">
                employees per company
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$58M</div>
              <p className="text-xs text-muted-foreground">
                across all companies
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Directory</CardTitle>
            <CardDescription>
              View and manage all your company relationships
            </CardDescription>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  className="pl-8 w-80"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {company.website}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{company.industry}</TableCell>
                    <TableCell>{company.employees} employees</TableCell>
                    <TableCell>{company.revenue}</TableCell>
                    <TableCell>
                      <Badge variant={company.status === 'Active' ? 'default' : 'secondary'}>
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{company.phone}</span>
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