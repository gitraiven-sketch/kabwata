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

    if (!tenant.leaseStartDate || isNaN(new Date(tenant.leaseStartDate).getTime())) {
        return { status: 'Upcoming', dueDate: new Date(NaN) };
    }

    const leaseStart = new Date(tenant.leaseStartDate);
    leaseStart.setHours(0, 0, 0, 0);
    
    if (today < leaseStart) {
        return { status: 'Upcoming', dueDate: leaseStart };
    }
    
    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
    lastPaid.setHours(0, 0, 0, 0);
    
    const paymentDay = tenant.paymentDay;

    let thisMonthDueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if (thisMonthDueDate < leaseStart) {
        thisMonthDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
        if (leaseStart.getDate() > paymentDay) {
            thisMonthDueDate.setMonth(thisMonthDueDate.getMonth() + 1);
        }
    }


    if (today.getDate() >= paymentDay) {
        // We are on or after the due day for this month.
        // The current cycle is based on this month's due date.
        const currentCycleDueDate = thisMonthDueDate;
        const nextCycleDueDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);

        if (lastPaid >= currentCycleDueDate) {
            return { status: 'Paid', dueDate: nextCycleDueDate };
        } else {
            return { status: 'Overdue', dueDate: currentCycleDueDate };
        }

    } else {
        // We are before the due day for this month.
        // The current cycle is based on last month's due date.
        const lastMonthDueDate = new Date(today.getFullYear(), today.getMonth() - 1, paymentDay);
        const currentCycleDueDate = thisMonthDueDate;

        if (lastPaid >= lastMonthDueDate) {
            return { status: 'Upcoming', dueDate: currentCycleDueDate };
        } else {
            return { status: 'Overdue', dueDate: lastMonthDueDate };
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
