'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import type { Tenant, Property, TenantWithDetails, PaymentStatus } from '@/lib/types';
import { Loader2, ArrowLeft, User, Building, Calendar, Phone, BadgeDollarSign, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function getPaymentStatus(tenant: Tenant): { status: PaymentStatus, dueDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaseStart = new Date(tenant.leaseStartDate);
    leaseStart.setHours(0, 0, 0, 0);

    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
    lastPaid.setHours(0, 0, 0, 0);

    const paymentDay = tenant.paymentDay;

    // Determine the start of the current payment period.
    // This is the most recent due date that should have been met.
    let periodStart = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if (today.getDate() < paymentDay) {
        // If today is before this month's payment day, the current period started last month.
        periodStart.setMonth(periodStart.getMonth() - 1);
    }
    
    // Check if the lease started after the calculated period start.
    // This handles new tenants correctly.
    if (periodStart < leaseStart) {
        // The first payment is due on the first `paymentDay` on or after the lease starts.
        let firstDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
        if (leaseStart.getDate() > paymentDay) {
            firstDueDate.setMonth(firstDueDate.getMonth() + 1);
        }
        periodStart = firstDueDate;
    }
    
    const nextDueDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, paymentDay);

    if (lastPaid >= periodStart) {
        // They are paid for the current cycle. The status is 'Paid' and we show the next due date.
        return { status: 'Paid', dueDate: nextDueDate };
    } else {
        // They have not paid for the current cycle.
        if (today >= periodStart) {
            // If today is on or after the due date for the current cycle, they are 'Overdue'.
            return { status: 'Overdue', dueDate: periodStart };
        } else {
            // If today is before the due date for the cycle, it's 'Upcoming'.
            // This case typically applies to the very first payment of a new tenant.
            return { status: 'Upcoming', dueDate: periodStart };
        }
    }
}


function StatusBadge({ status }: { status: PaymentStatus }) {
  const variant = {
    Paid: 'success',
    Overdue: 'destructive',
    Upcoming: 'warning',
  }[status] as 'success' | 'destructive' | 'warning';

  const Icon = {
    Paid: Check,
    Overdue: X,
    Upcoming: Calendar,
  }[status];

  return <Badge variant={variant}><Icon className="mr-1 h-3 w-3"/>{status}</Badge>;
}


export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const tenantId = params.tenantId as string;
  
  const [tenantDetails, setTenantDetails] = useState<TenantWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!firestore || !tenantId) return;

    const tenantRef = doc(firestore, 'tenants', tenantId);

    const unsubscribe = onSnapshot(tenantRef, async (tenantSnap) => {
        if (tenantSnap.exists()) {
            const tenantData = { id: tenantSnap.id, ...tenantSnap.data() } as Tenant;
            
            // Fetch the associated property
            const propertyRef = doc(firestore, 'properties', tenantData.propertyId);
            const propSnap = await getDoc(propertyRef);

            if (propSnap.exists()) {
                const propertyData = { id: propSnap.id, ...propSnap.data() } as Property;
                const { status, dueDate } = getPaymentStatus(tenantData);

                setTenantDetails({
                    ...tenantData,
                    property: propertyData,
                    paymentStatus: status,
                    dueDate,
                });
            } else {
                 console.warn(`Property with ID ${tenantData.propertyId} not found.`);
                 setTenantDetails(null);
            }
        } else {
            console.error('Tenant not found');
            setTenantDetails(null);
        }
        setIsLoading(false);
    }, (error) => {
       const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'get',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, tenantId, auth]);


  const handleMarkAsPaid = async () => {
    if (!firestore || !tenantId || !tenantDetails) return;
    
    // Prevent marking as paid if already paid for the current cycle
    if (tenantDetails.paymentStatus === 'Paid') {
        toast({
            variant: 'destructive',
            title: 'Already Paid',
            description: `${tenantDetails.name} has already paid for the current cycle.`,
        });
        return;
    }

    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);

    try {
        const newLastPaidDate = new Date().toISOString();
        await updateDoc(tenantRef, { lastPaidDate: newLastPaidDate });
        toast({
            title: 'Payment Recorded',
            description: `Marked ${tenantDetails.name}'s rent as paid for this cycle.`,
        });
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'update',
            requestResourceData: { lastPaidDate: new Date().toISOString() },
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(false);
    }
  };

  const handleRevertPayment = async () => {
    if (!firestore || !tenantId || !tenantDetails) return;

    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);
    
    // The most reliable way to revert is to set the lastPaidDate to a date
    // guaranteed to be before any possible payment cycle.
    // Setting it to a day before the lease started is a robust way to do this.
    const leaseStartDate = new Date(tenantDetails.leaseStartDate);
    const revertDate = new Date(leaseStartDate.getTime() - 24 * 60 * 60 * 1000); // One day before lease start
    
    try {
        await updateDoc(tenantRef, { lastPaidDate: revertDate.toISOString() });
        toast({
            title: 'Payment Reverted',
            description: `Reverted last payment for ${tenantDetails.name}.`,
        });
    } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'update',
            requestResourceData: { lastPaidDate: revertDate.toISOString() },
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(false);
    }
  }


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenantDetails) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Tenant Not Found</h2>
        <p className="text-muted-foreground">The requested tenant could not be found.</p>
        <Button asChild variant="link">
            <Link href="/tenants">Back to Tenant List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
        </Button>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl">{tenantDetails.name}</CardTitle>
                        <CardDescription>Details and payment status for this tenant.</CardDescription>
                    </div>
                    <StatusBadge status={tenantDetails.paymentStatus} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                        <User className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">Tenant Info</div>
                            <div className="text-muted-foreground">{tenantDetails.name}</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Phone className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">Contact</div>
                            <div className="text-muted-foreground">{tenantDetails.phone}</div>
                        </div>
                    </div>
                     <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Building className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">Property</div>
                            <div className="text-muted-foreground">{tenantDetails.property.name}</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                        <BadgeDollarSign className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">Rent Amount</div>
                            <div className="text-muted-foreground">K{tenantDetails.rentAmount.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">Due Date</div>
                            <div className="text-muted-foreground">
                                {tenantDetails.dueDate instanceof Date && !isNaN(tenantDetails.dueDate.getTime())
                                    ? format(tenantDetails.dueDate, 'do MMMM, yyyy')
                                    : 'N/A'}
                            </div>
                        </div>
                    </div>
                     <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">Lease Start Date</div>
                            <div className="text-muted-foreground">
                                {tenantDetails.leaseStartDate && !isNaN(new Date(tenantDetails.leaseStartDate).getTime())
                                    ? format(new Date(tenantDetails.leaseStartDate), 'do MMMM, yyyy')
                                    : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2 border-t pt-6">
                <Button onClick={handleMarkAsPaid} disabled={isUpdating || tenantDetails.paymentStatus === 'Paid'}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mark as Paid
                </Button>
                <Button onClick={handleRevertPayment} disabled={isUpdating} variant="outline">
                     {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revert to Unpaid
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
