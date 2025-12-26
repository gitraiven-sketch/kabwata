'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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

function getPaymentStatus(tenant: Tenant): { status: PaymentStatus; dueDate: Date } {
    const today = new Date();
    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(tenant.leaseStartDate);
    
    let dueDate = new Date(lastPaid.getFullYear(), lastPaid.getMonth(), tenant.paymentDay);
    dueDate.setMonth(dueDate.getMonth() + 1);

    if (today > dueDate) {
        return { status: 'Overdue', dueDate };
    }
    
    const lastPaidYear = lastPaid.getFullYear();
    const lastPaidMonth = lastPaid.getMonth();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (lastPaidYear === currentYear && lastPaidMonth === currentMonth) {
        return { status: 'Paid', dueDate };
    }

    return { status: 'Upcoming', dueDate };
}


function StatusBadge({ status }: { status: PaymentStatus }) {
  const variant = {
    Paid: 'default',
    Overdue: 'destructive',
    Upcoming: 'secondary',
  }[status] as 'default' | 'destructive' | 'secondary';

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

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!firestore || !tenantId) return;

    const tenantRef = doc(firestore, 'tenants', tenantId);
    const unsubscribeTenant = onSnapshot(tenantRef, (docSnap) => {
      if (docSnap.exists()) {
        const tenantData = { id: docSnap.id, ...docSnap.data() } as Tenant;
        setTenant(tenantData);
        
        // Now fetch the associated property
        const propertyRef = doc(firestore, 'properties', tenantData.propertyId);
        const unsubscribeProperty = onSnapshot(propertyRef, (propSnap) => {
            if(propSnap.exists()){
                setProperty({ id: propSnap.id, ...propSnap.data() } as Property);
            } else {
                console.warn(`Property with ID ${tenantData.propertyId} not found.`);
                setProperty(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribeProperty();

      } else {
        console.error('Tenant not found');
        setIsLoading(false);
        setTenant(null);
      }
    }, (error) => {
       const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'get',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
    });

    return () => unsubscribeTenant();
  }, [firestore, tenantId, auth]);
  
  const tenantDetails: TenantWithDetails | null = useMemo(() => {
    if (!tenant || !property) return null;
    const { status, dueDate } = getPaymentStatus(tenant);
    return {
        ...tenant,
        property,
        paymentStatus: status,
        dueDate,
    }
  }, [tenant, property]);

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
    if (!firestore || !tenantId || !tenant) return;

    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);
    
    // Calculate the previous month's date
    const lastPaid = new Date(tenant.lastPaidDate || tenant.leaseStartDate);
    const previousMonthDate = new Date(lastPaid.getFullYear(), lastPaid.getMonth() - 1, 15); // middle of the month to avoid edge cases

    try {
        await updateDoc(tenantRef, { lastPaidDate: previousMonthDate.toISOString() });
        toast({
            title: 'Payment Reverted',
            description: `Reverted last payment for ${tenant.name}.`,
        });
    } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'update',
            requestResourceData: { lastPaidDate: previousMonthDate.toISOString() },
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
                            <div className="font-semibold">Next Due Date</div>
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
                <Button onClick={handleRevertPayment} disabled={isUpdating} variant="destructive">
                     {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revert to Unpaid
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
