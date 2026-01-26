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

    // Guard against invalid or missing lease start date
    if (!tenant.leaseStartDate || isNaN(new Date(tenant.leaseStartDate).getTime())) {
        // Cannot determine status without a valid lease start.
        return { status: 'Upcoming', dueDate: new Date(NaN) };
    }

    const leaseStart = new Date(tenant.leaseStartDate);
    leaseStart.setHours(0, 0, 0, 0);

    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
    lastPaid.setHours(0, 0, 0, 0);

    const paymentDay = tenant.paymentDay;

    // Determine the start of the current payment period.
    // This is the most recent due date that should have been met.
    let periodStart = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if (today.getDate() < paymentDay) {
        // If today is before this month's payment day, the current period started last month.
        periodStart.setMonth(periodStart.getMonth() - 1);
    }
    
    // Check if the lease started after the calculated period start.
    // This handles new tenants correctly.
    if (periodStart < leaseStart) {
        // The first payment is due on the first `paymentDay` on or after the lease starts.
        let firstDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
        if (leaseStart.getDate() > paymentDay) {
            firstDueDate.setMonth(firstDueDate.getMonth() + 1);
        }
        periodStart = firstDueDate;
    }
    
    const nextDueDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, paymentDay);

    if (lastPaid >= periodStart) {
        // They are paid for the current cycle. The status is 'Paid' and we show the next due date.
        return { status: 'Paid', dueDate: nextDueDate };
    } else {
        // They have not paid for the current cycle.
        if (today >= periodStart) {
            // If today is on or after the due date for the current cycle, they are 'Overdue'.
            return { status: 'Overdue', dueDate: periodStart };
        } else {
            // If today is before the due date for the cycle, it's 'Upcoming'.
            // This case typically applies to the very first payment of a new tenant.
            return { status: 'Upcoming', dueDate: periodStart };
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
