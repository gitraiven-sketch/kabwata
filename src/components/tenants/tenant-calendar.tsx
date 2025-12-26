'use client';

import * as React from 'react';
import {
  collection,
  onSnapshot,
  query,
  addDoc,
} from 'firebase/firestore';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  User,
  Loader2,
  Mail,
  CheckCircle,
} from 'lucide-react';
import type { TenantWithDetails, PaymentStatus, Tenant, Property } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Button } from '../ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

function StatusBadge({ status }: { status: PaymentStatus }) {
  const variant = {
    Paid: 'default',
    Overdue: 'destructive',
    Upcoming: 'secondary',
  }[status] as 'default' | 'destructive' | 'secondary';

  return <Badge variant={variant}>{status}</Badge>;
}

export function TenantList({ tenants: initialTenants }: { tenants: TenantWithDetails[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const firestore = useFirestore();
  const auth = useAuth();
  const [tenants, setTenants] = React.useState<TenantWithDetails[]>(initialTenants);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firestore || !auth) {
        setIsLoading(false);
        return;
    };
    
    const propsQuery = query(collection(firestore, 'properties'));
    const unsubProps = onSnapshot(propsQuery, (snapshot) => {
        const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        setProperties(props);
        if (snapshot.empty) {
            setIsLoading(false);
        }
    }, (error) => {
        console.error("Error fetching properties:", error);
        const permissionError = new FirestorePermissionError({
            path: 'properties',
            operation: 'list',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
    });

    return () => unsubProps();
  }, [firestore, auth]);

  React.useEffect(() => {
    if (!firestore || !auth) {
      setIsLoading(false);
      return;
    }

    if (properties.length === 0 && !isLoading) {
        setTenants([]);
        setIsLoading(false);
        return;
    }
    
    if (properties.length === 0) return;

    const tenantsQuery = query(collection(firestore, 'tenants'));
    const unsubTenants = onSnapshot(tenantsQuery, async (tenantsSnapshot) => {
        const propertyMap = new Map<string, Property>();
        properties.forEach(p => propertyMap.set(p.id, p));

        const tenantsDataPromises = tenantsSnapshot.docs.map(async (tenantDoc) => {
            const tenantData = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
            
            const today = new Date();
            const lastPaid = tenantData.lastPaidDate ? new Date(tenantData.lastPaidDate) : new Date(tenantData.leaseStartDate);
            
            let dueDate = new Date(lastPaid.getFullYear(), lastPaid.getMonth(), tenantData.paymentDay);
            dueDate.setMonth(dueDate.getMonth() + 1);

            let paymentStatus: PaymentStatus = 'Upcoming';
            if (today > dueDate) {
              paymentStatus = 'Overdue';
            } else if (lastPaid.getFullYear() === today.getFullYear() && lastPaid.getMonth() === today.getMonth()) {
              paymentStatus = 'Paid';
            }
            
            const property = propertyMap.get(tenantData.propertyId);
            
            if (!property) { 
                console.warn(`Could not find property with ID: ${tenantData.propertyId} for tenant ${tenantData.name}`);
                return null;
            }

            return {
                ...tenantData,
                property: property!,
                paymentStatus: paymentStatus,
                dueDate: dueDate,
            };
        });

        const tenantsData = (await Promise.all(tenantsDataPromises))
            .filter(Boolean) as TenantWithDetails[];

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

    return () => unsubTenants();
  }, [firestore, auth, properties, isLoading]);


  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.property && tenant.property.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const groupedTenants = React.useMemo(() => {
    return filteredTenants.reduce((acc, tenant) => {
        const group = tenant.property.group || 'Uncategorized';
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(tenant);
        return acc;
    }, {} as Record<string, TenantWithDetails[]>);
  }, [filteredTenants]);

  const groupOrder = ['Group A', 'Group B', 'Group C', 'Uncategorized'];
  
  return (
    <div className="space-y-4">
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

       {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : filteredTenants.length > 0 ? (
            <Accordion type="multiple" defaultValue={groupOrder} className="w-full">
            {groupOrder.map(groupName => {
                const tenantsInGroup = groupedTenants[groupName];
                if (!tenantsInGroup || tenantsInGroup.length === 0) return null;

                return (
                    <AccordionItem value={groupName} key={groupName}>
                        <AccordionTrigger className="text-lg font-semibold">
                            {groupName} ({tenantsInGroup.length} tenants)
                        </AccordionTrigger>
                        <AccordionContent>
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
            </Accordion>
        ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
                <h3 className="mt-4 text-lg font-semibold">No Tenants Found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Try adjusting your search or add a new tenant to get started.</p>
            </div>
        )}
    </div>
  );
}