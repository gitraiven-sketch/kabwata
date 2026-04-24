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
  LogOut,
  Building,
  CalendarDays,
  Phone,
  UserCheck,
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';
import { getPaymentStatus } from '@/lib/data-helpers';
import { cn } from '@/lib/utils';
import { usePageHeader } from '@/context/page-header-context';


function AddTenantForm({ onTenantAdded, properties, tenants, asIcon }: { onTenantAdded: () => void; properties: Property[], tenants: Tenant[], asIcon?: boolean }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [group, setGroup] = React.useState('');
  const [shopNumberStr, setShopNumberStr] = React.useState('');

  const occupiedPropertyIds = new Set(tenants.filter(t => !t.isArchived).map(t => t.propertyId));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;

    if (!group || !shopNumberStr) {
        toast({
            variant: 'destructive',
            title: 'Property Not Specified',
            description: 'Please enter both a Group and a Shop Number.',
        });
        return;
    }

    setIsLoading(true);

    const groupName = `Group ${group.toUpperCase()}`;
    const shopNumber = parseInt(shopNumberStr, 10);
    
    if (!/^[A-C]$/i.test(group)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Group',
            description: 'Group must be A, B, or C.',
        });
        setIsLoading(false);
        return;
    }
     if (isNaN(shopNumber) || shopNumber <= 0) {
        toast({
            variant: 'destructive',
            title: 'Invalid Shop Number',
            description: 'Please enter a valid shop number.',
        });
        setIsLoading(false);
        return;
    }

    const property = properties.find(p => p.group === groupName && p.shopNumber === shopNumber);

    if (!property) {
      toast({
        variant: 'destructive',
        title: 'Property Not Found',
        description: `Property "${group.toUpperCase()}${shopNumber}" could not be found.`,
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
    const leaseStartDate = formData.get('leaseStartDate') as string;
    
    const newTenantData = {
        name: formData.get('name') as string,
        phone: `+260${phone}`,
        propertyId: property.id,
        paymentDay: property.paymentDay || 1,
        leaseStartDate: leaseStartDate,
        lastPaidDate: leaseStartDate, // Set initial lastPaidDate to lease start
        isArchived: false,
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
        setGroup('');
        setShopNumberStr('');
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
        {asIcon ? (
            <Button variant="ghost" size="icon" aria-label="Add Tenant">
                <PlusCircle className="h-5 w-5" />
            </Button>
        ) : (
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Tenant
            </Button>
        )}
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
              <Label htmlFor="group" className="text-right">
                Group
              </Label>
              <Input 
                id="group"
                name="group"
                placeholder="e.g. A, B, or C"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                required 
                className="col-span-3" 
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shopNumber" className="text-right">
                Shop No.
              </Label>
              <Input 
                id="shopNumber"
                name="shopNumber"
                type="number"
                placeholder="e.g. 5, 12"
                value={shopNumberStr}
                onChange={(e) => setShopNumberStr(e.target.value)}
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

  const getSafeLeaseStart = (leaseDate: string | undefined) => {
    if (leaseDate) {
      try {
        const parsedDate = parseISO(leaseDate);
        if (!isNaN(parsedDate.getTime())) {
          return format(parsedDate, 'yyyy-MM-dd');
        }
      } catch (e) {
         // Invalid date format, fall through to default
      }
    }
    return format(new Date(), 'yyyy-MM-dd');
  };
  
  const [formData, setFormData] = React.useState({
    name: tenant.name || '',
    phone: tenant.phone ? tenant.phone.replace('+260', '') : '',
    leaseStartDate: getSafeLeaseStart(tenant.leaseStartDate),
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        name: tenant.name || '',
        phone: tenant.phone ? tenant.phone.replace('+260', '') : '',
        leaseStartDate: getSafeLeaseStart(tenant.leaseStartDate),
      });
    }
  }, [open, tenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: value 
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth || !tenant.id) return;
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
            <DialogDescription>Update the details for {tenant.name || 'this tenant'}.</DialogDescription>
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

export function TenantList({ tenants: initialTenants }: { tenants: Tenant[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { setActions } = usePageHeader();

  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [tenantsWithDetails, setTenantsWithDetails] = React.useState<TenantWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    setActions(
      <>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            className="h-9 pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <AddTenantForm
          properties={properties}
          tenants={tenants}
          onTenantAdded={() => {}}
          asIcon={true}
        />
      </>
    );

    return () => setActions(null);
  }, [setActions, searchTerm, properties, tenants]);


  React.useEffect(() => {
    if (!firestore) return;

    const unsubTenants = onSnapshot(collection(firestore, 'tenants'), (snapshot) => {
      const tenantData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Tenant))
      setTenants(tenantData);
      setIsLoading(false); // Let the next effect handle loading based on both tenants and props
    }, (error) => {
      console.error("Error fetching tenants:", error);
      setIsLoading(false);
    });

    const unsubProps = onSnapshot(collection(firestore, 'properties'), (snapshot) => {
      const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
      setProperties(propsData);
      setIsLoading(false); // Let the next effect handle loading
    }, (error) => {
        console.error("Error fetching properties:", error);
        setIsLoading(false);
    });

    return () => {
      unsubTenants();
      unsubProps();
    };
  }, [firestore]);


  React.useEffect(() => {
    const propertyMap = new Map(properties.map(p => [p.id, p]));
    
    const details: TenantWithDetails[] = tenants
    .map(tenant => {
        const property = propertyMap.get(tenant.propertyId);
        const { status, dueDate } = getPaymentStatus(tenant);
        
        return {
            ...tenant,
            property: property || { id: tenant.propertyId, name: 'Unknown Property', group: 'Unknown', shopNumber: 0, address: '', paymentDay: tenant.paymentDay },
            paymentStatus: status,
            dueDate: dueDate,
        };
    });

    setTenantsWithDetails(details);

  }, [tenants, properties]);


 const handleMarkAsVacant = (tenantId: string, tenantName: string) => {
     if (!firestore || !auth) return;
    if (!tenantId) {
        console.error("handleMarkAsVacant called with empty tenantId");
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot mark as vacant without a valid tenant ID.",
        });
        return;
    }
    const tenantRef = doc(firestore, 'tenants', tenantId);
    
    updateDoc(tenantRef, { isArchived: true })
        .then(() => {
            toast({
                title: 'Tenant Marked as Vacant',
                description: `${tenantName}'s lease is now marked as vacant.`,
            });
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: tenantRef.path,
                operation: 'update',
                requestResourceData: { isArchived: true },
            }, auth);
            errorEmitter.emit('permission-error', permissionError);
        });
  }
  
  const handleReactivateTenant = (tenantId: string, tenantName: string) => {
    if (!firestore || !auth) return;
    const tenantRef = doc(firestore, 'tenants', tenantId);

    // Reactivate and set as paid for the current cycle to avoid immediate overdue status.
    updateDoc(tenantRef, { isArchived: false, lastPaidDate: new Date().toISOString() })
        .then(() => {
            toast({
                title: 'Tenant Reactivated',
                description: `${tenantName}'s lease is now active.`,
            });
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: tenantRef.path,
                operation: 'update',
                requestResourceData: { isArchived: false },
            }, auth);
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleDeleteTenant = (tenantId: string, tenantName: string) => {
    if (!firestore || !auth) return;
    if (!tenantId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot delete tenant without a valid ID.",
      });
      return;
    }
    const tenantRef = doc(firestore, 'tenants', tenantId);

    deleteDoc(tenantRef)
      .then(() => {
        toast({
          title: 'Tenant Deleted',
          description: `${tenantName} has been permanently deleted.`,
        });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: tenantRef.path,
          operation: 'delete',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
      });
  };


  const filteredTenants = tenantsWithDetails.filter(
    (tenant) =>
      (tenant.name && tenant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tenant.property && tenant.property.name && tenant.property.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
  
  const defaultTab = React.useMemo(() => {
    return groupOrder.find(group => groupedTenants[group] && groupedTenants[group].length > 0) || groupOrder[0];
  }, [groupedTenants]);

  const [activeTab, setActiveTab] = React.useState(defaultTab);
  
  React.useEffect(() => {
    const newDefaultTab = groupOrder.find(group => groupedTenants[group] && groupedTenants[group].length > 0) || groupOrder[0];
    if (activeTab !== newDefaultTab && (!groupedTenants[activeTab] || groupedTenants[activeTab].length === 0)) {
        setActiveTab(newDefaultTab);
    }
  }, [groupedTenants, activeTab, defaultTab]);
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-[64px] z-10 border-b bg-background/95 py-2 backdrop-blur-sm">
             <TabsList>
                {groupOrder.map(groupName => {
                if(groupedTenants[groupName] && groupedTenants[groupName].length > 0) {
                    return <TabsTrigger key={groupName} value={groupName}>{groupName}</TabsTrigger>
                }
                return null;
                })}
            </TabsList>
        </div>

       <div className="pt-6">
        {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : tenants.length > 0 ? (
            <>
              {groupOrder.map(groupName => {
                  const tenantsInGroup = groupedTenants[groupName];
                  if (!tenantsInGroup || tenantsInGroup.length === 0) return null;
                  
                  return (
                    <TabsContent value={groupName} key={groupName} className="mt-0">
                       <div className="columns-1 md:columns-3 gap-6 space-y-6">
                            {tenantsInGroup.map((tenant) => (
                                <Card
                                  key={tenant.id}
                                  className={cn('break-inside-avoid border-none transition-all hover:shadow-xl hover:-translate-y-1', {
                                    'bg-primary text-primary-foreground': tenant.paymentStatus === 'Paid' && !tenant.isArchived,
                                    'bg-destructive text-destructive-foreground': tenant.paymentStatus === 'Overdue' && !tenant.isArchived,
                                    'bg-accent text-accent-foreground': tenant.paymentStatus === 'Upcoming' && !tenant.isArchived,
                                    'bg-background text-foreground border shadow-sm': tenant.isArchived,
                                  })}
                                >
                                <CardHeader className="flex-row items-start justify-between pb-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 border-2 border-white/50">
                                            <AvatarFallback className={cn({
                                                'bg-white/20 text-primary-foreground': tenant.paymentStatus === 'Paid' && !tenant.isArchived,
                                                'bg-white/20 text-destructive-foreground': tenant.paymentStatus === 'Overdue' && !tenant.isArchived,
                                                'bg-white/20 text-accent-foreground': tenant.paymentStatus === 'Upcoming' && !tenant.isArchived,
                                                'bg-muted': tenant.isArchived,
                                            })}>
                                                <User className="h-5 w-5" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg">{tenant.name}</CardTitle>
                                            <CardDescription className={cn("flex items-center gap-1.5 pt-1 text-xs", {
                                                'text-primary-foreground/80': tenant.paymentStatus === 'Paid' && !tenant.isArchived,
                                                'text-destructive-foreground/80': tenant.paymentStatus === 'Overdue' && !tenant.isArchived,
                                                'text-accent-foreground/80': tenant.paymentStatus === 'Upcoming' && !tenant.isArchived,
                                                'text-muted-foreground': tenant.isArchived,
                                            })}>
                                                 <Phone className="h-3 w-3" />
                                                 {tenant.phone}
                                            </CardDescription>
                                        </div>
                                    </div>
                                     {tenant.id ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full", {
                                                    'hover:bg-white/10': (tenant.paymentStatus === 'Paid' || tenant.paymentStatus === 'Overdue' || tenant.paymentStatus === 'Upcoming') && !tenant.isArchived,
                                                    'hover:bg-accent': tenant.isArchived
                                                })}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {tenant.isArchived ? (
                                                     <DropdownMenuItem onClick={() => handleReactivateTenant(tenant.id, tenant.name)}>
                                                        <UserCheck className="mr-2 h-4 w-4" /> Reactivate Lease
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <>
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
                                                                onSelect={(e) => e.preventDefault()}
                                                            >
                                                                <LogOut className="mr-2 h-4 w-4" /> Mark as Vacant
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will mark <strong>{tenant.name}</strong> as vacant, turning their card white. They will remain in the tenant list and can be reactivated later.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleMarkAsVacant(tenant.id, tenant.name)}
                                                                >
                                                                    Confirm
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                    </>
                                                )}
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Tenant
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action is permanent and cannot be undone. This will permanently delete <strong>{tenant.name}</strong> and all their data.
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
                                    ) : null}
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                     <div className={cn("flex items-center gap-2", {
                                        'text-primary-foreground/80': tenant.paymentStatus === 'Paid' && !tenant.isArchived,
                                        'text-destructive-foreground/80': tenant.paymentStatus === 'Overdue' && !tenant.isArchived,
                                        'text-accent-foreground/80': tenant.paymentStatus === 'Upcoming' && !tenant.isArchived,
                                        'text-muted-foreground': tenant.isArchived,
                                    })}>
                                        <Building className="h-4 w-4 shrink-0" />
                                        <span>{tenant.property.name}</span>
                                    </div>
                                    <div className={cn("flex items-center gap-2", {
                                        'text-primary-foreground/80': tenant.paymentStatus === 'Paid' && !tenant.isArchived,
                                        'text-destructive-foreground/80': tenant.paymentStatus === 'Overdue' && !tenant.isArchived,
                                        'text-accent-foreground/80': tenant.paymentStatus === 'Upcoming' && !tenant.isArchived,
                                        'text-muted-foreground': tenant.isArchived,
                                    })}>
                                        <CalendarDays className="h-4 w-4 shrink-0" />
                                        <span>
                                            Due on {tenant.dueDate instanceof Date && !isNaN(tenant.dueDate.getTime())
                                                ? format(tenant.dueDate, 'do MMMM')
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <Badge variant={tenant.isArchived ? "secondary" : tenant.paymentStatus === 'Paid' ? 'success' : tenant.paymentStatus === 'Overdue' ? 'destructive' : 'upcoming'} className={cn("font-semibold", {
                                        'border-white/50 text-white bg-transparent': (tenant.paymentStatus === 'Paid' || tenant.paymentStatus === 'Overdue' || tenant.paymentStatus === 'Upcoming') && !tenant.isArchived,
                                    })}>
                                        {tenant.isArchived ? 'Vacant' : tenant.paymentStatus}
                                    </Badge>
                                </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                  )
              })}
            </>
        ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
                <h3 className="mt-4 text-lg font-semibold">No Tenants Found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Try adjusting your search or add a new tenant to get started.</p>
            </div>
        )}
       </div>
    </Tabs>
  );
}
