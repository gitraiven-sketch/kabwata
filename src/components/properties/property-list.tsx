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
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import Image from 'next/image';
import type { Property } from '@/lib/types';

export function PropertyList({ properties }: { properties: Property[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase())
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

      {filteredProperties.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden flex flex-col">
              <div className="relative">
                <Image
                  src={property.image}
                  alt={property.name}
                  width={600}
                  height={400}
                  className="aspect-[3/2] w-full object-cover"
                  data-ai-hint={property.imageHint}
                />
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
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
              </div>
              <CardHeader>
                <CardTitle>{property.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
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
            <p className="mb-4 mt-2 text-sm text-muted-foreground">Try adjusting your search or add a new property.</p>
        </div>
      )}
    </div>
  );
}
