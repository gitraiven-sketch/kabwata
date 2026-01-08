'use client';

import * as React from 'react';
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  User,
  Loader2,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import type { TenantWithDetails, PaymentStatus, Tenant, Property } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';
import { getTenantsWithDetails } from '@/lib/data-helpers';


function AddTenantForm({ onTenantAdded, properties, tenants }: { onTenantAdded: () => void; properties: Property[], tenants: TenantWithDetails[] }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [propertyCode, setPropertyCode] = React.useState('');
  
  const occupiedPropertyIds = new Set(tenants.map(t => t.propertyId));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;

    if (!propertyCode) {
        toast({
            variant: 'destructive',
            title: 'Property Not Specified',
            description: 'Please enter a property code (e.g., A1, B12).',
        });
        return;
    }

    setIsLoading(true);

    const parsed = propertyCode.match(/^([A-C])(\d+)$/i);
    if (!parsed) {
        toast({
            variant: 'destructive',
            title: 'Invalid Property Code',
            description: 'Code must be a letter (A, B, C) followed by a number (e.g., C1).',
        });
        setIsLoading(false);
        return;
    }
    
    const [, groupChar, shopNum] = parsed;
    const groupName = `Group ${groupChar.toUpperCase()}`;
    const shopNumber = parseInt(shopNum, 10);

    const property = properties.find(p => p.group === groupName && p.shopNumber === shopNumber);

    if (!property) {
      toast({
        variant: 'destructive',
        title: 'Property Not Found',
        description: `Property "${propertyCode.toUpperCase()}" could not be found.`,
      });
      setIsLoading(false);
      return;
    }

    if (occupiedPropertyIds.has(property.id)) {
        toast({
            variant: 'destructive',
            title: 'Property Occupied',
            description: `Property "${property.name}" is already assigned to a tenant.`,
        });
        setIsLoading(false);
        return;
    }

    const formData = new FormData(event.currentTarget);
    const phone = (formData.get('phone') as string).replace(/^0/, '');
    
    const newTenantData = {
        name: formData.get('name') as string,
        phone: `+260${phone}`,
        propertyId: property.id,
        rentAmount: 0,
        paymentDay: property.paymentDay || 1,
        leaseStartDate: formData.get('leaseStartDate') as string,
        lastPaidDate: new Date(formData.get('leaseStartDate') as string).toISOString(),
    };

    const tenantsRef = collection(firestore, 'tenants');
    addDoc(tenantsRef, newTenantData)
      .then(() => {
        toast({
          title: 'Tenant Added',
          description: `${newTenantData.name} has been successfully added.`,
        });
        onTenantAdded();
        setOpen(false);
        (event.target as HTMLFormElement).reset();
        setPropertyCode('');
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
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
                <div className="col-span-3 flex items-center">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-background text-sm text-muted-foreground h-10">
                    +260
                    </span>
                    <Input id="phone" name="phone" required className="rounded-l-none" placeholder="977123456" />
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="propertyId" className="text-right">
                Property
              </Label>
              <Input 
                id="propertyCode"
                name="propertyCode"
                placeholder="e.g. A1, C15"
                value={propertyCode}
                onChange={(e) => setPropertyCode(e.target.value)}
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

function EditTenantForm({ tenant, onSave }: { tenant: Tenant, onSave: () => void }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    name: tenant.name,
    phone: tenant.phone.startsWith('+260') ? tenant.phone.substring(4) : tenant.phone,
    leaseStartDate: tenant.leaseStartDate,
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        name: tenant.name,
        phone: tenant.phone.startsWith('+260') ? tenant.phone.substring(4) : tenant.phone,
        leaseStartDate: tenant.leaseStartDate,
      });
    }
  }, [open, tenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;
    setIsLoading(true);

    const tenantRef = doc(firestore, 'tenants', tenant.id);
    const dataToUpdate = {
      name: formData.name,
      phone: `+260${formData.phone}`,
      leaseStartDate: formData.leaseStartDate,
    };

    try {
      await updateDoc(tenantRef, dataToUpdate);
      toast({
        title: 'Tenant Updated',
        description: `${formData.name}'s details have been updated.`,
      });
      onSave();
      setOpen(false);
    } catch (error) {
      console.error("Error updating tenant:", error);
      const permissionError = new FirestorePermissionError({
        path: `tenants/${tenant.id}`,
        operation: 'update',
        requestResourceData: dataToUpdate,
      }, auth);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Edit className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update the details for {tenant.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <div className="col-span-3 flex items-center">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-background text-sm text-muted-foreground h-10">+260</span>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required className="rounded-l-none" />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaseStartDate" className="text-right">Lease Start</Label>
              <Input id="leaseStartDate" name="leaseStartDate" type="date" value={formData.leaseStartDate} onChange={handleChange} required className="col-span-3" />
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


function StatusBadge({ status }: { status: PaymentStatus }) {
  const variant = {
    Paid: 'success',
    Overdue: 'destructive',
    Upcoming: 'warning',
  }[status] as 'success' | 'destructive' | 'warning';

  return <Badge variant={variant}>{status}</Badge>;
}

export function TenantList({ tenants: initialTenants }: { tenants: TenantWithDetails[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const firestore = useFirestore();
  const [tenants, setTenants] = React.useState<TenantWithDetails[]>(initialTenants);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!firestore) return;

    const unsubTenants = onSnapshot(collection(firestore, 'tenants'), async () => {
      try {
        const tenantDetails = await getTenantsWithDetails();
        setTenants(tenantDetails);
      } catch (error) {
        console.error("Failed to fetch tenant details:", error);
      } finally {
        setIsLoading(false);
      }
    });

    const unsubProps = onSnapshot(collection(firestore, 'properties'), (snapshot) => {
        const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        setProperties(props);
    });

    return () => {
      unsubTenants();
      unsubProps();
    };
  }, [firestore]);


  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'tenants', tenantId));
        toast({
            title: 'Tenant Deleted',
            description: `${tenantName} has been successfully removed.`,
        });
    } catch (error) {
        console.error('Error deleting tenant:', error);
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'Could not delete the tenant. You may not have the correct permissions.',
        });
    }
  }


  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.property && tenant.property.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const groupedTenants = React.useMemo(() => {
    const sortedTenants = [...filteredTenants].sort((a,b) => a.property.shopNumber - b.property.shopNumber);
    return sortedTenants.reduce((acc, tenant) => {
        const group = tenant.property.group || 'Uncategorized';
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(tenant);
        return acc;
    }, {} as Record<string, TenantWithDetails[]>);
  }, [filteredTenants]);

  const groupOrder = ['Group A', 'Group B', 'Group C', 'Uncategorized'];
  
  const defaultTab = groupOrder.find(group => groupedTenants[group] && groupedTenants[group].length > 0) || groupOrder[0];

  return (
    <div className="space-y-4">
        <div className="sticky top-[57px] z-10 space-y-4 bg-background pb-4 pt-2">
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search tenants or properties..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <AddTenantForm properties={properties} tenants={tenants} onTenantAdded={() => { /* data re-fetches automatically */ }} />
            </div>
        </div>

       {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : tenants.length > 0 ? (
            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList>
                    {groupOrder.map(groupName => {
                    if(groupedTenants[groupName] && groupedTenants[groupName].length > 0) {
                        return <TabsTrigger key={groupName} value={groupName}>{groupName}</TabsTrigger>
                    }
                    return null;
                    })}
                </TabsList>
              {groupOrder.map(groupName => {
                  const tenantsInGroup = groupedTenants[groupName];
                  if (!tenantsInGroup || tenantsInGroup.length === 0) return null;
                  
                  return (
                    <TabsContent value={groupName} key={groupName} className="mt-4">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Tenant</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {tenantsInGroup.map((tenant) => (
                                <TableRow key={tenant.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{tenant.name}</div>
                                            <div className="text-xs text-muted-foreground">{tenant.phone}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{tenant.property.name}</TableCell>
                                <TableCell>{format(tenant.dueDate, 'do MMMM')}</TableCell>
                                <TableCell>
                                    <StatusBadge status={tenant.paymentStatus} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href={`/tenants/${tenant.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </Link>
                                            </DropdownMenuItem>
                                            <EditTenantForm tenant={tenant} onSave={() => {}} />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                        onSelect={(e) => e.preventDefault()}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete <strong>{tenant.name}</strong> and all associated data.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive hover:bg-destructive/90"
                                                            onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                  )
              })}
            </Tabs>
        ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
                <h3 className="mt-4 text-lg font-semibold">No Tenants Found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Try adjusting your search or add a new tenant to get started.</p>
            </div>
        )}
    </div>
  );
}
