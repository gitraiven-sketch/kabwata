
'use client';

import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import type { Tenant, Property, PaymentStatus } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Building,
  Home,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getTenantsWithDetails } from '@/lib/data-helpers';

type DashboardData = {
  totalTenants: number;
  totalProperties: number;
  vacantProperties: number;
  statusCounts: {
    Paid: number;
    Overdue: number;
    Upcoming: number;
  };
};

const chartConfig: ChartConfig = {
  paid: {
    label: 'Paid',
    color: 'hsl(var(--chart-1))',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    color: 'hsl(var(--destructive))',
    icon: AlertCircle,
  },
  upcoming: {
    label: 'Upcoming',
    color: 'hsl(var(--chart-2))',
    icon: Clock,
  },
};

export function DashboardClient() {
  const firestore = useFirestore();
  const auth = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalTenants: 0,
    totalProperties: 0,
    vacantProperties: 0,
    statusCounts: { Paid: 0, Overdue: 0, Upcoming: 0 },
  });

  useEffect(() => {
    if (!firestore || !auth) return;

    // A combined listener to react to changes in tenants or properties
    const handleDataChange = async () => {
        try {
            const tenantsWithDetails = await getTenantsWithDetails();
            const propSnapshot = await getDocs(collection(firestore, 'properties'));

            const statusCounts = tenantsWithDetails.reduce((acc, tenant) => {
                if(tenant.paymentStatus) {
                    acc[tenant.paymentStatus] = (acc[tenant.paymentStatus] || 0) + 1;
                }
                return acc;
            }, {} as Record<PaymentStatus, number>);

            const occupiedPropertyIds = new Set(tenantsWithDetails.map(t => t.propertyId));
            const vacantCount = propSnapshot.docs.filter(doc => !occupiedPropertyIds.has(doc.id)).length;
            
            setData({
                totalTenants: tenantsWithDetails.length,
                totalProperties: propSnapshot.size,
                vacantProperties: vacantCount,
                statusCounts: {
                    Paid: statusCounts.Paid || 0,
                    Overdue: statusCounts.Overdue || 0,
                    Upcoming: statusCounts.Upcoming || 0,
                }
            });
        } catch(e: any) {
            if (e.message.includes('permission')) {
                const permissionError = new FirestorePermissionError({ path: 'tenants or properties', operation: 'list' }, auth);
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.error("DashboardClient error:", e);
            }
        }
    };
    
    // Set up listeners
    const unsubTenants = onSnapshot(collection(firestore, 'tenants'), handleDataChange, (error) => {
        const permissionError = new FirestorePermissionError({ path: 'tenants', operation: 'list' }, auth);
        errorEmitter.emit('permission-error', permissionError);
    });

    const unsubProperties = onSnapshot(collection(firestore, 'properties'), handleDataChange, (error) => {
        const permissionError = new FirestorePermissionError({ path: 'properties', operation: 'list' }, auth);
        errorEmitter.emit('permission-error', permissionError);
    });

    // Initial fetch
    handleDataChange();

    return () => {
        unsubTenants();
        unsubProperties();
    };
  }, [firestore, auth]);


  const chartData = [
    { name: 'paid', value: data.statusCounts.Paid, fill: 'var(--color-paid)' },
    { name: 'overdue', value: data.statusCounts.Overdue, fill: 'var(--color-overdue)' },
    { name: 'upcoming', value: data.statusCounts.Upcoming, fill: 'var(--color-upcoming)' },
  ].filter(item => item.value > 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalProperties}</div>
          <p className="text-xs text-muted-foreground">Managed properties</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalTenants}</div>
          <p className="text-xs text-muted-foreground">Currently active tenants</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vacant Shops</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.vacantProperties}</div>
          <p className="text-xs text-muted-foreground">Properties without tenants</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Payment Status
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-4">
          {chartData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[120px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={50} strokeWidth={2}>
                      {chartData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                      ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No payment data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
