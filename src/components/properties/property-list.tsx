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

function getDueDate(tenant: Tenant): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(tenant.leaseStartDate);
    
    const leaseStart = new Date(tenant.leaseStartDate);

    // Determine the most recent payment cycle start date before or on today
    let currentCycleStart = new Date(today.getFullYear(), today.getMonth(), tenant.paymentDay);
    if (today.getDate() < tenant.paymentDay) {
        // We are in the previous month's payment cycle
        currentCycleStart.setMonth(currentCycleStart.getMonth() - 1);
    }
    
    // Ensure the cycle start is not before the lease start
    if (currentCycleStart < leaseStart) {
        currentCycleStart = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), tenant.paymentDay);
        if(leaseStart.getDate() > tenant.paymentDay) {
            currentCycleStart.setMonth(currentCycleStart.getMonth() + 1)
        }
    }
    
    const nextDueDate = new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), tenant.paymentDay);
    if(today >= nextDueDate) {
         nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }


    if (lastPaid >= currentCycleStart) {
        return nextDueDate;
    }

    if (today >= new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), tenant.paymentDay)) {
         const overdueDueDate = new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), tenant.paymentDay);
         return overdueDueDate;
    }
    
    return nextDueDate;
}

function PropertyForm({
  property,
  onSave,
}: {
  property?: Property;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  
  const isEditMode = !!property;

  const [formData, setFormData] = React.useState(
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
            const { startShopNumber, endShopNumber, group, address, paymentDay } = formData;
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
                        <Input id="startShopNumber" name="startShopNumber" type="number" value={formData.startShopNumber} onChange={handleChange} required className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="endShopNumber" className="text-right">End Shop</Label>
                        <Input id="endShopNumber" name="endShopNumber" type="number" value={formData.endShopNumber} onChange={handleChange} required className="col-span-3" />
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
    const groups = new Set(properties.map(p => p.group));
    return ['all', ...Array.from(groups).sort()];
  }, [properties]);

  const tenantsByPropertyId = React.useMemo(() => {
    return tenants.reduce((acc, tenant) => {
        acc[tenant.propertyId] = tenant;
        return acc;
    }, {} as Record<string, Tenant>);
  }, [tenants]);

  const filteredProperties = properties.filter(
    (property) => {
      const tenant = tenantsByPropertyId[property.id];
      const tenantName = tenant ? tenant.name : '';
      const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            tenantName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTab = activeTab === 'all' || property.group === activeTab;
      return matchesSearch && matchesTab;
    }
  ).sort((a, b) => a.shopNumber - b.shopNumber);

  return (
    <div className="space-y-4">
      <div className="sticky top-[57px] z-10 space-y-4 bg-background pb-4 pt-2">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by shop or tenant..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <PropertyForm onSave={() => { /* No-op, handled by snapshot */ }} />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {propertyGroups.map(group => (
              <TabsTrigger key={group} value={group}>{group === 'all' ? 'All Shops': group}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value={activeTab} className="mt-0">
           {isLoading ? (
                <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
           ) : filteredProperties.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProperties.map((property) => {
                const tenant = tenantsByPropertyId[property.id];
                const dueDate = tenant ? getDueDate(tenant) : null;
                const isOverdue = dueDate ? new Date() > dueDate : false;
                
                return (
                  <Card key={property.id} className="overflow-hidden flex flex-col">
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
                      {tenant && dueDate ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {isOverdue ? 'Overdue' : 'Due'}{' '}
                                {dueDate instanceof Date && !isNaN(dueDate.getTime())
                                    ? formatDistanceToNow(dueDate, { addSuffix: true })
                                    : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="font-semibold text-primary">Vacant</div>
                      )}
                    </CardContent>
                     <CardFooter>
                        <p className="text-sm text-muted-foreground">Pay Day: {property.paymentDay}</p>
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
      </Tabs>
    </div>
  );
}
