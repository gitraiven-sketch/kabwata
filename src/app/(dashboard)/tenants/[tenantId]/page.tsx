
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, getDoc, collection, addDoc, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';
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

    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0); // Use epoch if never paid
    lastPaid.setHours(0, 0, 0, 0);

    // Determine the start of the current payment cycle
    let cycleStart;
    const paymentDay = tenant.paymentDay;

    if (today.getDate() >= paymentDay) {
        // We are in the cycle for the current month
        cycleStart = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    } else {
        // We are in the cycle for the previous month
        cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, paymentDay);
    }

    // Ensure cycle doesn't start before the lease
    if (cycleStart < leaseStart) {
        // If the calculated cycle start is before the lease, the first due date is based on the lease start month
        cycleStart = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
        if (leaseStart.getDate() > paymentDay) {
             cycleStart.setMonth(cycleStart.getMonth()+1)
        }
    }

    // Determine the due date for the current cycle
    const currentDueDate = new Date(cycleStart);

    // Determine next month's due date
    const nextDueDate = new Date(cycleStart);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);


    if (lastPaid.getTime() >= cycleStart.getTime()) {
        return { status: 'Paid', dueDate: nextDueDate };
    }

    if (today.getTime() >= currentDueDate.getTime()) {
        return { status: 'Overdue', dueDate: currentDueDate };
    }
    
    return { status: 'Upcoming', dueDate: currentDueDate };
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
    
    if (tenantDetails.paymentStatus === 'Paid') {
        toast({
            variant: 'destructive',
            title: 'Already Paid',
            description: `${tenantDetails.name} has already paid for the current cycle.`,
        });
        return;
    }

    setIsUpdating(true);

    try {
        const batch = writeBatch(firestore);
        
        // 1. Update the tenant's lastPaidDate
        const tenantRef = doc(firestore, 'tenants', tenantId);
        const newLastPaidDate = new Date().toISOString();
        batch.update(tenantRef, { lastPaidDate: newLastPaidDate });

        // 2. Create a new payment record
        const paymentRef = doc(collection(firestore, 'payments'));
        const newPayment = {
            tenantId: tenantId,
            propertyId: tenantDetails.property.id,
            amount: tenantDetails.rentAmount,
            paymentDate: tenantDetails.dueDate.toISOString(), // The date the payment was for
            recordedAt: Timestamp.now(),
            tenantName: tenantDetails.name,
            propertyName: tenantDetails.property.name,
        };
        batch.set(paymentRef, newPayment);
        
        await batch.commit();

        toast({
            title: 'Payment Recorded',
            description: `Marked ${tenantDetails.name}'s rent as paid and created a history record.`,
        });

    } catch(e) {
        console.error(e);
        const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId} or payments`,
            operation: 'write',
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
        // In a real app, you might also want to find and delete the corresponding payment record.
        // For now, we will just revert the status.
        await updateDoc(tenantRef, { lastPaidDate: revertDate.toISOString() });
        toast({
            title: 'Payment Reverted',
            description: `Reverted last payment for ${tenantDetails.name}. Payment history may need manual correction.`,
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
                            <div className="text-muted-foreground">{format(tenantDetails.dueDate, 'do MMMM, yyyy')}</div>
                        </div>
                    </div>
                     <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">Lease Start Date</div>
                            <div className="text-muted-foreground">{format(new Date(tenantDetails.leaseStartDate), 'do MMMM, yyyy')}</div>
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
