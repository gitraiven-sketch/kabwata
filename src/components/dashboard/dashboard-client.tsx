'use client';

import { useEffect, useState } from 'react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { 
  collection, 
  onSnapshot, 
  getDocs, 
  collectionGroup, 
  query, 
  where, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
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
  AlertCircle,
  Clock,
  Bell,
  Check,
  X,
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
import type { PaymentProof } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

type DashboardData = {
  totalTenants: number;
  totalProperties: number;
  vacantProperties: number;
  statusCounts: {
    Paid: number;
    Overdue: number;
    Upcoming: number;
  };
  pendingSubmissions: PaymentProof[];
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
  }
};

export function DashboardClient() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({ 
    totalTenants: 0,
    totalProperties: 0,
    vacantProperties: 0,
    statusCounts: { Paid: 0, Overdue: 0, Upcoming: 0 },
    pendingSubmissions: [],
  });

  const handleUpdateStatus = async (proof: PaymentProof, newStatus: 'approved' | 'rejected') => {
    if (!firestore || !user) return;
    
    try {
        const proofRef = doc(firestore, `tenants/${proof.tenantId}/payment_proofs`, proof.id);
        
        if (newStatus === 'approved') {
            // If approved, we also need to record it as an actual payment
            const tenants = await getTenantsWithDetails();
            const tenant = tenants.find(t => t.id === proof.tenantId);
            
            if (tenant) {
                const tenantRef = doc(firestore, 'tenants', tenant.id);
                const paymentsRef = collection(firestore, 'payments');
                const today = new Date();
                
                // 1. Update tenant lastPaidDate
                await updateDoc(tenantRef, { lastPaidDate: today.toISOString() });
                
                // 2. Record the payment (extract amount from amountInWords if possible, or just use 0/default)
                // Since we don't have a numeric amount in PaymentProof, we'll try to parse it or use a default
                const numericAmount = parseFloat(proof.amountInWords.replace(/[^0-9.]/g, '')) || 0;
                
                await addDoc(paymentsRef, {
                    tenantId: tenant.id,
                    tenantName: tenant.name,
                    propertyId: tenant.propertyId,
                    propertyName: tenant.property.name,
                    amount: numericAmount,
                    paymentDate: serverTimestamp(),
                    recordedAt: serverTimestamp(),
                    proofId: proof.id
                });
            }
        }

        await updateDoc(proofRef, { status: newStatus });
        
        toast({
            title: `Submission ${newStatus}`,
            description: `The payment submission has been ${newStatus}.`,
        });
    } catch (error) {
        console.error("Error updating status:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update submission status.',
        });
    }
  };

  useEffect(() => {
    if (!firestore || !auth || !user) return;

    // Listener for pending submissions
    const q = query(
      collectionGroup(firestore, 'payment_proofs'),
      where('status', '==', 'pending'),
      orderBy('uploadedAt', 'desc'),
      limit(5)
    );

    const unsubProofs = onSnapshot(q, (snapshot) => {
      const proofs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentProof));
      setData(prev => ({ ...prev, pendingSubmissions: proofs }));
    }, (error) => {
      console.error("Error fetching pending submissions:", error);
    });

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
            
            setData(prev => ({
                ...prev,
                totalTenants: tenantsWithDetails.length,
                totalProperties: propSnapshot.size,
                vacantProperties: vacantCount,
                statusCounts: {
                    Paid: statusCounts.Paid || 0,
                    Overdue: statusCounts.Overdue || 0,
                    Upcoming: statusCounts.Upcoming || 0,
                }
            }));
        } catch(e: any) {
            console.error("Dashboard data fetch error:", e);
             const permissionError = new FirestorePermissionError({
                path: 'dashboard-summary',
                operation: 'list',
            }, auth);
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const unsubTenants = onSnapshot(collection(firestore, 'tenants'), handleDataChange);
    const unsubProps = onSnapshot(collection(firestore, 'properties'), handleDataChange);

    return () => {
        unsubTenants();
        unsubProps();
        unsubProofs();
    };
  }, [firestore, auth, user]);


  const chartData = [
    { name: 'paid', value: data.statusCounts.Paid, fill: 'var(--color-paid)' },
    { name: 'overdue', value: data.statusCounts.Overdue, fill: 'var(--color-overdue)' },
    { name: 'upcoming', value: data.statusCounts.Upcoming, fill: 'var(--color-upcoming)' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {data.pendingSubmissions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle className="text-lg">New Payment Submissions</CardTitle>
            </div>
            <Badge variant="default" className="rounded-full px-2">
              {data.pendingSubmissions.length} New
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.pendingSubmissions.map((proof) => (
              <div key={proof.id} className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">{proof.amountInWords}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Submitted on {proof.uploadedAt?.toDate ? format(proof.uploadedAt.toDate(), 'MMM d, h:mm a') : 'Recently'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                    onClick={() => handleUpdateStatus(proof, 'rejected')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 px-3 text-xs gap-1"
                    onClick={() => handleUpdateStatus(proof, 'approved')}
                  >
                    <Check className="h-3 w-3" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
