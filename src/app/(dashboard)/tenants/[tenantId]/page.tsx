'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import type { Tenant, Property, TenantWithDetails, PaymentStatus } from '@/lib/types';
import { Loader2, ArrowLeft, User, Building, Calendar, Phone, Check, X, LogOut, UserCheck, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getPaymentStatus } from '@/lib/data-helpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


function StatusBadge({ status }: { status: PaymentStatus }) {
  const variant = {
    Paid: 'success',
    Overdue: 'destructive',
    Upcoming: 'upcoming',
  }[status] as 'success' | 'destructive' | 'upcoming';

  const Icon = {
    Paid: Check,
    Overdue: X,
    Upcoming: Clock,
  }[status];

  if (!variant || !Icon) return null;

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
  }, [firestore, tenantId, auth, router]);


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
    
    // To revert, we need to find what the last paid date was before the current one.
    // This simple implementation goes back one cycle. A more complex app might store payment history.
    const lastPaid = tenantDetails.lastPaidDate ? new Date(tenantDetails.lastPaidDate) : new Date(tenantDetails.leaseStartDate);
    const previousCycleDate = new Date(lastPaid);
    previousCycleDate.setMonth(previousCycleDate.getMonth() - 1);

    try {
        await updateDoc(tenantRef, { lastPaidDate: previousCycleDate.toISOString() });
        toast({
            title: 'Payment Reverted',
            description: `Reverted last payment for ${tenantDetails.name}.`,
        });
    } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'update',
            requestResourceData: { lastPaidDate: previousCycleDate.toISOString() },
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(false);
    }
  }
  
  const handleMarkAsVacant = async () => {
    if (!firestore || !auth || !tenantId || !tenantDetails) return;
    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);

    try {
        await updateDoc(tenantRef, { isArchived: true });
        toast({
            title: 'Lease Ended',
            description: `${tenantDetails.name}'s lease has been ended and the property is now vacant.`,
        });
        router.push('/tenants');
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'update',
            requestResourceData: { isArchived: true },
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(false);
    }
  };

  const handleReactivateLease = async () => {
    if (!firestore || !tenantId || !tenantDetails) return;
    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);

    try {
        // Set last paid date to today to ensure they start as 'Paid'
        await updateDoc(tenantRef, { isArchived: false, lastPaidDate: new Date().toISOString() });
        toast({
            title: 'Lease Reactivated',
            description: `${tenantDetails.name}'s lease is now active.`,
        });
    } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'update',
            requestResourceData: { isArchived: false },
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!firestore || !tenantId || !tenantDetails) return;
    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);

    try {
        await deleteDoc(tenantRef);
        toast({
            title: 'Tenant Deleted',
            description: `${tenantDetails.name} has been permanently deleted.`,
        });
        router.push('/tenants');
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}`,
            operation: 'delete',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(false);
    }
  };


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
        <p className="text-muted-foreground">The requested tenant could not be found or has been deleted.</p>
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
                     {tenantDetails.isArchived ? (
                        <Badge variant="secondary"><LogOut className="mr-1 h-3 w-3"/>Vacant</Badge>
                    ) : (
                        tenantDetails.paymentStatus && <StatusBadge status={tenantDetails.paymentStatus} />
                    )}
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
            <CardFooter className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                <div className="flex flex-wrap gap-2">
                    {tenantDetails.isArchived ? (
                        <Button onClick={handleReactivateLease} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <UserCheck className="mr-2 h-4 w-4" /> Reactivate Lease
                        </Button>
                    ) : (
                        <>
                        <Button onClick={handleMarkAsPaid} disabled={isUpdating || tenantDetails.paymentStatus === 'Paid'}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Mark as Paid
                        </Button>
                        <Button onClick={handleRevertPayment} disabled={isUpdating || tenantDetails.paymentStatus !== 'Paid'} variant="outline">
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Revert to Unpaid
                        </Button>
                        </>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {!tenantDetails.isArchived && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={isUpdating}>
                                    <LogOut className="mr-2 h-4 w-4" /> Mark as Vacant
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will mark the tenant as vacant. Their data will be preserved and they will remain in the tenant list.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleMarkAsVacant}
                                    >
                                        Confirm
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isUpdating}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Tenant
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete <strong>{tenantDetails.name}</strong> and all associated data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteTenant}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
