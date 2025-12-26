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
import type { Property } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useAuth } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

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
  const [formData, setFormData] = React.useState(
    property || {
      name: '',
      group: 'Group A',
      shopNumber: 0,
      address: 'Kabwata Shopping Complex, Lusaka',
      rentAmount: 0,
    }
  );

  const isEditMode = !!property;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumberField = ['rentAmount', 'shopNumber'].includes(name);
    setFormData(prev => ({ 
        ...prev, 
        [name]: isNumberField ? (value === '' ? '' : Number(value)) : value 
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !auth) return;
    setIsLoading(true);
    
    const dataToSave = {
        ...formData,
        rentAmount: Number(formData.rentAmount),
        shopNumber: Number(formData.shopNumber),
    };


    try {
      if (isEditMode) {
        const propRef = doc(firestore, 'properties', property.id);
        await updateDoc(propRef, dataToSave);
        toast({
          title: 'Property Updated',
          description: `${formData.name} has been successfully updated.`,
        });
      } else {
        await addDoc(collection(firestore, 'properties'), dataToSave);
        toast({
          title: 'Property Added',
          description: `${formData.name} has been successfully added.`,
        });
      }
      onSave();
      setOpen(false);
    } catch(error) {
       const permissionError = new FirestorePermissionError({
          path: isEditMode ? `properties/${property.id}` : 'properties',
          operation: isEditMode ? 'update' : 'create',
          requestResourceData: dataToSave,
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
              {isEditMode ? 'Update the details for this property.' : 'Enter details for the new property.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="group" className="text-right">Group</Label>
              <Input id="group" name="group" value={formData.group} onChange={handleChange} required className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shopNumber" className="text-right">Shop No.</Label>
              <Input id="shopNumber" name="shopNumber" type="number" value={formData.shopNumber} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rentAmount" className="text-right">Rent (K)</Label>
              <Input id="rentAmount" name="rentAmount" type="number" value={formData.rentAmount} onChange={handleChange} required className="col-span-3" />
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
  const [properties, setProperties] = React.useState(initialProperties);
  const [isLoading, setIsLoading] = React.useState(true);

  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!firestore || !auth) {
        setIsLoading(false);
        return;
    };
    
    const q = query(collection(firestore, 'properties'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
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

    return () => unsubscribe();
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


  const filteredProperties = properties.filter(
    (property) => {
      const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            property.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || property.group === activeTab;
      return matchesSearch && matchesTab;
    }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
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
        <TabsContent value={activeTab} className="mt-4">
           {isLoading ? (
                <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
           ) : filteredProperties.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProperties.map((property) => (
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
                    <CardTitle>{property.group} - Shop {property.shopNumber}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                     <p className="text-sm text-muted-foreground">{property.name}</p>
                     <p className="text-sm text-muted-foreground">{property.address}</p>
                  </CardContent>
                  <CardFooter>
                    <p className="text-lg font-semibold">K{property.rentAmount.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                  </CardFooter>
                </Card>
              ))}
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
