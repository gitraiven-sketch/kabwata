'use client';

import * as React from 'react';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  User,
  Loader2,
} from 'lucide-react';
import type { TenantWithDetails, PaymentStatus, Tenant, Property, Payment } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateRentReminder } from '@/ai/flows/automated-rent-reminders';
import { useAuth, useFirestore } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const statusStyles: Record<PaymentStatus, string> = {
  Paid: 'bg-green-100 text-green-800 border-green-200',
  Overdue: 'bg-red-100 text-red-800 border-red-200',
  Upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
};

function RecordPaymentForm({ tenant, onPaymentAdded }: { tenant: Tenant, onPaymentAdded: () => void }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(tenant.rentAmount);
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;

    setIsLoading(true);
    
    const newPayment = {
      tenantId: tenant.id,
      amount: Number(amount),
      date: new Date(date).toISOString(),
    };

    const paymentsRef = collection(firestore, 'tenants', tenant.id, 'payments');
    addDoc(paymentsRef, newPayment)
      .then(() => {
        toast({
          title: 'Payment Recorded',
          description: `Payment of K${amount} for ${tenant.name} has been recorded.`,
        });
        onPaymentAdded();
        setOpen(false);
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: paymentsRef.path,
          operation: 'create',
          requestResourceData: newPayment,
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Record Payment
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Payment for {tenant.name}</DialogTitle>
            <DialogDescription>
              Enter the details of the payment received.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount (K)
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Payment Date
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTenantForm({ tenant, onTenantUpdated, properties }: { tenant: Tenant, onTenantUpdated: () => void, properties: Property[] }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [editedTenant, setEditedTenant] = React.useState(tenant);

  const propertyOptions = properties.map(p => ({ value: p.id, label: `${p.group} - Shop ${p.shopNumber} (${p.name})`}));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedTenant(prev => ({ ...prev, [name]: value }));
  };
  
  const handleValueChange = (name: string, value: string | number) => {
    setEditedTenant(prev => ({ ...prev, [name]: value }));
  }


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;

    setIsLoading(true);
    const tenantRef = doc(firestore, 'tenants', tenant.id);
    
    const { id, ...updateData } = editedTenant;

    updateDoc(tenantRef, {
      ...updateData,
      rentAmount: Number(updateData.rentAmount),
      paymentDay: Number(updateData.paymentDay),
    })
      .then(() => {
        toast({
          title: 'Tenant Updated',
          description: `${editedTenant.name} has been successfully updated.`,
        });
        onTenantUpdated();
        setOpen(false);
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: tenantRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Edit
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update the details for this tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={editedTenant.name} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" name="email" type="email" value={editedTenant.email} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" name="phone" value={editedTenant.phone} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="propertyId" className="text-right">Property</Label>
               <Combobox
                name="propertyId"
                options={propertyOptions}
                placeholder="Select property..."
                className="col-span-3"
                value={editedTenant.propertyId}
                onValueChange={(value) => handleValueChange('propertyId', value)}
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rentAmount" className="text-right">Rent (K)</Label>
              <Input id="rentAmount" name="rentAmount" type="number" value={editedTenant.rentAmount} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDay" className="text-right">Payment Day</Label>
              <Input id="paymentDay" name="paymentDay" type="number" min="1" max="31" value={editedTenant.paymentDay} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaseStartDate" className="text-right">Lease Start</Label>
              <Input id="leaseStartDate" name="leaseStartDate" type="date" value={editedTenant.leaseStartDate} onChange={handleChange} required className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function AddTenantForm({ onTenantAdded, properties }: { onTenantAdded: () => void; properties: Property[] }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const propertyOptions = properties.map(p => ({ value: p.id, label: `${p.group} - Shop ${p.shopNumber} (${p.name})`}));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;

    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const newTenantData = Object.fromEntries(formData.entries()) as Omit<Tenant, 'id'>;

    const tenantsRef = collection(firestore, 'tenants');
    addDoc(tenantsRef, {
        ...newTenantData,
        rentAmount: Number(newTenantData.rentAmount),
        paymentDay: Number(newTenantData.paymentDay),
      })
      .then(() => {
        toast({
          title: 'Tenant Added',
          description: `${newTenantData.name} has been successfully added.`,
        });
        onTenantAdded();
        setOpen(false);
      })
      .catch((error: any) => {
        const permissionError = new FirestorePermissionError({
          path: tenantsRef.path,
          operation: 'create',
          requestResourceData: newTenantData,
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Enter the details for the new tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input id="phone" name="phone" required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="propertyId" className="text-right">
                Property
              </Label>
               <Combobox
                name="propertyId"
                options={propertyOptions}
                placeholder="Select property..."
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rentAmount" className="text-right">
                Rent (K)
              </Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDay" className="text-right">
                Payment Day
              </Label>
              <Input
                id="paymentDay"
                name="paymentDay"
                type="number"
                min="1"
                max="31"
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaseStartDate" className="text-right">
                Lease Start
              </Label>
              <Input
                id="leaseStartDate"
                name="leaseStartDate"
                type="date"
                required
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Tenant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TenantList({ tenants: initialTenants }: { tenants: TenantWithDetails[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const [tenants, setTenants] = React.useState<TenantWithDetails[]>(initialTenants);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchTenantsAndProperties = React.useCallback(async () => {
    if (!firestore || !auth) return;
    setIsLoading(true);

    const propertiesQuery = query(collection(firestore, "properties"));
    const tenantsQuery = query(collection(firestore, "tenants"));
    
    const unsubProperties = onSnapshot(propertiesQuery, (snapshot) => {
        const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        setProperties(props);
    });
    
    const unsubTenants = onSnapshot(tenantsQuery, async (tenantsSnapshot) => {
        const propertyMap = new Map<string, Property>();
        const propsSnapshot = await getDocs(propertiesQuery);
        propsSnapshot.forEach(doc => {
            propertyMap.set(doc.id, { id: doc.id, ...doc.data() } as Property);
        });

        const tenantsDataPromises = tenantsSnapshot.docs.map(async (tenantDoc) => {
            const tenantData = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
            
            const paymentsQuery = query(collection(firestore, 'tenants', tenantDoc.id, 'payments'));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const tenantPayments = paymentsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as Payment));

            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();
            const dueDate = new Date(currentYear, currentMonth, tenantData.paymentDay);

            const paymentForCurrentMonth = tenantPayments.find(p => 
                new Date(p.date).getMonth() === currentMonth &&
                new Date(p.date).getFullYear() === currentYear
            );
            
            let paymentStatus: PaymentStatus = 'Upcoming';
            if (paymentForCurrentMonth) {
                paymentStatus = 'Paid';
            } else if (today > dueDate) {
                paymentStatus = 'Overdue';
            }

            return {
                ...tenantData,
                property: propertyMap.get(tenantData.propertyId)!,
                paymentStatus: paymentStatus,
                dueDate: dueDate,
                payments: tenantPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            };
        });

        const tenantsData = await Promise.all(tenantsDataPromises);
        setTenants(tenantsData);
        setIsLoading(false);
    },
    (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: tenantsQuery.path,
            operation: 'list',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
    });

    return () => {
        unsubTenants();
        unsubProperties();
    };

  }, [firestore, auth]);


  React.useEffect(() => {
    const unsubscribePromise = fetchTenantsAndProperties();
    return () => {
        unsubscribePromise.then(unsub => unsub && unsub());
    }
  }, [fetchTenantsAndProperties]);

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tenant.property && tenant.property.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSendReminder = async (tenant: TenantWithDetails) => {
    toast({ title: 'Generating Reminder...', description: `Preparing message for ${tenant.name}.` });
    try {
        const result = await generateRentReminder({
            tenantName: tenant.name,
            propertyName: tenant.property.name,
            rentAmount: tenant.rentAmount,
            dueDate: format(tenant.dueDate, 'do MMMM, yyyy'),
            phoneNumber: tenant.phone,
        });
        
        const whatsappLink = `https://wa.me/${tenant.phone.replace('+', '')}?text=${encodeURIComponent(result.message)}`;
        
        toast({
            title: 'Reminder Generated!',
            description: 'Click the button to send via WhatsApp.',
            action: <Button onClick={() => window.open(whatsappLink, '_blank')}>Send Message</Button>
        });

    } catch (error) {
        console.error('Failed to generate reminder:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not generate the reminder message.',
        });
    }
  }

  const handleDeleteTenant = async (tenantId: string) => {
    if (!firestore || !auth) return;
    const tenantDocRef = doc(firestore, 'tenants', tenantId);
    
    const paymentsRef = collection(firestore, 'tenants', tenantId, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    const batch = writeBatch(firestore);
    paymentsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    try {
      await batch.commit();
      await deleteDoc(tenantDocRef);
      toast({
          title: "Tenant Deleted",
          description: "The tenant and all their payment records have been removed.",
      });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
          path: tenantDocRef.path,
          operation: 'delete',
      }, auth);
      errorEmitter.emit('permission-error', permissionError);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <AddTenantForm properties={properties} onTenantAdded={() => { /* data re-fetches automatically */ }} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Rent Amount</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Lease Start Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredTenants.length > 0 ? (
              filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <div>{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tenant.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.property?.name || 'N/A'}</TableCell>
                  <TableCell>K{tenant.rentAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[tenant.paymentStatus]}>
                      {tenant.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(tenant.leaseStartDate), 'PP')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <RecordPaymentForm tenant={tenant} onPaymentAdded={() => { /* re-fetch handled by snapshot */ }} />
                        <EditTenantForm tenant={tenant} properties={properties} onTenantUpdated={() => { /* re-fetch handled by snapshot */ }}/>
                        <DropdownMenuItem onSelect={() => handleSendReminder(tenant)}>Send Reminder</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onSelect={() => handleDeleteTenant(tenant.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No tenants found. Click "Add Tenant" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
