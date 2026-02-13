'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import type { Tenant, Property, TenantWithDetails, PaymentStatus } from '@/lib/types';
import { Loader2, ArrowLeft, User, Building, Calendar, Phone, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getPaymentStatus } from '@/lib/data-helpers';


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
            
            let property: Property | null = null;
            if (tenantData.propertyId) {
                const propertyRef = doc(firestore, 'properties', tenantData.propertyId);
                const propSnap = await getDoc(propertyRef);
                if (propSnap.exists()) {
                    property = { id: propSnap.id, ...propSnap.data() } as Property;
                }
            }
            
            const { status, dueDate } = getPaymentStatus(tenantData);

            setTenantDetails({
                ...tenantData,
                property: property || { id: tenantData.propertyId, name: 'Unknown Property', group: 'Unknown', shopNumber: 0, address: '', paymentDay: tenantData.paymentDay },
                paymentStatus: status,
                dueDate,
            });
            
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

    if (tenantDetails.paymentStatus !== 'Paid') {
        toast({
            variant: 'destructive',
            title: 'Not Paid',
            description: `${tenantDetails.name} is not marked as paid for the current cycle.`,
        });
        return;
    }

    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);
    
    // To revert a 'Paid' status, we need to set the lastPaidDate to a date
    // that makes the last paid cycle become unpaid again.
    // The `dueDate` for a 'Paid' tenant is the *next* due date.
    const nextDueDate = tenantDetails.dueDate;
    
    // The cycle that was just paid was due one month before that.
    const paidCycleDueDate = new Date(nextDueDate);
    paidCycleDueDate.setMonth(paidCycleDueDate.getMonth() - 1);

    // To make this cycle unpaid, we need to set `lastPaidDate` to a date
    // *before* `paidCycleDueDate`. The simplest way is to find the due date
    // of the cycle *before* the one that was just paid.
    const revertToDate = new Date(paidCycleDueDate);
    revertToDate.setMonth(revertToDate.getMonth() - 1);

    try {
        await updateDoc(tenantRef, { lastPaidDate: revertToDate.toISOString() });
        toast({
            title: 'Payment Reverted',
            description: `Reverted last payment for ${tenantDetails.name}. The status will now be recalculated.`,
        });
    } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'update',
            requestResourceData: { lastPaidDate: revertToDate.toISOString() },
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
                    {tenantDetails.paymentStatus && <StatusBadge status={tenantDetails.paymentStatus} />}
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
                <Button onClick={handleRevertPayment} disabled={isUpdating || tenantDetails.paymentStatus !== 'Paid'} variant="outline">
                     {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revert to Unpaid
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
