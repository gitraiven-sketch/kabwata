'use client';

import { getPaymentStatus } from '@/lib/data-helpers';
import { RentReminder } from '@/components/reminders/rent-reminder';
import { useEffect, useState } from 'react';
import type { Tenant, TenantWithDetails, Property } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function RemindersPage() {
  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    const loadReminders = async () => {
      if (!firestore) return;

      try {
        const [tenantSnapshot, propertySnapshot] = await Promise.all([
          getDocs(collection(firestore, 'tenants')),
          getDocs(collection(firestore, 'properties')),
        ]);

        const properties: Property[] = propertySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Property));

        const propertyMap = new Map<string, Property>(
          properties.map((property) => [property.id, property])
        );

        const loadedTenants: TenantWithDetails[] = tenantSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Tenant))
          .filter((tenant) => !tenant.isArchived)
          .map((tenant) => {
            const property = propertyMap.get(tenant.propertyId);
            const { status, dueDate } = getPaymentStatus(tenant);

            return {
              ...tenant,
              property:
                property ||
                ({
                  id: tenant.propertyId,
                  name: 'Unknown Property',
                  group: 'Unknown',
                  shopNumber: 0,
                  address: '',
                  paymentDay: tenant.paymentDay,
                } as Property),
              paymentStatus: status,
              dueDate,
            };
          })
          .filter((tenant) => tenant.paymentStatus !== 'Paid');

        setTenants(loadedTenants);
      } catch (error) {
        console.error('Failed to load reminders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReminders();
  }, [firestore]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rent Reminders</h1>
        <p className="text-muted-foreground">
          Generate and send payment reminders to tenants.
        </p>
      </div>
      {isLoading ? (
        <div className="flex h-64 w-full items-center justify-center rounded-lg border">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <RentReminder tenants={tenants} />
      )}
    </div>
  );
}
