'use client';

import { getPaymentStatus } from '@/lib/data-helpers';
import { CategorizedRentReminders } from '@/components/reminders/rent-reminder';
import { useEffect, useState } from 'react';
import type { Tenant, TenantWithDetails, Property } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';

type CategorizedTenants = {
  dueIn3Days: TenantWithDetails[];
  dueIn2Days: TenantWithDetails[];
  dueIn1Day: TenantWithDetails[];
  dueToday: TenantWithDetails[];
  overdue: TenantWithDetails[];
}

export default function RemindersPage() {
  const [categorizedTenants, setCategorizedTenants] = useState<CategorizedTenants>({
    dueIn3Days: [],
    dueIn2Days: [],
    dueIn1Day: [],
    dueToday: [],
    overdue: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const firestore = useFirestore();

  useEffect(() => {
    const fetchAndCategorizeTenants = async () => {
      if (!firestore) return;

      try {
        const [tenantSnapshot, propertySnapshot] = await Promise.all([
          getDocs(collection(firestore, 'tenants')),
          getDocs(collection(firestore, 'properties')),
        ]);

        const properties: Property[] = propertySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Property));

        const propertyMap = new Map<string, Property>(
          properties.map((property) => [property.id, property])
        );

        const tenants: Tenant[] = tenantSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Tenant))
          .filter((tenant) => !tenant.isArchived);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const categories: CategorizedTenants = {
          dueIn3Days: [],
          dueIn2Days: [],
          dueIn1Day: [],
          dueToday: [],
          overdue: [],
        };

        tenants.forEach((tenant) => {
          const property = propertyMap.get(tenant.propertyId);
          const { status, dueDate } = getPaymentStatus(tenant);

          const tenantWithDetails: TenantWithDetails = {
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

          if (tenantWithDetails.paymentStatus === 'Paid') return;

          const dueDateNormalized = new Date(tenantWithDetails.dueDate);
          dueDateNormalized.setHours(0, 0, 0, 0);

          const diff = differenceInDays(dueDateNormalized, today);

          if (diff < 0) {
            categories.overdue.push(tenantWithDetails);
          } else if (diff === 0) {
            categories.dueToday.push(tenantWithDetails);
          } else if (diff === 1) {
            categories.dueIn1Day.push(tenantWithDetails);
          } else if (diff === 2) {
            categories.dueIn2Days.push(tenantWithDetails);
          } else if (diff === 3) {
            categories.dueIn3Days.push(tenantWithDetails);
          }
        });

        for (const category in categories) {
          categories[category as keyof CategorizedTenants].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        }

        setCategorizedTenants(categories);
      } catch (error) {
        console.error('Failed to fetch or categorize tenants:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndCategorizeTenants();
  }, [firestore]);


  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Rent Reminders</h1>
        <p className="text-muted-foreground">
          Generate and send payment reminders to tenants based on their due date.
        </p>
      </div>
      {isLoading ? (
         <div className="flex h-64 w-full items-center justify-center rounded-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      ) : (
        <CategorizedRentReminders categorizedTenants={categorizedTenants} />
      )}
    </div>
  );
}
