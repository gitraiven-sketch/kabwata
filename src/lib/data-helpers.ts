// This file is now marked for client-side execution,
// but can be used on the server as well.
'use client'; 
// Using 'use client' is a temporary workaround. Ideally, this would be refactored
// to have distinct server and client data functions.

import type { Tenant, Property, TenantWithDetails, PaymentStatus } from './types';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export function getPaymentStatus(tenant: Tenant): { status: PaymentStatus, dueDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaseStart = new Date(tenant.leaseStartDate);
    leaseStart.setHours(0, 0, 0, 0);

    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0); // Use epoch if never paid
    lastPaid.setHours(0, 0, 0, 0);

    // Determine the start of the current payment cycle
    let cycleStart;
    const paymentDay = tenant.paymentDay;

    if (today.getDate() >= paymentDay) {
        // We are in the cycle for the current month
        cycleStart = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    } else {
        // We are in the cycle for the previous month
        cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, paymentDay);
    }

    // Ensure cycle doesn't start before the lease
    if (cycleStart < leaseStart) {
        cycleStart = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), leaseStart.getDate());
    }
    
    // Determine the due date for the current cycle
    const currentDueDate = new Date(cycleStart);

    // Determine next month's due date
    const nextDueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if(today.getDate() >= paymentDay) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }


    if (lastPaid >= cycleStart) {
        return { status: 'Paid', dueDate: nextDueDate };
    }

    if (today.getTime() >= currentDueDate.getTime()) {
        return { status: 'Overdue', dueDate: currentDueDate };
    }
    
    return { status: 'Upcoming', dueDate: currentDueDate };
}

async function getProperties(): Promise<Property[]> {
    try {
        const { firestore } = initializeFirebase();
        const propertyCollection = collection(firestore, 'properties');
        const propertySnapshot = await getDocs(propertyCollection);
        return propertySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
    } catch (error) {
        console.error("Error fetching properties:", error);
        throw error; // Re-throw to be caught by callers
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
            .filter(tenant => !tenant.isArchived); // Filter out archived tenants
        
        const propertyMap = new Map<string, Property>(properties.map(p => [p.id, p]));

        const tenantsWithDetails: TenantWithDetails[] = tenantList.map(tenant => {
            const property = propertyMap.get(tenant.propertyId);
            const { status, dueDate } = getPaymentStatus(tenant);

            if (!property) {
                // This can happen if a property is deleted but the tenant still references it.
                // We'll create a placeholder property to avoid crashing.
                return {
                    ...tenant,
                    property: { id: tenant.propertyId, name: 'Unknown Property', group: 'Unknown', shopNumber: 0, address: '', paymentDay: tenant.paymentDay },
                    paymentStatus: status,
                    dueDate: dueDate,
                };
            }
            
            return {
                ...tenant,
                property: property,
                paymentStatus: status,
                dueDate,
            };
        });
        
        return tenantsWithDetails;

    } catch (error) {
        console.error("Error fetching tenants with details:", error);
        throw error; // Re-throw to be caught by callers
    }
}
