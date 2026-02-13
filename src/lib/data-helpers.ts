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

    // Helper to get the correct due date for a given month, handling month-end cases.
    function getDueDateFor(date: Date, day: number): Date {
        const year = date.getFullYear();
        const month = date.getMonth();
        // Get the last day of the given month.
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        // The due date is the smaller of the tenant's paymentDay or the month's last day.
        return new Date(year, month, Math.min(day, lastDayOfMonth));
    }

    if (!tenant.leaseStartDate || isNaN(new Date(tenant.leaseStartDate).getTime())) {
        return { status: 'Upcoming', dueDate: new Date(NaN) };
    }

    const leaseStart = new Date(tenant.leaseStartDate);
    leaseStart.setHours(0, 0, 0, 0);

    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
    lastPaid.setHours(0, 0, 0, 0);

    const paymentDay = tenant.paymentDay;

    // Determine the start of the current payment period.
    let periodStart;
    if (today.getDate() >= paymentDay) {
        // If we're on or after the payment day, the period started this month.
        periodStart = getDueDateFor(today, paymentDay);
    } else {
        // Otherwise, the period started last month.
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        periodStart = getDueDateFor(lastMonth, paymentDay);
    }
    
    // Handle new tenants correctly.
    if (periodStart < leaseStart) {
        let firstDueDate = getDueDateFor(leaseStart, paymentDay);
        if (leaseStart.getDate() > paymentDay) {
           // If lease starts after this month's payment day, first payment is next month.
           const nextMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 1);
           firstDueDate = getDueDateFor(nextMonth, paymentDay);
        }
        periodStart = firstDueDate;
    }
    
    // The next due date will be in the following month.
    const nextDueDate = getDueDateFor(new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1), paymentDay);

    if (lastPaid >= periodStart) {
        // They are paid for the current cycle.
        return { status: 'Paid', dueDate: nextDueDate };
    } else {
        // They have not paid for the current cycle.
        if (today >= periodStart) {
            // Today is on or after the due date, so they are 'Overdue'.
            return { status: 'Overdue', dueDate: periodStart };
        } else {
            // Today is before the due date, so it's 'Upcoming'.
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
