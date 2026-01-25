'use client';

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
import { User, Loader2, PartyPopper } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Tenant, Property, TenantWithDetails } from '@/lib/types';
import { getPaymentStatus } from '@/lib/data-helpers';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  const [overdueTenants, setOverdueTenants] = useState<TenantWithDetails[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<TenantWithDetails[]>([]);

  useEffect(() => {
    if (!firestore) return;

    const unsubTenants = onSnapshot(collection(firestore, 'tenants'), (snapshot) => {
      const tenantData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Tenant))
        .filter(tenant => !tenant.isArchived); // Filter out archived tenants
      setTenants(tenantData);
      setIsLoading(false);
    });

    const unsubProps = onSnapshot(collection(firestore, 'properties'), (snapshot) => {
      const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
      setProperties(propsData);
      setIsLoading(false);
    });

    return () => {
      unsubTenants();
      unsubProps();
    };
  }, [firestore]);

  useEffect(() => {
    if (isLoading || properties.length === 0) return;

    const propertyMap = new Map(properties.map(p => [p.id, p]));
    const allTenantsWithDetails: TenantWithDetails[] = tenants
        .filter(tenant => !tenant.isArchived)
        .map(tenant => {
          const property = propertyMap.get(tenant.propertyId);
          const { status, dueDate } = getPaymentStatus(tenant);

          return {
            ...tenant,
            property: property || { id: tenant.propertyId, name: 'Unknown Property', group: 'Unknown', shopNumber: 0, address: '', paymentDay: tenant.paymentDay },
            paymentStatus: status,
            dueDate,
          };
        });

    setOverdueTenants(allTenantsWithDetails.filter(t => t.paymentStatus === 'Overdue'));
    setUpcomingPayments(allTenantsWithDetails.filter(t => t.paymentStatus === 'Upcoming').sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5));

  }, [tenants, properties, isLoading]);


  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Deployment Successful!</CardTitle>
              <CardDescription>Your App Hosting setup is working correctly.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a summary of your complex.
        </p>
      </div>

      <DashboardClient />

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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : overdueTenants.length > 0 ? (
                  overdueTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground">{tenant.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{tenant.property.name}</TableCell>
                      <TableCell className="text-right">
                        K{tenant.rentAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant.dueDate instanceof Date && !isNaN(tenant.dueDate.getTime())
                          ? formatDistanceToNow(tenant.dueDate, { addSuffix: true })
                          : 'N/A'}
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
                 {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                 ) : upcomingPayments.length > 0 ? (
                  upcomingPayments.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                         <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{tenant.name}</div>
                                <div className="text-xs text-muted-foreground">{tenant.phone}</div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>{tenant.property.name}</TableCell>
                      <TableCell className="text-right">
                         {tenant.dueDate instanceof Date && !isNaN(tenant.dueDate.getTime())
                          ? formatDistanceToNow(tenant.dueDate, { addSuffix: true })
                          : 'N/A'}
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
