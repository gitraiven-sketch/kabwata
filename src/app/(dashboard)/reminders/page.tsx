'use client';

import { getTenantsWithDetails } from '@/lib/data-helpers';
import { CategorizedRentReminders } from '@/components/reminders/rent-reminder';
import { useEffect, useState } from 'react';
import type { TenantWithDetails } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { differenceInDays, isToday } from 'date-fns';

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

  useEffect(() => {
    const fetchAndCategorizeTenants = async () => {
      try {
        const tenants = await getTenantsWithDetails();
        const today = new Date();
        today.setHours(0,0,0,0); // Normalize to start of day

        const categories: CategorizedTenants = {
          dueIn3Days: [],
          dueIn2Days: [],
          dueIn1Day: [],
          dueToday: [],
          overdue: [],
        };
        
        tenants.forEach(tenant => {
          if (tenant.paymentStatus === 'Paid') return;

          const dueDate = new Date(tenant.dueDate);
          dueDate.setHours(0,0,0,0); // Normalize to start of day

          const diff = differenceInDays(dueDate, today);
          
          if (diff < 0) {
            categories.overdue.push(tenant);
          } else if (diff === 0) {
            categories.dueToday.push(tenant);
          } else if (diff === 1) {
            categories.dueIn1Day.push(tenant);
          } else if (diff === 2) {
            categories.dueIn2Days.push(tenant);
          } else if (diff === 3) {
            categories.dueIn3Days.push(tenant);
          }
        });
        
        setCategorizedTenants(categories);
      } catch (error) {
        console.error("Failed to fetch or categorize tenants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndCategorizeTenants();
  }, []);


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
