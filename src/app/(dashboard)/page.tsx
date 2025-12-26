import { getDashboardData } from '@/lib/data-helpers';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';

export default async function DashboardPage() {
  const dashboardData = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a summary of your complex.
        </p>
      </div>

      <DashboardClient data={dashboardData} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
            <CardDescription>
              Tenants who have not paid their rent for the current period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead className="text-right">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.overdueTenants.length > 0 ? (
                  dashboardData.overdueTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground">{tenant.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{tenant.property.name}</TableCell>
                      <TableCell className="text-right">
                        K{tenant.rentAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDistanceToNow(tenant.dueDate, { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No overdue payments. Great job!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
            <CardDescription>
              A look at the next few tenants whose rent is due soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Due In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {dashboardData.upcomingPayments.length > 0 ? (
                  dashboardData.upcomingPayments.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                         <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{tenant.name}</div>
                                <div className="text-xs text-muted-foreground">{tenant.email}</div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>{tenant.property.name}</TableCell>
                      <TableCell className="text-right">
                        {formatDistanceToNow(tenant.dueDate, { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No upcoming payments to show.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
