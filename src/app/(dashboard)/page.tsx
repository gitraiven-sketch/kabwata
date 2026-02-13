'use client';

import { DashboardClient } from '@/components/dashboard/dashboard-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Tenant, Property, TenantWithDetails } from '@/lib/types';
import { getPaymentStatus } from '@/lib/data-helpers';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
      // Don't set loading to false here, wait for properties too
    });

    const unsubProps = onSnapshot(collection(firestore, 'properties'), (snapshot) => {
      const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
      setProperties(propsData);
    });

    return () => {
      unsubTenants();
      unsubProps();
    };
  }, [firestore]);

  useEffect(() => {
    if (properties.length > 0 || tenants.length > 0) {
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
        setIsLoading(false);
    } else {
        // This handles the initial state where tenants/properties might be empty
        // but we are not yet sure if it's because there are none or they are still loading.
        // A timeout could prevent a flash of "no data" on slow connections.
        const timer = setTimeout(() => {
             if (tenants.length === 0 && properties.length === 0) {
                setIsLoading(false);
             }
        }, 1500); // Wait 1.5s before deciding it's loaded and empty
       return () => clearTimeout(timer);
    }

  }, [tenants, properties]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a summary of your complex.
        </p>
      </div>

      <DashboardClient />

      <div className="grid animate-in fade-in slide-in-from-bottom-4 delay-150 duration-500 ease-out lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
            <CardDescription>
              Tenants who have not paid their rent for the current period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : overdueTenants.length > 0 ? (
              <div className="space-y-4">
                {overdueTenants.map((tenant) => (
                   <Link href={`/tenants/${tenant.id}`} key={tenant.id} className="block">
                      <Card className="transition-all hover:shadow-md hover:bg-destructive/10 bg-destructive/5 border-destructive/20">
                          <CardHeader className="flex-row items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                  </Avatar>
                                  <div>
                                      <div className="font-medium text-base">{tenant.name}</div>
                                      <div className="text-xs text-muted-foreground">{tenant.property.name}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-xs text-muted-foreground">
                                      {tenant.dueDate instanceof Date && !isNaN(tenant.dueDate.getTime())
                                        ? formatDistanceToNow(tenant.dueDate, { addSuffix: true })
                                        : 'N/A'}
                                  </div>
                              </div>
                          </CardHeader>
                      </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No overdue payments. Great job!
              </div>
            )}
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
             {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
             ) : upcomingPayments.length > 0 ? (
              <div className="space-y-4">
                {upcomingPayments.map((tenant) => (
                  <Link href={`/tenants/${tenant.id}`} key={tenant.id} className="block">
                      <Card className="transition-all hover:shadow-md hover:bg-accent/10 bg-accent/5 border-accent/20">
                          <CardHeader className="flex-row items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                  </Avatar>
                                  <div>
                                      <div className="font-medium text-base">{tenant.name}</div>
                                      <div className="text-xs text-muted-foreground">{tenant.property.name}</div>
                                  </div>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                  {tenant.dueDate instanceof Date && !isNaN(tenant.dueDate.getTime())
                                    ? formatDistanceToNow(tenant.dueDate, { addSuffix: true })
                                    : 'N/A'}
                              </div>
                          </CardHeader>
                      </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No upcoming payments to show.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
