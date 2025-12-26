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

function EditPropertyForm({
  property,
  onPropertyUpdated,
}: {
  property: Property;
  onPropertyUpdated: (updatedProperty: Property) => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [editedProperty, setEditedProperty] = React.useState(property);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedProperty(prev => ({ ...prev, [name]: name === 'rentAmount' || name === 'shopNumber' ? Number(value) : value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    // In a real app, this would be an API call to update the database.
    // For now, we just simulate it and update the state.
    setTimeout(() => {
      onPropertyUpdated(editedProperty);
      toast({
        title: 'Property Updated',
        description: `${editedProperty.name} has been successfully updated.`,
      });
      setIsLoading(false);
      setOpen(false);
    }, 500);
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
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the details for this property.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" value={editedProperty.name} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="group" className="text-right">
                Group
              </Label>
              <Input id="group" name="group" value={editedProperty.group} onChange={handleChange} required className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shopNumber" className="text-right">
                Shop No.
              </Label>
              <Input id="shopNumber" name="shopNumber" type="number" value={editedProperty.shopNumber} onChange={handleChange} required className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rentAmount" className="text-right">
                Rent (K)
              </Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="text"
                value={editedProperty.rentAmount}
                onChange={handleChange}
                required
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input id="address" name="address" value={editedProperty.address} onChange={handleChange} required className="col-span-3" />
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
              Save Changes
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

  const propertyGroups = ['Group A', 'Group B', 'Group C'];

  const handlePropertyUpdate = (updatedProperty: Property) => {
    setProperties(currentProperties => 
      currentProperties.map(p => p.id === updatedProperty.id ? updatedProperty : p)
    );
  };

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
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Shops</TabsTrigger>
          {propertyGroups.map(group => (
            <TabsTrigger key={group} value={group}>{group}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
           {filteredProperties.length > 0 ? (
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
                             <EditPropertyForm property={property} onPropertyUpdated={handlePropertyUpdate} />
                            <DropdownMenuItem>Add Photo</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Try adjusting your search or filter.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
