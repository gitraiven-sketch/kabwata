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
import { MoreHorizontal, PlusCircle, Search, Building } from 'lucide-react';
import type { Property } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function PropertyList({ properties }: { properties: Property[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');

  const propertyGroups = ['Group A', 'Group B', 'Group C'];

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
                            <DropdownMenuItem>Edit</DropdownMenuItem>
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
