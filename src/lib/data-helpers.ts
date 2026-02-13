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
    
    // Use epoch start if no payment ever made, so we know the first cycle is unpaid.
    const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
    lastPaid.setHours(0, 0, 0, 0);
    
    const paymentDay = tenant.paymentDay;

    // Determine the due date for the CURRENT billing cycle.
    // This is the most recent due date that has occurred on or before today.
    let currentCycleDueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if (today.getDate() < paymentDay) {
        currentCycleDueDate.setMonth(currentCycleDueDate.getMonth() - 1);
    }
    
    // Ensure we don't check for payments before the lease started.
    let firstEverDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
    if (leaseStart.getDate() > paymentDay) {
        firstEverDueDate.setMonth(firstEverDueDate.getMonth() + 1);
    }
    
    if (currentCycleDueDate < firstEverDueDate) {
        // We are before the first payment is even due. This is the only "true" Upcoming state for an unpaid tenant before any cycles have started.
        return { status: 'Upcoming', dueDate: firstEverDueDate };
    }

    // Check if the current cycle has been paid.
    if (lastPaid >= currentCycleDueDate) {
        const nextDueDate = new Date(currentCycleDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        return { status: 'Paid', dueDate: nextDueDate };
    } else {
        // Not paid for the current cycle. The payment for `currentCycleDueDate` is outstanding.
        // It is considered Overdue because the due date has passed.
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
