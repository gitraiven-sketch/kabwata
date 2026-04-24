'use client';
import type { Tenant, Property, TenantWithDetails, PaymentStatus } from './types';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export function getPaymentStatus(tenant: Tenant): { status: PaymentStatus; dueDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!tenant.leaseStartDate || isNaN(new Date(tenant.leaseStartDate).getTime())) {
    return { status: 'Overdue', dueDate: new Date(NaN) };
  }

  const leaseStart = new Date(tenant.leaseStartDate);
  leaseStart.setHours(0, 0, 0, 0);

  const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
  lastPaid.setHours(0, 0, 0, 0);

  const paymentDay = tenant.paymentDay;

  // Determine the start date of the current billing cycle.
  // It's the `paymentDay` of this month, or last month if `today` is before `paymentDay`.
  let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
  if (today.getDate() < paymentDay) {
    cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
  }

  // The due date for the current cycle is also the cycle start date.
  const currentDueDate = cycleStartDate;

  // If the lease started after the current cycle began, then their first payment is upcoming.
  if (leaseStart > currentDueDate) {
    let firstDueDate = new Date(
      leaseStart.getFullYear(),
      leaseStart.getMonth(),
      paymentDay
    );
    if (leaseStart.getDate() > paymentDay) {
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);
    }
    return { status: 'Upcoming', dueDate: firstDueDate };
  }

  // Have they paid for the current cycle?
  if (lastPaid >= currentDueDate) {
    // Yes. They are 'Paid'. The next due date is next month.
    const nextDueDate = new Date(currentDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    return { status: 'Paid', dueDate: nextDueDate };
  } else {
    // No, they haven't paid for the current cycle.
    if (today > currentDueDate) {
      return { status: 'Overdue', dueDate: currentDueDate };
    } else {
      return { status: 'Upcoming', dueDate: currentDueDate };
    }
  }
}


async function getProperties(): Promise<Property[]> {
    try {
        const { firestore } = initializeFirebase();
        const propertyCollection = collection(firestore, 'properties');
        const propertySnapshot = await getDocs(propertyCollection);
        return propertySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
    } catch (error) {
        console.error("Error fetching properties:", error);
        throw error;
    }
}


export async function getTenantsWithDetails(): Promise<TenantWithDetails[]> {
    try {
        const { firestore } = initializeFirebase();
        const tenantsCollection = collection(firestore, 'tenants');
        const properties = await getProperties();
        
        const tenantSnapshot = await getDocs(tenantsCollection);
        const tenantList = tenantSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Tenant))
            .filter(tenant => !tenant.isArchived);
        
        const propertyMap = new Map<string, Property>(properties.map(p => [p.id, p]));

        const tenantsWithDetails: TenantWithDetails[] = tenantList.map(tenant => {
            const property = propertyMap.get(tenant.propertyId);
            const { status, dueDate } = getPaymentStatus(tenant);

            return {
                ...tenant,
                property: property || { id: tenant.propertyId, name: 'Unknown Property', group: 'Unknown', shopNumber: 0, address: '', paymentDay: tenant.paymentDay },
                paymentStatus: status,
                dueDate,
            };
        });
        
        return tenantsWithDetails;

    } catch (error) {
        console.error("Error fetching tenants with details:", error);
        throw error;
    }
}
