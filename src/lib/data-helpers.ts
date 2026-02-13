'use client';
import type { Tenant, Property, TenantWithDetails, PaymentStatus } from './types';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export function getPaymentStatus(tenant: Tenant): { status: PaymentStatus, dueDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!tenant.leaseStartDate || isNaN(new Date(tenant.leaseStartDate).getTime())) {
        return { status: 'Upcoming', dueDate: new Date(NaN) };
    }

    const leaseStart = new Date(tenant.leaseStartDate);
    leaseStart.setHours(0, 0, 0, 0);
    
    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
    lastPaid.setHours(0, 0, 0, 0);
    
    const paymentDay = tenant.paymentDay;

    // Determine the due date for the current payment cycle.
    // This is the most recent due date that has occurred on or before today.
    let currentCycleDueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if (currentCycleDueDate > today) {
        currentCycleDueDate.setMonth(currentCycleDueDate.getMonth() - 1);
    }
    
    // Ensure the cycle's due date isn't before the first possible due date.
    let firstDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
    if (firstDueDate < leaseStart) {
        firstDueDate.setMonth(firstDueDate.getMonth() + 1);
    }

    if (currentCycleDueDate < firstDueDate) {
        // We are before the first-ever due date.
        return { status: 'Upcoming', dueDate: firstDueDate };
    }

    // Determine the next due date for display purposes.
    const nextDueDate = new Date(currentCycleDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    // Now, determine the status.
    if (lastPaid >= currentCycleDueDate) {
        // Paid for the current cycle.
        return { status: 'Paid', dueDate: nextDueDate };
    } else {
        // Not paid for the current cycle. It is Overdue.
        return { status: 'Overdue', dueDate: currentCycleDueDate };
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
