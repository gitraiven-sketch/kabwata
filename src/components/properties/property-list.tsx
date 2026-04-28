'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, Building, Loader2 } from 'lucide-react';
import type { Property, Tenant } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useAuth } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, writeBatch } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePageHeader } from '@/context/page-header-context';
import { getPaymentStatus } from '@/lib/data-helpers';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

function PropertyForm({
  property,
  onSave,
  asIcon
}: {
  property?: Property;
  onSave: () => void;
  asIcon?: boolean;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  
  const isEditMode = !!property;

  const [formData, setFormData] = React.useState<Property | {
    name: string;
    group: string;
    shopNumber: number;
    startShopNumber: number;
    endShopNumber: number;
    address: string;
    paymentDay: number;
  }>(
    property || {
      name: '',
      group: 'Group A',
      shopNumber: 0,
      startShopNumber: 1,
      endShopNumber: 5,
      address: 'Kabwata Shopping Complex, Lusaka',
      paymentDay: 1,
    }
  );

  React.useEffect(() => {
    if (open) {
      setFormData(
        property || {
          name: '',
          group: 'Group A',
          shopNumber: 0,
          startShopNumber: 1,
          endShopNumber: 5,
          address: 'Kabwata Shopping Complex, Lusaka',
          paymentDay: 1,
        }
      );
    }
  }, [open, property]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: ['shopNumber', 'paymentDay', 'startShopNumber', 'endShopNumber'].includes(name) ? (value === '' ? 0 : parseInt(value, 10)) : value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;
    setIsLoading(true);
    
    try {
        if (isEditMode && property) {
            const dataToSave = {
                name: formData.name,
                group: formData.group,
                shopNumber: Number(formData.shopNumber),
                address: formData.address,
                paymentDay: Number(formData.paymentDay),
            };
            const propRef = doc(firestore, 'properties', property.id);
            await updateDoc(propRef, dataToSave);
            toast({
                title: 'Property Updated',
                description: `${formData.name} has been successfully updated.`,
            });
        } else {
            const { startShopNumber, endShopNumber, group, address, paymentDay } = formData as {
              name: string;
              group: string;
              shopNumber: number;
              startShopNumber: number;
              endShopNumber: number;
              address: string;
              paymentDay: number;
            };
            if (startShopNumber <= 0 || endShopNumber <= 0 || endShopNumber < startShopNumber) {
                toast({ variant: 'destructive', title: 'Invalid Shop Range', description: 'Please enter a valid start and end shop number.'});
                setIsLoading(false);
                return;
            }

            const batch = writeBatch(firestore);
            const propertiesCollection = collection(firestore, 'properties');

            for (let i = startShopNumber; i <= endShopNumber; i++) {
                const newProperty = {
                    name: `${group} - Shop ${i}`,
                    group,
                    shopNumber: i,
                    address,
                    paymentDay,
                };
                const newDocRef = doc(propertiesCollection);
                batch.set(newDocRef, newProperty);
            }
            
            await batch.commit();

            toast({
                title: 'Properties Added',
                description: `Shops from ${startShopNumber} to ${endShopNumber} in ${group} have been added.`,
            });
        }

        onSave();
        setOpen(false);
    } catch(error) {
       console.error("Error saving property:", error);
       const permissionError = new FirestorePermissionError({
          path: isEditMode ? `properties/${property!.id}` : 'properties',
          operation: isEditMode ? 'update' : 'create',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? (
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
        ) : asIcon ? (
            <Button variant="ghost" size="icon" aria-label="Add Property">
                <PlusCircle className="h-5 w-5" />
            </Button>
        ) : (
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Property
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Property</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the details for this property.' : 'Enter details for the new properties.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {isEditMode ? (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="col-span-3" />
                </div>
             ) : (
                <>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startShopNumber" className="text-right">Start Shop</Label>
                        <Input id="startShopNumber" name="startShopNumber" type="number" value={(formData as any).startShopNumber} onChange={handleChange} required className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="endShopNumber" className="text-right">End Shop</Label>
                        <Input id="endShopNumber" name="endShopNumber" type="number" value={(formData as any).endShopNumber} onChange={handleChange} required className="col-span-3" />
                    </div>
                </>
             )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="group" className="text-right">Group</Label>
              <Input id="group" name="group" value={formData.group} onChange={handleChange} required className="col-span-3" />
            </div>
             {isEditMode && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="shopNumber" className="text-right">Shop No.</Label>
                    <Input id="shopNumber" name="shopNumber" type="number" value={formData.shopNumber} onChange={handleChange} required className="col-span-3" />
                </div>
             )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDay" className="text-right">Pay Day</Label>
              <Input id="paymentDay" name="paymentDay" type="number" min="1" max="31" value={formData.paymentDay} onChange={handleChange} required className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Address</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} required className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export function PropertyList({ properties: initialProperties }: { properties: Property[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');
  const [properties, setProperties] = React.useState<Property[]>(initialProperties);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { setActions } = usePageHeader();

   React.useEffect(() => {
    setActions(
      <>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shop, or tenant..."
            className="h-9 pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <PropertyForm onSave={() => {}} asIcon={true} />
      </>
    );
    return () => setActions(null);
  }, [setActions, searchTerm]);

  React.useEffect(() => {
    if (!firestore || !auth) {
        setIsLoading(false);
        return;
    };
    
    const propsQuery = query(collection(firestore, 'properties'));
    const unsubProps = onSnapshot(propsQuery, (snapshot) => {
        const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        setProperties(props);
        setIsLoading(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'properties',
            operation: 'list',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
    });

    const tenantsQuery = query(collection(firestore, 'tenants'));
    const unsubTenants = onSnapshot(tenantsQuery, (snapshot) => {
        const tenantData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
        setTenants(tenantData);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'tenants',
            operation: 'list',
        }, auth);
        errorEmitter.emit('permission-error', permissionError);
    });


    return () => {
      unsubProps();
      unsubTenants();
    };
  }, [firestore, auth]);

  const handleDelete = async (property: Property) => {
    if(!firestore || !auth) return;
     if (window.confirm(`Are you sure you want to delete ${property.name}?`)) {
        try {
            await deleteDoc(doc(firestore, 'properties', property.id));
            toast({
                title: "Property Deleted",
                description: `${property.name} has been removed.`,
            });
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: `properties/${property.id}`,
                operation: 'delete',
            }, auth);
            errorEmitter.emit('permission-error', permissionError);
        }
     }
  }


  const propertyGroups = React.useMemo(() => {
    const groups = new Set(properties.map(p => p.group || 'Unknown').filter(g => g));
    return ['all', ...Array.from(groups).sort()];
  }, [properties]);

  const tenantsByPropertyId = React.useMemo(() => {
    return tenants.reduce((acc, tenant) => {
        if (tenant && tenant.propertyId && !tenant.isArchived) {
            acc[tenant.propertyId] = tenant;
        }
        return acc;
    }, {} as Record<string, Tenant>);
  }, [tenants]);

  const filteredProperties = properties.filter(
    (property) => {
      const tenant = tenantsByPropertyId[property.id];
      const tenantName = tenant ? tenant.name : '';
      const matchesSearch = (property.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (property.shopNumber?.toString() || '').includes(searchTerm.toLowerCase()) ||
                            (tenantName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesTab = activeTab === 'all' || property.group === activeTab;
      return matchesSearch && matchesTab;
    }
  ).sort((a, b) => (a.group.localeCompare(b.group)) || (a.shopNumber - b.shopNumber));

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="sticky top-[64px] z-10 space-y-4 border-b bg-background/95 pb-4 pt-2 backdrop-blur-sm">
        <TabsList>
          {propertyGroups.map(group => (
            <TabsTrigger key={group || `group-${Math.random()}`} value={group}>{group === 'all' ? 'All Shops': group}</TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="pt-6">
        <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
                <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredProperties.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProperties.map((property) => {
                const tenant = tenantsByPropertyId[property.id];
                const { status: paymentStatus, dueDate } = tenant ? getPaymentStatus(tenant) : { status: null, dueDate: null };
                
                return (
                  <Card 
                    key={property.id || `property-${Math.random()}`} 
                    className={cn(
                        "overflow-hidden flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1",
                        {
                          'bg-primary text-primary-foreground': paymentStatus === 'Paid',
                          'bg-destructive text-destructive-foreground': paymentStatus === 'Overdue',
                          'bg-background': !tenant,
                        }
                    )}
                  >
                     <div className="relative flex h-40 w-full items-center justify-center bg-muted">
                      <Building className="h-16 w-16 text-muted-foreground/50" />
                       <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/80 hover:bg-background">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Property actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                               <PropertyForm property={property} onSave={() => {}} />
                              <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onClick={() => handleDelete(property)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                    </div>
                    <CardHeader>
                      <CardTitle>{property.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                      {tenant && paymentStatus ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border-2 border-white/50">
                              <AvatarFallback className={cn({
                                'bg-white/20 text-primary-foreground': paymentStatus === 'Paid',
                                'bg-white/20 text-destructive-foreground': paymentStatus === 'Overdue',
                              })}>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-base">{tenant.name}</div>
                            <div className={cn('text-xs', {
                                'text-primary-foreground/80': paymentStatus === 'Paid',
                                'text-destructive-foreground/80': paymentStatus === 'Overdue',
                            })}>
                                {paymentStatus === 'Overdue' ? 'Overdue' : 'Due'}{' '}
                                {dueDate instanceof Date && !isNaN(dueDate.getTime())
                                    ? formatDistanceToNow(dueDate, { addSuffix: true })
                                    : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="border-2 text-base font-semibold">Vacant</Badge>
                      )}
                    </CardContent>
                     <CardFooter>
                        <p className={cn('text-sm', {
                            'text-primary-foreground/80': paymentStatus === 'Paid',
                            'text-destructive-foreground/80': paymentStatus === 'Overdue',
                            'text-muted-foreground': !tenant,
                        })}>Pay Day: {property.paymentDay}</p>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
                <h3 className="mt-4 text-lg font-semibold">No Properties Found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Try adjusting your search or filter, or add a new property.</p>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
