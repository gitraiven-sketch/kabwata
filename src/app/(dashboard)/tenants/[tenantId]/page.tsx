'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, getDoc, deleteDoc, collection, query, orderBy, writeBatch } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import type { Tenant, Property, TenantWithDetails, PaymentStatus, PaymentProof, PaymentProofStatus } from '@/lib/types';
import { Loader2, ArrowLeft, User, Building, Calendar, Phone, Check, X, LogOut, UserCheck, Trash2, Clock, ThumbsUp, ThumbsDown, History, PlusCircle, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format, formatDistanceToNow } from 'date-fns';
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
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';


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

function ProofStatusBadge({ status }: { status: PaymentProofStatus }) {
  const variant = {
    approved: 'success',
    rejected: 'destructive',
    pending: 'secondary',
  }[status] as 'success' | 'destructive' | 'secondary';

  const Icon = {
    approved: ThumbsUp,
    rejected: ThumbsDown,
    pending: Clock,
  }[status];

  return (
    <Badge variant={variant} className="capitalize w-full max-w-max justify-center">
      <Icon className="mr-1 h-3 w-3"/>
      {status}
    </Badge>
  );
}


export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const tenantId = params.tenantId as string;
  
  const [tenantDetails, setTenantDetails] = useState<TenantWithDetails | null>(null);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProofsLoading, setIsProofsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !tenantId) return;

    const tenantRef = doc(firestore, 'tenants', tenantId);
    const unsubTenant = onSnapshot(tenantRef, async (tenantSnap) => {
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
            setTenantDetails(null);
        }
        setIsLoading(false);
    }, (error) => {
       const permissionError = new FirestorePermissionError({ path: `tenants/${tenantId}`, operation: 'get' }, auth);
       errorEmitter.emit('permission-error', permissionError);
       setIsLoading(false);
    });

    const proofsQuery = query(collection(firestore, 'tenants', tenantId, 'payment_proofs'), orderBy('uploadedAt', 'desc'));
    const unsubProofs = onSnapshot(proofsQuery, (snapshot) => {
        const proofsData = snapshot.docs.map(doc => {
            const data = doc.data();
            // Firestore timestamps can be objects. Convert to a string if needed.
            const uploadedAt = data.uploadedAt?.toDate ? data.uploadedAt.toDate().toISOString() : data.uploadedAt;
            return {
                id: doc.id,
                ...data,
                uploadedAt,
            } as PaymentProof
        });
        setProofs(proofsData);
        setIsProofsLoading(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({ path: `tenants/${tenantId}/payment_proofs`, operation: 'list' }, auth);
        errorEmitter.emit('permission-error', permissionError);
        setIsProofsLoading(false);
    });

    return () => {
        unsubTenant();
        unsubProofs();
    };
  }, [firestore, tenantId, auth]);


  const handleMarkAsPaid = async () => {
    if (!firestore || !tenantId) return;
    setIsUpdating(true);
    const tenantRef = doc(firestore, 'tenants', tenantId);
    
    try {
        await updateDoc(tenantRef, { lastPaidDate: new Date().toISOString() });
        toast({
            title: 'Payment Recorded',
            description: `${tenantDetails?.name} has been marked as paid.`,
        });
    } catch (e) {
        const permissionError = new FirestorePermissionError({
            path: tenantRef.path,
            operation: 'update',
            requestResourceData: { lastPaidDate: '...' },
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdating(false);
    }
  };


  const handleApproveProof = async (proofId: string) => {
     if (!firestore || !auth || !tenantId) return;
     setIsUpdating(true);
     try {
         const batch = writeBatch(firestore);

         const proofRef = doc(firestore, 'tenants', tenantId, 'payment_proofs', proofId);
         batch.update(proofRef, { status: 'approved' });

         const tenantRef = doc(firestore, 'tenants', tenantId);
         batch.update(tenantRef, { lastPaidDate: new Date().toISOString() });

         await batch.commit();
         toast({
             title: 'Proof Approved',
             description: 'The proof was approved and payment has been recorded.',
         });
     } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: `tenants/${tenantId}/payment_proofs/${proofId}`,
            operation: 'update',
            requestResourceData: { status: 'approved' },
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
     } finally {
        setIsUpdating(false);
     }
  };


  const handleRejectProof = async (proofId: string) => {
     if (!firestore || !auth || !tenantId) return;
     setIsUpdating(true);
     const proofRef = doc(firestore, 'tenants', tenantId, 'payment_proofs', proofId);

     try {
         await updateDoc(proofRef, { status: 'rejected' });
         toast({
             variant: 'default',
             title: 'Proof Rejected',
             description: 'The proof of payment has been marked as rejected.',
         });
     } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: proofRef.path,
            operation: 'update',
            requestResourceData: { status: 'rejected' },
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
    
    try {
        // Reverting sets the lastPaidDate to the lease start date, ensuring they become 'Overdue' or 'Upcoming'.
        await updateDoc(tenantRef, { lastPaidDate: tenantDetails.leaseStartDate });
        toast({
            title: 'Payment Reverted',
            description: `Last payment for ${tenantDetails.name} has been reverted.`,
        });
    } catch(e) {
         const permissionError = new FirestorePermissionError({
            path: tenantRef.path,
            operation: 'update',
            requestResourceData: { lastPaidDate: tenantDetails.leaseStartDate },
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
  
  const hasPendingProof = proofs.some(p => p.status === 'pending');

  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/tenants')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-3">
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
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoItem icon={User} label="Tenant Info" value={tenantDetails.name} />
                            <InfoItem icon={Phone} label="Contact" value={tenantDetails.phone} />
                            <InfoItem icon={Building} label="Property" value={tenantDetails.property.name} />
                            <InfoItem icon={Calendar} label="Next Due Date" value={tenantDetails.dueDate instanceof Date && !isNaN(tenantDetails.dueDate.getTime()) ? format(tenantDetails.dueDate, 'do MMMM, yyyy') : 'N/A'} />
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
                                <Button onClick={handleMarkAsPaid} disabled={isUpdating || tenantDetails.paymentStatus === 'Paid' || hasPendingProof}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Mark as Paid
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
                                            <AlertDialogAction onClick={handleMarkAsVacant}>Confirm</AlertDialogAction>
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
                                        <AlertDialogAction onClick={handleDeleteTenant} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Payment Submissions</CardTitle>
                    <CardDescription>Review and approve payment amounts submitted by the tenant.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isProofsLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
                    ) : proofs.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Amount (in words)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {proofs.map(proof => (
                                    <TableRow key={proof.id}>
                                        <TableCell className="text-xs font-medium">
                                            {proof.uploadedAt ? formatDistanceToNow(new Date(proof.uploadedAt), { addSuffix: true }) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                "{proof.amountInWords}"
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <ProofStatusBadge status={proof.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {proof.status === 'pending' && (
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="icon" variant="outline" className="h-8 w-8 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleRejectProof(proof.id)} disabled={isUpdating}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" className="h-8 w-8 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => handleApproveProof(proof.id)} disabled={isUpdating}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-10 text-center text-sm text-muted-foreground">No payment submissions have been made.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-muted-foreground text-sm">{value || 'N/A'}</div>
        </div>
    </div>
  )
}
