'use client';
import type { Tenant, Property, TenantWithDetails, PaymentStatus } from './types';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export function getPaymentStatus(tenant: Tenant): { status: PaymentStatus, dueDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate leaseStartDate
    if (!tenant.leaseStartDate || isNaN(new Date(tenant.leaseStartDate).getTime())) {
        // Cannot determine status without a valid lease start date.
        // Default to Overdue with an invalid date.
        return { status: 'Overdue', dueDate: new Date(NaN) };
    }

    const leaseStart = new Date(tenant.leaseStartDate);
    leaseStart.setHours(0, 0, 0, 0);
    
    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
    lastPaid.setHours(0, 0, 0, 0);
    
    const paymentDay = tenant.paymentDay;

    // Determine the due date for the CURRENT billing cycle.
    // This is the most recent due date that has occurred on or before today.
    let currentCycleDueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if (today.getDate() < paymentDay) {
        // If today is before this month's payment day, the current cycle's due date was last month.
        currentCycleDueDate.setMonth(currentCycleDueDate.getMonth() - 1);
    }
    
    // Determine the next due date
    const nextDueDate = new Date(currentCycleDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    
    // Ensure we don't check for payments before the lease even started.
    if (currentCycleDueDate < leaseStart) {
        // The first payment isn't even due yet.
        // Let's treat it as 'Paid' to avoid showing a red card for a brand new tenant.
         let firstEverDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
         if (leaseStart.getDate() > paymentDay) {
            firstEverDueDate.setMonth(firstEverDueDate.getMonth() + 1);
         }
        return { status: 'Paid', dueDate: firstEverDueDate };
    }

    // Check if the current cycle has been paid.
    if (lastPaid >= currentCycleDueDate) {
        return { status: 'Paid', dueDate: nextDueDate };
    } else {
        // Not paid for the current cycle. The payment for `currentCycleDueDate` is outstanding.
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
