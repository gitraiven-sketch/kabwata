'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function SeedDatabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSeed = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }
    setIsLoading(true);

    const propertiesToCreate = [];
    const group = 'Group A';
    for (let i = 32; i <= 38; i++) {
        propertiesToCreate.push({
            name: `${group} - Shop ${i}`,
            group: group,
            shopNumber: i,
            address: 'Kabwata Shopping Complex, Lusaka',
            paymentDay: 1, // Default payment day
        });
    }

    const propertiesRef = collection(firestore, 'properties');
    let createdCount = 0;

    try {
        for (const prop of propertiesToCreate) {
            // Check if property already exists
            const q = query(propertiesRef, where("group", "==", prop.group), where("shopNumber", "==", prop.shopNumber));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                await addDoc(propertiesRef, prop);
                createdCount++;
            }
        }

      if (createdCount > 0) {
        toast({
          title: 'Database Seeded',
          description: `Successfully added ${createdCount} new shops to Group A.`,
        });
      } else {
         toast({
          title: 'Already Seeded',
          description: `The missing shops (A32-A38) already exist in the database.`,
        });
      }
      setIsDone(true);
    } catch (error: any) {
      console.error('Error seeding database:', error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message || 'Could not add new shops to the database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isDone) {
    return null; // Hide component after seeding is done
  }

  return (
    <Alert>
        <Database className="h-4 w-4" />
        <AlertTitle>Expand Shop List</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
           Click the button to automatically add shops A32 through A38 to your property list. This is a one-time action.
            <Button onClick={handleSeed} disabled={isLoading} size="sm">
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Add Group A Shops
            </Button>
        </AlertDescription>
    </Alert>
  );
}
